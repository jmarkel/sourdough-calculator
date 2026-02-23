import { useMemo, useState } from "react";

/**
 * Sourdough formula calculator
 *
 * Inputs:
 * - total dough weight (g)
 * - hydration % (water as % of total flour)
 * - salt % (salt as % of total flour)
 * - levain % (levain as % of total flour)
 *
 * Assumptions:
 * - All percentages are based on MAIN dough flour (flour = 100%)
 * - Levain is treated as a black-box ingredient (its internal flour/water are not counted separately)
 *
 * Outputs:
 * - Total flour, total water, salt, levain (g)
 * - Plus a helpful breakdown: flour-in-levain, water-in-levain, and mix-in bowl additions
 */

function roundWhole(n: number) {
  return Math.round(n);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function parseNum(s: string) {
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export default function App() {
  const [totalDoughG, setTotalDoughG] = useState("1000");
  const [hydrationPct, setHydrationPct] = useState("78");
  const [saltPct, setSaltPct] = useState("2");
  const [levainPct, setLevainPct] = useState("20");
  const [levainHydrationPct, setLevainHydrationPct] = useState("100");
  const [showEffectiveHydration, setShowEffectiveHydration] = useState(false);
  const result = useMemo(() => {
    const D = parseNum(totalDoughG);
    const H = parseNum(hydrationPct) / 100;
    const S = parseNum(saltPct) / 100;
    const L = parseNum(levainPct) / 100;
    const LH = parseNum(levainHydrationPct) / 100;
    // Validate
    if (![D, H, S, L, LH].every((x) => Number.isFinite(x))) {
      return { ok: false as const, error: "Please enter valid numbers." };
    }
    if (D <= 0) return { ok: false as const, error: "Total dough weight must be > 0." };
    if (H < 0) return { ok: false as const, error: "Hydration must be ≥ 0%." };
    if (S < 0) return { ok: false as const, error: "Salt must be ≥ 0%." };
    if (L < 0) return { ok: false as const, error: "Levain must be ≥ 0%." };
    if (LH < 0) return { ok: false as const, error: "Levain hydration must be ≥ 0%." };
    
    // Baker's percentages (all % are relative to TOTAL FLOUR, where flour = 100%)
    //
    // Levain% (L) is expressed as a % of total flour (including the flour inside the levain).
    // Levain hydration (LH) defines the water inside levain relative to levain flour.
    //
    // Definitions:
    // water = H * flour
    // salt  = S * flour
    // levainFlour = L * flour
    // levainWater = LH * levainFlour
    // levain = levainFlour + levainWater = (1 + LH) * L * flour
    //
    // Total dough weight D = flour + water + salt + levain
    // => D = flour * (1 + H + S + L*(1+LH))

    const denom = 1 + H + S + L;
    if (denom <= 0) {
      return { ok: false as const, error: "Invalid percentages (resulting denominator ≤ 0)." };
    }

    // Compute unrounded weights
    const flourRaw = D / denom;
    const waterRaw = flourRaw * H;
    const saltRaw = flourRaw * S;
    const levainRaw = flourRaw * L;

    // Round to whole grams, then reconcile to match the target dough weight exactly.
    // We reconcile by applying the rounding delta to water first (common practice),
    // falling back to flour / levain / salt if needed to keep values non-negative.
    const targetDough = roundWhole(D);
    let flour = roundWhole(flourRaw);
    let water = roundWhole(waterRaw);
    let salt = roundWhole(saltRaw);
    let levain = roundWhole(levainRaw);

    const applyDelta = (v: number, delta: number) => {
      const next = v + delta;
      if (next >= 0) return { value: next, used: delta };
      const used = -v;
      return { value: 0, used };
    };

    let sum = flour + water + salt + levain;
    let delta = targetDough - sum;

    // Try to absorb delta into water, then flour, then levain, then salt.
    for (const name of ["water", "flour", "levain", "salt"] as const) {
      if (delta === 0) break;
      if (name === "water") {
        const res = applyDelta(water, delta);
        water = res.value;
        delta -= res.used;
      } else if (name === "flour") {
        const res = applyDelta(flour, delta);
        flour = res.value;
        delta -= res.used;
      } else if (name === "levain") {
        const res = applyDelta(levain, delta);
        levain = res.value;
        delta -= res.used;
      } else {
        const res = applyDelta(salt, delta);
        salt = res.value;
        delta -= res.used;
      }
    }

    sum = flour + water + salt + levain;
    if (sum !== targetDough) {
      return { ok: false as const, error: "Could not reconcile rounding to match total dough weight." };
    }
    

    // Levain is treated as a black-box for dough math, but we can still compute
    // how to BUILD it (its internal flour/water) from its hydration.
    // Levain build split (based on the reconciled, rounded levain total)
    const levainBuildFlourRaw = levain / (1 + LH);
    const levainBuildFlour = roundWhole(levainBuildFlourRaw);
    const levainBuildWater = levain - levainBuildFlour; // ensures build sums exactly to levain

    // Breakdown for convenience
    

    return {
      ok: true as const,
      flour,
      water,
      salt,
      levain,
      levainBuildFlour,
      levainBuildWater,
      checks: {
        total: flour + water + salt + levain,
        targetDough,
        denom,
      },
      effectiveHydration: (water + levainBuildWater) / (flour + levainBuildFlour),
      effectiveHydrationPct: ((water + levainBuildWater) / (flour + levainBuildFlour)) * 100,
    };
  }, [totalDoughG, hydrationPct, saltPct, levainPct, levainHydrationPct]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Sourdough Ingredient Calculator
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Enter your target dough weight and baker’s percentages (all % are based on flour = 100%).
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
            <h2 className="text-lg font-medium">Inputs</h2>
            <div className="mt-4 grid gap-4">
              <Field
                label="Total dough weight"
                suffix="g"
                value={totalDoughG}
                onChange={setTotalDoughG}
                hint="Example: 1000"
              />
              <Field
                label="Hydration"
                suffix="%"
                value={hydrationPct}
                onChange={setHydrationPct}
                hint="Water as % of total flour"
              />
              <Field
                label="Salt"
                suffix="%"
                value={saltPct}
                onChange={setSaltPct}
                hint="Salt as % of total flour"
              />
              <Field
                label="Levain"
                suffix="%"
                value={levainPct}
                onChange={setLevainPct}
                hint="Levain (total weight) as % of main flour"
              />
              <Field
                label="Levain hydration"
                suffix="%"
                value={levainHydrationPct}
                onChange={setLevainHydrationPct}
                hint="Used only to split levain into flour/water for building + effective hydration (doesn't affect dough math)"
              />

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={showEffectiveHydration}
                  onChange={(e) => setShowEffectiveHydration(e.target.checked)}
                />
                Show effective hydration (including levain)
              </label>

            </div>

            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-slate-700 hover:text-slate-900">
                Assumptions & math
              </summary>
              <div className="mt-3 text-slate-600 space-y-2">
                <p>
                  All percentages are based on <b>main dough flour only</b> (flour = 100%). The levain is treated as a single black-box ingredient.
                </p>
                <p>
                  Math: <code className="px-1">D = flour × (1 + hydration + salt + levain)</code>
                </p>
              </div>
            </details>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
            <h2 className="text-lg font-medium">Outputs</h2>

            {!result.ok ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                {result.error}
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-3">
                  <OutRow label="Flour (total)" value={result.flour} />
                  <OutRow label="Water (total)" value={result.water} />
                  <OutRow label="Salt" value={result.salt} />
                  <OutRow label="Levain (total)" value={result.levain} />
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
                  Check: totals add up to {roundWhole(result.checks.total)} g (target {roundWhole(result.checks.targetDough)} g).
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
                    <div className="mt-1 text-xs text-slate-500">
                      Computed as (water + levain water) ÷ (flour + levain flour).
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>

        <footer className="mt-8 text-xs text-slate-500">
          Tip: Levain% is total levain weight as % of main flour. Levain hydration only affects the optional “levain build” split.</footer>
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
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
      />
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
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



