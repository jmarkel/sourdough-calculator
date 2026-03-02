import { parseNum, roundWhole } from "./number.ts";
import type {
  CalcResult,
  FlourPart,
  FlourPartComputed,
  FlourPartParsed,
  LineItem,
  LineItemComputed,
  LineItemParsed,
} from "./types.ts";

export function compute(
  baseDoughG: string,
  hydrationPct: string,
  saltPct: string,
  levainPct: string,
  levainHydrationPct: string,
  additions: LineItem[],
  inclusions: LineItem[],
  flourParts: FlourPart[],
): CalcResult {
  const D = parseNum(baseDoughG);
  const H = parseNum(hydrationPct) / 100;
  const S = parseNum(saltPct) / 100;
  const L = parseNum(levainPct) / 100;
  const LH = parseNum(levainHydrationPct) / 100;

  const parseList = (items: LineItem[]): LineItemParsed[] =>
    items.map((e) => {
      const gramsNum = e.grams.trim() === "" ? NaN : parseNum(e.grams);
      const pctFrac = e.pct.trim() === "" ? NaN : parseNum(e.pct) / 100;
      const mode = Number.isFinite(gramsNum)
        ? ("grams" as const)
        : Number.isFinite(pctFrac)
          ? ("pct" as const)
          : ("empty" as const);

      return { ...e, gramsNum, pctFrac, mode };
    });

  const parsedAdditions = parseList(additions);
  const parsedInclusions = parseList(inclusions);

  const parsedFlours: FlourPartParsed[] = flourParts
    .map((p) => {
      const pctFrac = p.pct.trim() === "" ? NaN : parseNum(p.pct) / 100;
      return { ...p, pctFrac };
    })
    .filter((p) => p.name.trim() !== "" || p.pct.trim() !== "");

  if (![D, H, S, L, LH].every((x) => Number.isFinite(x))) {
    return { ok: false, error: "Please enter valid numbers." };
  }
  if (D <= 0) return { ok: false, error: "Dough weight must be > 0." };
  if (H < 0) return { ok: false, error: "Hydration must be ≥ 0%." };
  if (S < 0) return { ok: false, error: "Salt must be ≥ 0%." };
  if (L < 0) return { ok: false, error: "Levain must be ≥ 0%." };
  if (LH < 0) return { ok: false, error: "Levain hydration must be ≥ 0%." };

  const validateList = (label: string, items: LineItemParsed[]) => {
    for (const e of items) {
      if (e.mode === "grams" && !(e.gramsNum >= 0)) {
        return { ok: false as const, error: `${label}: "${e.name || "(unnamed)"}" grams must be ≥ 0.` };
      }
      if (e.mode === "pct" && !(e.pctFrac >= 0)) {
        return { ok: false as const, error: `${label}: "${e.name || "(unnamed)"}" % must be ≥ 0.` };
      }
    }

    return null;
  };

  const addErr = validateList("Additional ingredient", parsedAdditions);
  if (addErr) return addErr;
  const incErr = validateList("Inclusion", parsedInclusions);
  if (incErr) return incErr;

  if (parsedFlours.length === 0) {
    return { ok: false, error: "Please define at least one flour in the flour breakdown." };
  }
  if (!parsedFlours.every((p) => Number.isFinite(p.pctFrac) && p.pctFrac >= 0)) {
    return { ok: false, error: "Flour breakdown percentages must be valid numbers ≥ 0." };
  }

  const flourPctTotal = parsedFlours.reduce((acc, p) => acc + p.pctFrac, 0);
  if (flourPctTotal <= 0) {
    return { ok: false, error: "Flour breakdown must sum to more than 0%." };
  }

  const fixedAddsRaw = parsedAdditions
    .filter((e) => e.mode === "grams")
    .reduce((acc, e) => acc + (e.gramsNum as number), 0);

  const addsPctSum = parsedAdditions
    .filter((e) => e.mode === "pct")
    .reduce((acc, e) => acc + (e.pctFrac as number), 0);

  const denom = 1 + H + S + L + addsPctSum;
  if (denom <= 0) {
    return { ok: false, error: "Invalid percentages (resulting denominator ≤ 0)." };
  }

  const flourRaw = (D - fixedAddsRaw) / denom;
  if (flourRaw < 0) {
    return { ok: false, error: "Additions in grams exceed base dough weight." };
  }

  const waterRaw = flourRaw * H;
  const saltRaw = flourRaw * S;
  const levainRaw = flourRaw * L;

  const additionsRaw = parsedAdditions
    .map((e) => {
      if (e.mode === "grams") {
        return {
          id: e.id,
          name: e.name || "Additional ingredient",
          mode: "grams" as const,
          gramsRaw: e.gramsNum as number,
        };
      }
      if (e.mode === "pct") {
        return {
          id: e.id,
          name: e.name || "Additional ingredient",
          mode: "pct" as const,
          gramsRaw: (e.pctFrac as number) * flourRaw,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ id: string; name: string; mode: "grams" | "pct"; gramsRaw: number }>;

  const targetBaseDough = roundWhole(D);
  const flour = roundWhole(flourRaw);
  let water = roundWhole(waterRaw);
  const salt = roundWhole(saltRaw);
  const levain = roundWhole(levainRaw);
  const additionsRounded = additionsRaw.map((e) => ({ ...e, grams: roundWhole(e.gramsRaw) }));

  const sumBaseRounded = () =>
    flour + water + salt + levain + additionsRounded.reduce((acc, e) => acc + e.grams, 0);

  const delta = targetBaseDough - sumBaseRounded();
  if (delta !== 0) {
    const nextWater = water + delta;
    if (nextWater < 0) {
      return { ok: false, error: "Rounding reconciliation would make water negative. Adjust inputs." };
    }
    water = nextWater;
  }

  if (sumBaseRounded() !== targetBaseDough) {
    return { ok: false, error: "Could not reconcile rounding to match base dough weight." };
  }

  const levainBuildFlourRaw = levain / (1 + LH);
  const levainBuildFlour = roundWhole(levainBuildFlourRaw);
  const levainBuildWater = levain - levainBuildFlour;

  const prefermentedFlourPct =
    flour + levainBuildFlour > 0 ? (levainBuildFlour / (flour + levainBuildFlour)) * 100 : 0;

  const inclusionsRaw = parsedInclusions
    .map((e) => {
      if (e.mode === "grams") {
        return {
          id: e.id,
          name: e.name || "Inclusion",
          mode: "grams" as const,
          gramsRaw: e.gramsNum as number,
        };
      }
      if (e.mode === "pct") {
        return {
          id: e.id,
          name: e.name || "Inclusion",
          mode: "pct" as const,
          gramsRaw: (e.pctFrac as number) * flour,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ id: string; name: string; mode: "grams" | "pct"; gramsRaw: number }>;

  const inclusionsComputed: LineItemComputed[] = inclusionsRaw
    .map((e) => {
      const grams = roundWhole(e.gramsRaw);
      if (!e.name && grams === 0) return null;

      return {
        id: e.id,
        name: e.name,
        mode: e.mode,
        grams,
        pct: flour > 0 ? (grams / flour) * 100 : 0,
      };
    })
    .filter(Boolean) as LineItemComputed[];

  const additionsComputed: LineItemComputed[] = additionsRounded
    .map((e) => {
      if (!e.name && e.grams === 0) return null;

      return {
        id: e.id,
        name: e.name,
        mode: e.mode,
        grams: e.grams,
        pct: flour > 0 ? (e.grams / flour) * 100 : 0,
      };
    })
    .filter(Boolean) as LineItemComputed[];

  const inclusionsTotal = inclusionsComputed.reduce((acc, x) => acc + x.grams, 0);

  const flourBreakdown: FlourPartComputed[] = parsedFlours.map((p) => {
    const pct = flourPctTotal > 0 ? (p.pctFrac / flourPctTotal) * 100 : 0;
    return {
      id: p.id,
      name: p.name || "Flour",
      pct,
      grams: roundWhole((pct / 100) * flour),
    };
  });

  const flourBreakdownDelta = flour - flourBreakdown.reduce((acc, x) => acc + x.grams, 0);
  if (flourBreakdownDelta !== 0 && flourBreakdown.length > 0) {
    flourBreakdown[0] = {
      ...flourBreakdown[0],
      grams: flourBreakdown[0].grams + flourBreakdownDelta,
    };
  }

  return {
    ok: true,
    flour,
    water,
    salt,
    levain,
    additions: additionsComputed,
    inclusions: inclusionsComputed,
    inclusionsTotal,
    doughWithInclusions: targetBaseDough + inclusionsTotal,
    levainBuildFlour,
    levainBuildWater,
    effectiveHydrationPct:
      flour + levainBuildFlour > 0 ? ((water + levainBuildWater) / (flour + levainBuildFlour)) * 100 : 0,
    prefermentedFlourPct,
    flourBreakdown,
    checks: {
      baseTotal: sumBaseRounded(),
      targetBaseDough,
      denom,
      flourBreakdownPctTotal: flourPctTotal * 100,
    },
  };
}
