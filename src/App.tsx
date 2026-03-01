import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

/**
 * Sourdough formula calculator
 *
 * All percentages are baker’s percentages based on MAIN dough flour (main flour = 100%).
 * Levain is treated as a black-box ingredient for dough math.
 *
 * Two categories of add-ins:
 * - Additional ingredients: included in the base dough weight equation.
 * - Inclusions: NOT included in the base dough weight equation; shown separately.
 *
 * Each row can be specified as either % of flour OR grams; the other is calculated.
 */

// ---- utilities ----

function roundWhole(n: number) {
  return Math.round(n);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function parseNum(s: string) {
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function makeId() {
  // crypto.randomUUID is widely available, but this fallback prevents runtime errors in older contexts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

// ---- types ----

type LineItem = {
  id: string;
  name: string;
  pct: string; // % of flour (display/input)
  grams: string; // grams (display/input)
};

type LineItemParsed = LineItem & {
  gramsNum: number; // NaN if empty
  pctFrac: number; // fraction (e.g. 0.02), NaN if empty
  mode: "pct" | "grams" | "empty";
};

type LineItemComputed = {
  id: string;
  name: string;
  mode: "pct" | "grams";
  grams: number; // rounded grams
  pct: number; // percent of flour (0-100)
};

type FlourPart = {
  id: string;
  name: string;
  pct: string; // percent of total main flour
};

type FlourPartParsed = FlourPart & {
  pctFrac: number; // fraction of total flour
};

type FlourPartComputed = {
  id: string;
  name: string;
  pct: number; // 0-100
  grams: number; // rounded
};

type CalcOk = {
  ok: true;
  flour: number;
  water: number;
  salt: number;
  levain: number;
  additions: LineItemComputed[];
  inclusions: LineItemComputed[];
  inclusionsTotal: number;
  doughWithInclusions: number;
  levainBuildFlour: number;
  levainBuildWater: number;
  effectiveHydrationPct: number;
  prefermentedFlourPct: number; // levain flour / (main flour + levain flour)
  flourBreakdown: FlourPartComputed[];
  checks: {
    baseTotal: number;
    targetBaseDough: number;
    denom: number;
    flourBreakdownPctTotal: number;
  };
};

type CalcErr = { ok: false; error: string };

type CalcResult = CalcOk | CalcErr;

type PersistedStateV1 = {
  version: 1;
  baseDoughG: string;
  hydrationPct: string;
  saltPct: string;
  levainPct: string;
  levainHydrationPct: string;
  showEffectiveHydration: boolean;
  additions: LineItem[];
  inclusions: LineItem[];
  flourParts: FlourPart[];
  notes?: string;
};

const LS_KEY = "sourdough-calculator:v1";

// ---- compute ----

function compute(
  baseDoughG: string,
  hydrationPct: string,
  saltPct: string,
  levainPct: string,
  levainHydrationPct: string,
  additions: LineItem[],
  inclusions: LineItem[],
  flourParts: FlourPart[]
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

  // Flour parts
  const parsedFlours: FlourPartParsed[] = flourParts
    .map((p) => {
      const pctFrac = p.pct.trim() === "" ? NaN : parseNum(p.pct) / 100;
      return { ...p, pctFrac };
    })
    .filter((p) => p.name.trim() !== "" || p.pct.trim() !== "");

  // Validate base inputs
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
        return { ok: false as const, error: `${label}: \"${e.name || "(unnamed)"}\" grams must be ≥ 0.` };
      }
      if (e.mode === "pct" && !(e.pctFrac >= 0)) {
        return { ok: false as const, error: `${label}: \"${e.name || "(unnamed)"}\" % must be ≥ 0.` };
      }
    }
    return null;
  };

  const addErr = validateList("Additional ingredient", parsedAdditions);
  if (addErr) return addErr;
  const incErr = validateList("Inclusion", parsedInclusions);
  if (incErr) return incErr;

  // Validate flour parts
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

  // --- Base dough math (EXCLUDES inclusions) ---
  // Additions contribute to base dough weight.
  // - Additions in grams: fixed weight.
  // - Additions in %: % is based on main flour, so grams = pct * flour.
  const fixedAddsRaw = parsedAdditions
    .filter((e) => e.mode === "grams")
    .reduce((acc, e) => acc + (e.gramsNum as number), 0);

  const addsPctSum = parsedAdditions
    .filter((e) => e.mode === "pct")
    .reduce((acc, e) => acc + (e.pctFrac as number), 0);

  // Black-box levain dough math:
  // D = flour + water + salt + levain + additions
  // additions = fixedAddsRaw + addsPctSum*flour
  // => D = flour*(1 + H + S + L + addsPctSum) + fixedAddsRaw
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

  // Compute additions grams
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

  // Round base dough components
  const targetBaseDough = roundWhole(D);
  let flour = roundWhole(flourRaw);
  let water = roundWhole(waterRaw);
  let salt = roundWhole(saltRaw);
  let levain = roundWhole(levainRaw);
  const additionsRounded = additionsRaw.map((e) => ({ ...e, grams: roundWhole(e.gramsRaw) }));

  // Rounding reconciliation (base dough only): adjust WATER so totals match exactly.
  const sumBaseRounded = () => flour + water + salt + levain + additionsRounded.reduce((acc, e) => acc + e.grams, 0);

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

  // Levain build split (optional), based on reconciled rounded levain total
  const levainBuildFlourRaw = levain / (1 + LH);
  const levainBuildFlour = roundWhole(levainBuildFlourRaw);
  const levainBuildWater = levain - levainBuildFlour; // ensures build sums exactly

  // Prefermented flour %: levain flour / (main flour + levain flour)
  const prefermentedFlourPct =
    flour + levainBuildFlour > 0 ? (levainBuildFlour / (flour + levainBuildFlour)) * 100 : 0;

  // Compute inclusions (do NOT affect base dough). Use rounded flour for display consistency.
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

  // Flour breakdown (normalize so it always totals 100 in display)
  const flourBreakdown: FlourPartComputed[] = parsedFlours.map((p) => {
    const pct = flourPctTotal > 0 ? (p.pctFrac / flourPctTotal) * 100 : 0;
    return {
      id: p.id,
      name: p.name || "Flour",
      pct,
      grams: roundWhole((pct / 100) * flour),
    };
  });

  // Reconcile flour breakdown rounding so grams sum to flour.
  {
    const sum = flourBreakdown.reduce((acc, x) => acc + x.grams, 0);
    const d = flour - sum;
    if (d !== 0 && flourBreakdown.length > 0) {
      flourBreakdown[0] = { ...flourBreakdown[0], grams: flourBreakdown[0].grams + d };
    }
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

// ---- vitest tests (only run under Vitest) ----

// This pattern keeps tests out of the Vite runtime build.
// In Vitest, `import.meta.vitest` is defined.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vitestApi: any = (import.meta as any).vitest;
if (vitestApi) {
  const { describe, it, expect } = vitestApi;

  describe("compute", () => {
    const base = "1000";
    const hydration = "75";
    const salt = "2";
    const levain = "20";
    const levainHyd = "100";
    const flourParts: FlourPart[] = [{ id: "f1", name: "Bread flour", pct: "100" }];

    it("reconciles totals to base dough weight", () => {
      const r = compute(
        base,
        hydration,
        salt,
        levain,
        levainHyd,
        [{ id: "a", name: "", pct: "", grams: "" }],
        [{ id: "i", name: "", pct: "", grams: "" }],
        flourParts
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.checks.baseTotal).toBe(1000);
    });

    it("treats inclusions as outside base dough", () => {
      const r = compute(
        base,
        hydration,
        salt,
        levain,
        levainHyd,
        [{ id: "a", name: "", pct: "", grams: "" }],
        [{ id: "i", name: "olives", pct: "", grams: "100" }],
        flourParts
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.checks.baseTotal).toBe(1000);
        expect(r.doughWithInclusions).toBe(1100);
      }
    });

    it("includes additional ingredients in base dough", () => {
      const r = compute(
        base,
        hydration,
        salt,
        levain,
        levainHyd,
        [{ id: "a", name: "malt", pct: "", grams: "10" }],
        [{ id: "i", name: "", pct: "", grams: "" }],
        flourParts
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.checks.baseTotal).toBe(1000);
    });

    it("computes prefermented flour percent", () => {
      const r = compute(
        base,
        hydration,
        salt,
        levain,
        levainHyd,
        [{ id: "a", name: "", pct: "", grams: "" }],
        [{ id: "i", name: "", pct: "", grams: "" }],
        flourParts
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.levainBuildFlour).toBeGreaterThanOrEqual(0);
        expect(r.prefermentedFlourPct).toBeGreaterThanOrEqual(0);
        expect(r.prefermentedFlourPct).toBeLessThanOrEqual(100);
      }
    });

    it("normalizes flour parts and reconciles grams to total flour", () => {$1
    });

    it("allows extra flour rows defaulting to 0% without errors", () => {
      const fp: FlourPart[] = [
        { id: "f1", name: "Bread", pct: "100" },
        { id: "f2", name: "", pct: "0" },
      ];
      const r = compute(
        base,
        hydration,
        salt,
        levain,
        levainHyd,
        [{ id: "a", name: "", pct: "", grams: "" }],
        [{ id: "i", name: "", pct: "", grams: "" }],
        fp
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        const sum = r.flourBreakdown.reduce((acc, x) => acc + x.grams, 0);
        expect(sum).toBe(r.flour);
      }
    });

    it("recipe text join uses newline separator", () => {
      // This test guards against accidental line-break insertion into a JS string literal.
      const r = compute(
        base,
        hydration,
        salt,
        levain,
        levainHyd,
        [{ id: "a", name: "", pct: "", grams: "" }],
        [{ id: "i", name: "", pct: "", grams: "" }],
        flourParts
      );
      expect(r.ok).toBe(true);
      const lines = ["a", "b", "c"];
      expect(lines.join("\n")).toBe("a\nb\nc");
    });
  });
}

// ---- UI ----

export default function App() {
  // Load persisted state
  const persisted = safeJsonParse<PersistedStateV1>(
    typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
  );

  const [baseDoughG, setBaseDoughG] = useState(persisted?.version === 1 ? persisted.baseDoughG : "1000");
  const [hydrationPct, setHydrationPct] = useState(persisted?.version === 1 ? persisted.hydrationPct : "78");
  const [saltPct, setSaltPct] = useState(persisted?.version === 1 ? persisted.saltPct : "2");
  const [levainPct, setLevainPct] = useState(persisted?.version === 1 ? persisted.levainPct : "20");
  const [levainHydrationPct, setLevainHydrationPct] = useState(
    persisted?.version === 1 ? persisted.levainHydrationPct : "100"
  );
  const [showEffectiveHydration, setShowEffectiveHydration] = useState(
    persisted?.version === 1 ? persisted.showEffectiveHydration : false
  );

  const [additions, setAdditions] = useState<LineItem[]>(
    persisted?.version === 1 && persisted.additions?.length
      ? persisted.additions
      : [{ id: makeId(), name: "", pct: "", grams: "" }]
  );

  const [inclusions, setInclusions] = useState<LineItem[]>(
    persisted?.version === 1 && persisted.inclusions?.length
      ? persisted.inclusions
      : [{ id: makeId(), name: "", pct: "", grams: "" }]
  );

  const [flourParts, setFlourParts] = useState<FlourPart[]>(
    persisted?.version === 1 && persisted.flourParts?.length
      ? persisted.flourParts
      : [{ id: makeId(), name: "Bread flour", pct: "100" }]
  );

  const [copyStatus, setCopyStatus] = useState<string>("");
  const [notes, setNotes] = useState<string>(persisted?.version === 1 ? persisted.notes ?? "" : "");

  // Persist state (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const payload: PersistedStateV1 = {
        version: 1,
        baseDoughG,
        hydrationPct,
        saltPct,
        levainPct,
        levainHydrationPct,
        showEffectiveHydration,
        additions,
        inclusions,
        flourParts,
        notes,
      };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [
    baseDoughG,
    hydrationPct,
    saltPct,
    levainPct,
    levainHydrationPct,
    showEffectiveHydration,
    additions,
    inclusions,
    flourParts,
    notes,
  ]);

  const addRow = (setter: Dispatch<SetStateAction<LineItem[]>>) =>
    setter((xs) => [...xs, { id: makeId(), name: "", pct: "", grams: "" }]);

  const removeRow = (setter: Dispatch<SetStateAction<LineItem[]>>, id: string) =>
    setter((xs) => (xs.length <= 1 ? xs : xs.filter((x) => x.id !== id)));

  const updateRow = (setter: Dispatch<SetStateAction<LineItem[]>>, id: string, patch: Partial<LineItem>) =>
    setter((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addFlour = () => setFlourParts((xs) => [...xs, { id: makeId(), name: "", pct: "0" }]);
  const removeFlour = (id: string) =>
    setFlourParts((xs) => (xs.length <= 1 ? xs : xs.filter((x) => x.id !== id)));
  const updateFlour = (id: string, patch: Partial<FlourPart>) =>
    setFlourParts((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const result = useMemo(() => {
    return compute(
      baseDoughG,
      hydrationPct,
      saltPct,
      levainPct,
      levainHydrationPct,
      additions,
      inclusions,
      flourParts
    );
  }, [baseDoughG, hydrationPct, saltPct, levainPct, levainHydrationPct, additions, inclusions, flourParts]);

  const recipeText = useMemo(() => {
    if (!result.ok) return "";

    const lines: string[] = [];
    lines.push(`Base dough weight (w/o inclusions): ${roundWhole(result.checks.targetBaseDough)} g`);
    lines.push("");
    lines.push("Main dough:");
    lines.push(`- Flour: ${roundWhole(result.flour)} g`);
    lines.push(`- Water: ${roundWhole(result.water)} g`);
    lines.push(`- Salt: ${roundWhole(result.salt)} g`);
    lines.push(`- Levain (total): ${roundWhole(result.levain)} g`);

    if (result.additions.length) {
      lines.push("");
      lines.push("Additional ingredients:");
      for (const x of result.additions) {
        lines.push(`- ${x.name || "Additional"}: ${roundWhole(x.grams)} g (${round1(x.pct)}%)`);
      }
    }

    if (result.inclusions.length) {
      lines.push("");
      lines.push("Inclusions:");
      for (const x of result.inclusions) {
        lines.push(`- ${x.name || "Inclusion"}: ${roundWhole(x.grams)} g (${round1(x.pct)}%)`);
      }
      lines.push(`Dough weight incl. inclusions: ${roundWhole(result.doughWithInclusions)} g`);
    }

    lines.push("");
    lines.push("Levain build (optional):");
    lines.push(`- Levain flour: ${roundWhole(result.levainBuildFlour)} g`);
    lines.push(`- Levain water: ${roundWhole(result.levainBuildWater)} g`);

    lines.push("");
    lines.push(`Prefermented flour: ${round1(result.prefermentedFlourPct)}%`);
    lines.push(`Effective hydration (incl. levain): ${round1(result.effectiveHydrationPct)}%`);

    lines.push("");
    lines.push("Flour breakdown (main dough flour):");
    for (const f of result.flourBreakdown) {
      lines.push(`- ${f.name}: ${roundWhole(f.grams)} g (${round1(f.pct)}%)`);
    }

    // IMPORTANT: keep this as a proper string literal, not a raw linebreak in quotes.
    if (notes.trim()) {
      lines.push("");
      lines.push("Notes:");
      lines.push(notes.trim());
    }

    return lines.join("\n");
  }, [result, notes]);

  const handleCopy = async () => {
    if (!recipeText) return;
    const ok = await copyToClipboard(recipeText);
    setCopyStatus(ok ? "Copied!" : "Copy failed");
    window.setTimeout(() => setCopyStatus(""), 1200);
  };

  const handleReset = () => {
    setBaseDoughG("1000");
    setHydrationPct("78");
    setSaltPct("2");
    setLevainPct("20");
    setLevainHydrationPct("100");
    setShowEffectiveHydration(false);
    setAdditions([{ id: makeId(), name: "", pct: "", grams: "" }]);
    setInclusions([{ id: makeId(), name: "", pct: "", grams: "" }]);
    setFlourParts([{ id: makeId(), name: "Bread flour", pct: "100" }]);
    setNotes("");
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Sourdough Ingredient Calculator</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Baker’s percentages are based on <b>main flour</b> (main flour = 100%). Levain is a black-box ingredient.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!result.ok}
              className="appearance-none text-xs rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 leading-none hover:!bg-slate-100 active:!bg-slate-200 disabled:opacity-50"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              Copy formula
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="appearance-none text-xs rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 leading-none hover:!bg-slate-100 active:!bg-slate-200"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              Reset
            </button>

            {copyStatus ? <span className="text-xs text-slate-600">{copyStatus}</span> : null}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
            <h2 className="text-lg font-medium">Inputs</h2>

            <div className="mt-4 grid gap-4">
              <Field
                label="Dough weight (w/o inclusions)"
                suffix="g"
                value={baseDoughG}
                onChange={setBaseDoughG}
                hint="Base dough weight; excludes inclusions"
              />

              <FlourBreakdownEditor parts={flourParts} onAdd={addFlour} onRemove={removeFlour} onUpdate={updateFlour} />

              <Field label="Hydration" suffix="%" value={hydrationPct} onChange={setHydrationPct} hint="Water as % of flour" />
              <Field label="Salt" suffix="%" value={saltPct} onChange={setSaltPct} hint="Salt as % of flour" />
              <Field label="Levain" suffix="%" value={levainPct} onChange={setLevainPct} hint="Levain (total weight) as % of flour" />
              <Field
                label="Levain hydration"
                suffix="%"
                value={levainHydrationPct}
                onChange={setLevainHydrationPct}
                hint="Used only for levain build + prefermented flour + effective hydration"
              />

              <LineItemEditor
                title="Additional ingredients"
                subtitle="Included in base dough weight"
                items={additions}
                onAdd={() => addRow(setAdditions)}
                onRemove={(id) => removeRow(setAdditions, id)}
                onUpdate={(id, patch) => updateRow(setAdditions, id, patch)}
                computed={result.ok ? result.additions : []}
              />

              <LineItemEditor
                title="Inclusions"
                subtitle="Not included in base dough weight"
                items={inclusions}
                onAdd={() => addRow(setInclusions)}
                onRemove={(id) => removeRow(setInclusions, id)}
                onUpdate={(id, patch) => updateRow(setInclusions, id, patch)}
                computed={result.ok ? result.inclusions : []}
              />

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={showEffectiveHydration}
                  onChange={(e) => setShowEffectiveHydration(e.target.checked)}
                />
                Show effective hydration details
              </label>

              <label className="grid gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-slate-800">Notes</span>
                  <span className="text-xs text-slate-500">optional</span>
                </div>

                <textarea
                  className="w-full min-h-[110px] resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything you want to remember about this formula (timings, flour brand, bake notes, etc.)"
                />

                <span className="text-xs text-slate-500">Saved automatically in your browser.</span>
              </label>
            </div>

            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-slate-700 hover:text-slate-900">Assumptions &amp; math</summary>
              <div className="mt-3 text-slate-600 space-y-2">
                <p>
                  All % inputs are based on <b>main flour</b> (main flour = 100%). Levain is treated as a single ingredient in the dough equation.
                </p>
                <p>
                  <b>Additional ingredients</b> are included in the base dough weight equation. <b>Inclusions</b> are calculated separately and do
                  not change flour/water/salt/levain.
                </p>
              </div>
            </details>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
            <h2 className="text-lg font-medium">Outputs</h2>

            {!result.ok ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{result.error}</div>
            ) : (
              <>
                <div className="mt-4 grid gap-3">
                  <OutRow label="Flour (main dough)" value={result.flour} />
                  <OutRow label="Water" value={result.water} />
                  <OutRow label="Salt" value={result.salt} />
                  <OutRow label="Levain (total)" value={result.levain} />

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-slate-800">Flour breakdown</h3>
                      <span className="text-xs text-slate-600">grams</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm">
                      {result.flourBreakdown.map((f) => (
                        <div key={f.id} className="flex items-center justify-between">
                          <span className="text-slate-700">{f.name}</span>
                          <span className="font-medium tabular-nums">
                            {roundWhole(f.grams)} g ({round1(f.pct)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.additions.length ? <SummaryCard title="Additional ingredients" items={result.additions} /> : null}
                  {result.inclusions.length ? <SummaryCard title="Inclusions" items={result.inclusions} /> : null}

                  {result.inclusions.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Dough weight incl. inclusions</span>
                        <span className="font-semibold tabular-nums">{roundWhole(result.doughWithInclusions)} g</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">Prefermented flour</span>
                      <span className="font-semibold tabular-nums">{round1(result.prefermentedFlourPct)}%</span>
                    </div>
                  </div>

                  <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-slate-800">Levain build (optional)</h3>
                      <span className="text-xs text-slate-600">grams</span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Levain flour</span>
                        <span className="font-medium tabular-nums">{roundWhole(result.levainBuildFlour)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Levain water</span>
                        <span className="font-medium tabular-nums">{roundWhole(result.levainBuildWater)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 text-xs text-slate-500">
                  Check: base dough totals add up to {roundWhole(result.checks.baseTotal)} g (target {roundWhole(result.checks.targetBaseDough)} g).
                </div>

                <div className="mt-3 text-xs text-slate-600">
                  Effective hydration (incl. levain): <span className="font-semibold tabular-nums">{round1(result.effectiveHydrationPct)}%</span>
                </div>

                {showEffectiveHydration ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">Effective hydration (incl. levain)</span>
                      <span className="font-semibold tabular-nums">{round1(result.effectiveHydrationPct)}%</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Computed as (main water + levain water) / (main flour + levain flour).</div>
                  </div>
                ) : null}

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-slate-700 hover:text-slate-900">Copyable formula</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{recipeText}</pre>
                </details>
              </>
            )}
          </section>
        </div>

        <footer className="mt-8 text-xs text-slate-500">
          Saved automatically in your browser. Additional ingredients in grams are treated as fixed weights; rounding reconciliation adjusts water so the base dough weight matches exactly.
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
  hint,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <span className="text-xs text-slate-500">{suffix}</span>
      </div>

      <input
        inputMode="decimal"
        dir="ltr"
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
      />

      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function FlourBreakdownEditor({
  parts,
  onAdd,
  onRemove,
  onUpdate,
}: {
  parts: FlourPart[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<FlourPart>) => void;
}) {
  const totalPct = parts
    .map((p) => parseNum(p.pct))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => a + b, 0);

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Flour breakdown</h3>
          <div className="text-xs text-slate-600">Percent of main dough flour (should total ~100%)</div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="appearance-none text-xs rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 leading-none hover:!bg-slate-100 active:!bg-slate-200"
          style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
        >
          + Add
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        {parts.map((p) => (
          <div key={p.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 md:col-span-7">
              <label className="grid gap-1">
                <span className="text-xs text-slate-600">Flour name</span>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  value={p.name}
                  onChange={(ev) => onUpdate(p.id, { name: (ev.target as HTMLInputElement).value })}
                  placeholder="e.g., bread flour"
                />
              </label>
            </div>

            <div className="col-span-10 md:col-span-4 min-w-0">
              <label className="grid gap-1 min-w-0">
                <span className="text-xs text-slate-600">% of flour</span>
                <input
                  inputMode="decimal"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums text-right outline-none focus:ring-2 focus:ring-slate-300"
                  value={p.pct}
                  onChange={(ev) => onUpdate(p.id, { pct: (ev.target as HTMLInputElement).value })}
                  placeholder="e.g., 70"
                />
              </label>
            </div>

            <div className="col-span-2 md:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="appearance-none text-xs rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-2 leading-none hover:!bg-slate-100 active:!bg-slate-200"
                style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                title="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-[11px] text-slate-500">Current total: {round2(totalPct)}%</div>
    </div>
  );
}

function LineItemEditor({
  title,
  subtitle,
  items,
  onAdd,
  onRemove,
  onUpdate,
  computed,
}: {
  title: string;
  subtitle: string;
  items: LineItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<LineItem>) => void;
  computed: LineItemComputed[];
}) {
  const computedMap = new Map(computed.map((c) => [c.id, c]));

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-800">{title}</h3>
          <div className="text-xs text-slate-600">{subtitle}</div>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="appearance-none text-xs rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 leading-none hover:!bg-slate-100 active:!bg-slate-200"
          style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
        >
          + Add
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        {items.map((e) => {
          const c = computedMap.get(e.id);
          const hasInput = e.pct.trim() !== "" || e.grams.trim() !== "";
          const mode: "grams" | "pct" | "empty" =
            e.grams.trim() !== "" ? "grams" : e.pct.trim() !== "" ? "pct" : "empty";

          return (
            <div key={e.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 md:col-span-5">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-600">Name</span>
                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    value={e.name}
                    onChange={(ev) => onUpdate(e.id, { name: (ev.target as HTMLInputElement).value })}
                    placeholder={title === "Inclusions" ? "e.g., olives, nuts" : "e.g., diastatic malt"}
                  />
                </label>
              </div>

              <div className="col-span-6 md:col-span-3 min-w-0">
                <label className="grid gap-1 min-w-0">
                  <span className="text-xs text-slate-600">% of flour</span>
                  <div className="flex min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white">
                    <input
                      inputMode="decimal"
                      dir="ltr"
                      className="min-w-0 flex-1 px-3 py-2 text-sm tabular-nums text-right outline-none"
                      value={e.pct}
                      onChange={(ev) => onUpdate(e.id, { pct: (ev.target as HTMLInputElement).value, grams: "" })}
                      placeholder="e.g., 0.5"
                    />
                    <div className="flex items-center border-l border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-500 tabular-nums">
                      {hasInput && mode === "grams" && c ? `${round1(c.pct)}%` : ""}
                    </div>
                  </div>
                </label>
              </div>

              <div className="col-span-6 md:col-span-3 min-w-0">
                <label className="grid gap-1 min-w-0">
                  <span className="text-xs text-slate-600">grams</span>
                  <div className="flex min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white">
                    <input
                      inputMode="decimal"
                      dir="ltr"
                      className="min-w-0 flex-1 px-3 py-2 text-sm tabular-nums text-right outline-none"
                      value={e.grams}
                      onChange={(ev) => onUpdate(e.id, { grams: (ev.target as HTMLInputElement).value, pct: "" })}
                      placeholder="e.g., 80"
                    />
                    <div className="flex items-center border-l border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-500 tabular-nums">
                      {hasInput && mode === "pct" && c ? `${roundWhole(c.grams)}g` : ""}
                    </div>
                  </div>
                </label>
              </div>

              <div className="col-span-12 md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => onRemove(e.id)}
                  className="appearance-none text-xs rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-2 leading-none hover:!bg-slate-100 active:!bg-slate-200"
                  style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>

              <div className="col-span-12 text-[11px] text-slate-500">Enter either % or grams; the other will be calculated.</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OutRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{roundWhole(value)} g</span>
    </div>
  );
}

function SummaryCard({ title, items }: { title: string; items: LineItemComputed[] }) {
  const fallbackName = title.endsWith("s") ? title.slice(0, -1) : title;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-800">{title}</h3>
        <span className="text-xs text-slate-600">grams</span>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        {items.map((x) => (
          <div key={x.id} className="flex items-center justify-between">
            <span className="text-slate-700">{x.name || fallbackName}</span>
            <span className="font-medium tabular-nums">
              {roundWhole(x.grams)} g ({round1(x.pct)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
