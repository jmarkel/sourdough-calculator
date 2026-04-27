import { useMemo, useState } from "react";
import { Field } from "./components/Field.tsx";
import { FlourBreakdownEditor } from "./components/FlourBreakdownEditor.tsx";
import { LineItemEditor } from "./components/LineItemEditor.tsx";
import { FlourBreakdownSummary, OutRow, SummaryCard } from "./components/OutputBits.tsx";
import { RecipesModal } from "./components/RecipesModal.tsx";
import { copyToClipboard } from "./lib/clipboard.ts";
import { compute } from "./lib/compute.ts";
import { useHashPage, type AppPage } from "./hooks/useHashPage.ts";
import { usePwaInstall } from "./hooks/usePwaInstall.ts";
import { round1, roundWhole } from "./lib/number.ts";
import { buildRecipeText } from "./lib/recipeText.ts";
import { useRecipeCalculator } from "./hooks/useRecipeCalculator.ts";

const pageMeta: Record<AppPage, { title: string; subtitle: string }> = {
  calculator: {
    title: "Calculator",
    subtitle: "Adjust flour, hydration, levain, and ingredients.",
  },
  results: {
    title: "Results",
    subtitle: "View dough outputs and copy your formula.",
  },
  recipes: {
    title: "Recipes",
    subtitle: "Save, load, backup, and restore recipes.",
  },
  settings: {
    title: "PWA Settings",
    subtitle: "Install this app and keep it available offline.",
  },
};

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
    hydrationIncludesLevain,
    setHydrationIncludesLevain,
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

  const { page, setPage } = useHashPage();
  const { canInstall, promptInstall, installStatus } = usePwaInstall();

  const [copyStatus, setCopyStatus] = useState("");
  const [showCopyableRecipe, setShowCopyableRecipe] = useState(true);

  const result = useMemo(
    () =>
      compute(
        baseDoughG,
        hydrationPct,
        saltPct,
        levainPct,
        levainHydrationPct,
        additions,
        inclusions,
        flourParts,
        hydrationIncludesLevain,
      ),
    [baseDoughG, hydrationPct, saltPct, levainPct, levainHydrationPct, additions, inclusions, flourParts, hydrationIncludesLevain],
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

  const currentPage = pageMeta[page];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full px-4 pb-24 pt-4 sm:px-6 md:px-8 md:pb-8">
        <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Sourdough Calculator PWA</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{currentPage.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{currentPage.subtitle}</p>
        </header>

        {page === "calculator" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-4">
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

                <div className="mt-2 flex flex-wrap items-center gap-2">
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
                    Open Library
                  </button>

                  <button
                    type="button"
                    onClick={resetCalculator}
                    className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                    style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                  >
                    Reset
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

              <Field
                label="Hydration"
                suffix="%"
                value={hydrationPct}
                onChange={setHydrationPct}
                hint={hydrationIncludesLevain ? "Target effective hydration (includes levain)" : "Water as % of main flour"}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={hydrationIncludesLevain}
                  onChange={(e) => setHydrationIncludesLevain(e.target.checked)}
                />
                Hydration input includes levain
              </label>
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
              </label>
            </div>
          </section>
        ) : null}

        {page === "results" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!result.ok}
                className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200 disabled:opacity-50"
                style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
              >
                Copy Formula
              </button>
              {copyStatus ? <span className="text-xs text-slate-600">{copyStatus}</span> : null}
            </div>

            {!result.ok ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{result.error}</div>
            ) : (
              <>
                <div className="grid gap-3">
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
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowCopyableRecipe((shown) => !shown)}
                    className="appearance-none rounded-lg border !border-slate-300 !bg-white px-3 py-2 text-sm !text-slate-700 hover:!bg-slate-100 hover:!text-slate-900 active:!bg-slate-200"
                    style={{ backgroundColor: "#ffffff", color: "#334155" }}
                  >
                    {showCopyableRecipe ? "Hide Copyable Recipe" : "Show Copyable Recipe"}
                  </button>
                  {showCopyableRecipe ? (
                    <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                      {recipeText}
                    </pre>
                  ) : null}
                </div>
              </>
            )}
          </section>
        ) : null}

        {page === "recipes" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
              >
                Save Current Recipe
              </button>
              <button
                type="button"
                onClick={openRecipes}
                className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
              >
                Manage Library
              </button>
              <button
                type="button"
                onClick={refreshRecipes}
                className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-medium text-slate-800">Saved recipes: {recipes.length}</div>
              <div className="mt-2 grid gap-2 text-sm">
                {recipes.slice(0, 8).map((recipe) => (
                  <div key={`${recipe.name}-${recipe.savedAt}`} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-800">{recipe.name}</div>
                      <div className="text-xs text-slate-500">{new Date(recipe.savedAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadRecipe(recipe)}
                        className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                        style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavedRecipe(recipe.name)}
                        className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-rose-700 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                        style={{ backgroundColor: "#ffffff" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {page === "settings" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="text-sm text-slate-700">
              Install this app to your home screen for a native-like launch experience and persistent offline access.
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void promptInstall()}
                disabled={!canInstall}
                className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-3 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200 disabled:opacity-50"
                style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
              >
                {canInstall ? "Install App" : "Install Prompt Unavailable"}
              </button>
              {installStatus ? <span className="text-xs text-slate-600">{installStatus}</span> : null}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              iPhone tip: open this site in Safari, tap Share, then choose <b>Add to Home Screen</b>.
            </div>
          </section>
        ) : null}

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
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-3 py-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] md:sticky md:top-0 md:mt-6 md:border md:border-slate-200 md:shadow-sm">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2">
          {(
            [
              ["calculator", "Calculator"],
              ["results", "Results"],
              ["recipes", "Recipes"],
              ["settings", "Settings"],
            ] as Array<[AppPage, string]>
          ).map(([targetPage, label]) => (
            <button
              key={targetPage}
              type="button"
              onClick={() => setPage(targetPage)}
              className={`appearance-none rounded-lg border px-2 py-2 text-xs font-medium leading-none ${
                page === targetPage
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
