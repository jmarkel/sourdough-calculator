import { useMemo, useState } from "react";
import { Field } from "./components/Field.tsx";
import { FlourBreakdownEditor } from "./components/FlourBreakdownEditor.tsx";
import { LineItemEditor } from "./components/LineItemEditor.tsx";
import { FlourBreakdownSummary, OutRow, SummaryCard } from "./components/OutputBits.tsx";
import { RecipesModal } from "./components/RecipesModal.tsx";
import { copyToClipboard } from "./lib/clipboard.ts";
import { compute } from "./lib/compute.ts";
import { useRecipeCalculator } from "./hooks/useRecipeCalculator.ts";
import { round1, roundWhole } from "./lib/number.ts";
import { buildRecipeText } from "./lib/recipeText.ts";

export default function App() {
  const {
    recipeName,
    setRecipeName,
    recipesOpen,
    recipes,
    recipeSearch,
    setRecipeSearch,
    baseDoughG,
    setBaseDoughG,
    hydrationPct,
    setHydrationPct,
    saltPct,
    setSaltPct,
    levainPct,
    setLevainPct,
    levainHydrationPct,
    setLevainHydrationPct,
    showEffectiveHydration,
    setShowEffectiveHydration,
    additions,
    inclusions,
    flourParts,
    notes,
    setNotes,
    addAddition,
    removeAddition,
    updateAddition,
    addInclusion,
    removeInclusion,
    updateInclusion,
    addFlour,
    removeFlour,
    updateFlour,
    saveCurrentRecipe,
    openRecipes,
    closeRecipes,
    refreshRecipes,
    loadRecipe,
    deleteSavedRecipe,
    exportCurrentRecipeJson,
    exportSavedRecipesJson,
    previewCurrentRecipeJson,
    applyCurrentRecipeImport,
    importSavedRecipesJson,
    resetCalculator,
  } = useRecipeCalculator();

  const [copyStatus, setCopyStatus] = useState("");

  const result = useMemo(
    () => compute(baseDoughG, hydrationPct, saltPct, levainPct, levainHydrationPct, additions, inclusions, flourParts),
    [baseDoughG, hydrationPct, saltPct, levainPct, levainHydrationPct, additions, inclusions, flourParts],
  );

  const recipeText = useMemo(
    () => (result.ok ? buildRecipeText(result, recipeName, notes) : ""),
    [result, recipeName, notes],
  );

  const handleCopy = async () => {
    if (!recipeText) return;
    const ok = await copyToClipboard(recipeText);
    setCopyStatus(ok ? "Copied!" : "Copy failed");
    window.setTimeout(() => setCopyStatus(""), 1200);
  };

  const handleSave = () => {
    if (!saveCurrentRecipe()) return;
    setCopyStatus("Saved");
    window.setTimeout(() => setCopyStatus(""), 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-10">
      <div className="w-full">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Sourdough Ingredient Calculator</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Baker’s percentages are based on <b>main flour</b> (main flour = 100%). Levain is a black-box ingredient.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!result.ok}
              className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200 disabled:opacity-50"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              Copy formula
            </button>

            <button
              type="button"
              onClick={resetCalculator}
              className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              Reset
            </button>

            {copyStatus ? <span className="text-xs text-slate-600">{copyStatus}</span> : null}
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.9fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-medium">Inputs</h2>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-slate-800">Recipe name</span>
                  <span className="text-xs text-slate-500">used for saving/loading</span>
                </div>

                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  value={recipeName}
                  onChange={(e) => setRecipeName((e.target as HTMLInputElement).value)}
                  placeholder="e.g., 78% country loaf"
                />

                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                    style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={openRecipes}
                    className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                    style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                  >
                    Load…
                  </button>
                </div>
              </label>

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
              <Field
                label="Levain"
                suffix="%"
                value={levainPct}
                onChange={setLevainPct}
                hint="Levain (total weight) as % of flour"
              />
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
                onAdd={addAddition}
                onRemove={removeAddition}
                onUpdate={updateAddition}
                computed={result.ok ? result.additions : []}
              />

              <LineItemEditor
                title="Inclusions"
                subtitle="Not included in base dough weight"
                items={inclusions}
                onAdd={addInclusion}
                onRemove={removeInclusion}
                onUpdate={updateInclusion}
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
                  className="min-h-[110px] w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything you want to remember about this formula (timings, flour brand, bake notes, etc.)"
                />

                <span className="text-xs text-slate-500">Saved automatically in your browser.</span>
              </label>
            </div>

            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-slate-700 hover:text-slate-900">Assumptions &amp; math</summary>
              <div className="mt-3 space-y-2 text-slate-600">
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

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
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
                  <FlourBreakdownSummary items={result.flourBreakdown} />

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

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">Effective hydration (incl. levain)</span>
                      <span className="font-semibold tabular-nums">{round1(result.effectiveHydrationPct)}%</span>
                    </div>
                    {showEffectiveHydration ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Computed as (main water + levain water) / (main flour + levain flour).
                      </div>
                    ) : null}
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

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-slate-700 hover:text-slate-900">Copyable formula</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    {recipeText}
                  </pre>
                </details>
              </>
            )}
          </section>
        </div>

        {recipesOpen ? (
          <RecipesModal
            recipes={recipes}
            search={recipeSearch}
            setSearch={setRecipeSearch}
            onReload={refreshRecipes}
            onClose={closeRecipes}
            onLoad={loadRecipe}
            onDelete={deleteSavedRecipe}
            onExportCurrentJson={exportCurrentRecipeJson}
            onPreviewCurrentJson={previewCurrentRecipeJson}
            onApplyCurrentJson={applyCurrentRecipeImport}
            onExportLibraryJson={exportSavedRecipesJson}
            onImportLibraryJson={importSavedRecipesJson}
          />
        ) : null}

        <footer className="mt-8 text-xs text-slate-500">
          Saved automatically in your browser. Additional ingredients in grams are treated as fixed weights; rounding
          reconciliation adjusts water so the base dough weight matches exactly.
        </footer>
      </div>
    </div>
  );
}
