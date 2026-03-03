import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { appendItem, patchItemById, removeItemById } from "../lib/collections.ts";
import { createEmptyFlourPart, createEmptyLineItem } from "../lib/defaults.ts";
import {
  deleteRecipe,
  exportRecipeJson,
  loadRecipeList,
  LS_KEY,
  parseRecipeJson,
  saveRecipeList,
  upsertRecipe,
} from "../lib/recipes.ts";
import {
  buildPersistedState,
  createDefaultFlourParts,
  createDefaultLineItems,
  defaultCalculatorValues,
} from "../lib/state.ts";
import { safeJsonParse } from "../lib/storage.ts";
import { normalizeRecipeName } from "../lib/text.ts";
import type { FlourPart, LineItem, PersistedStateV1, SavedRecipeV1 } from "../lib/types.ts";

export function useRecipeCalculator() {
  const buildCurrentSavedRecipe = (savedAt: number): SavedRecipeV1 => {
    const name = normalizeRecipeName(recipeName) || "Untitled recipe";
    return {
      name,
      savedAt,
      state: buildPersistedState(
        name,
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
      ),
    };
  };

  const persisted = safeJsonParse<PersistedStateV1>(
    typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null,
  );

  const [recipeName, setRecipeName] = useState(
    persisted?.version === 1 ? persisted.recipeName ?? defaultCalculatorValues.recipeName : defaultCalculatorValues.recipeName,
  );
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [recipes, setRecipes] = useState<SavedRecipeV1[]>(() => (typeof window !== "undefined" ? loadRecipeList() : []));
  const [recipeSearch, setRecipeSearch] = useState("");

  const [baseDoughG, setBaseDoughG] = useState(
    persisted?.version === 1 ? persisted.baseDoughG : defaultCalculatorValues.baseDoughG,
  );
  const [hydrationPct, setHydrationPct] = useState(
    persisted?.version === 1 ? persisted.hydrationPct : defaultCalculatorValues.hydrationPct,
  );
  const [saltPct, setSaltPct] = useState(persisted?.version === 1 ? persisted.saltPct : defaultCalculatorValues.saltPct);
  const [levainPct, setLevainPct] = useState(
    persisted?.version === 1 ? persisted.levainPct : defaultCalculatorValues.levainPct,
  );
  const [levainHydrationPct, setLevainHydrationPct] = useState(
    persisted?.version === 1 ? persisted.levainHydrationPct : defaultCalculatorValues.levainHydrationPct,
  );
  const [showEffectiveHydration, setShowEffectiveHydration] = useState(
    persisted?.version === 1 ? persisted.showEffectiveHydration : defaultCalculatorValues.showEffectiveHydration,
  );

  const [additions, setAdditions] = useState<LineItem[]>(
    persisted?.version === 1 ? createDefaultLineItems(persisted.additions) : createDefaultLineItems(),
  );
  const [inclusions, setInclusions] = useState<LineItem[]>(
    persisted?.version === 1 ? createDefaultLineItems(persisted.inclusions) : createDefaultLineItems(),
  );
  const [flourParts, setFlourParts] = useState<FlourPart[]>(
    persisted?.version === 1 ? createDefaultFlourParts(persisted.flourParts) : createDefaultFlourParts(),
  );
  const [notes, setNotes] = useState(
    persisted?.version === 1 ? persisted.notes ?? defaultCalculatorValues.notes : defaultCalculatorValues.notes,
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify(
            buildPersistedState(
              recipeName,
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
            ),
          ),
        );
      } catch {
        // ignore
      }
    }, 200);

    return () => window.clearTimeout(t);
  }, [
    recipeName,
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
    setter((xs) => appendItem(xs, createEmptyLineItem()));
  const removeRow = (setter: Dispatch<SetStateAction<LineItem[]>>, id: string) =>
    setter((xs) => removeItemById(xs, id));
  const updateRow = (
    setter: Dispatch<SetStateAction<LineItem[]>>,
    id: string,
    patch: Partial<LineItem>,
  ) => setter((xs) => patchItemById(xs, id, patch));

  const addAddition = () => addRow(setAdditions);
  const removeAddition = (id: string) => removeRow(setAdditions, id);
  const updateAddition = (id: string, patch: Partial<LineItem>) => updateRow(setAdditions, id, patch);

  const addInclusion = () => addRow(setInclusions);
  const removeInclusion = (id: string) => removeRow(setInclusions, id);
  const updateInclusion = (id: string, patch: Partial<LineItem>) => updateRow(setInclusions, id, patch);

  const addFlour = () => setFlourParts((xs) => appendItem(xs, createEmptyFlourPart()));
  const removeFlour = (id: string) => setFlourParts((xs) => removeItemById(xs, id));
  const updateFlour = (id: string, patch: Partial<FlourPart>) =>
    setFlourParts((xs) => patchItemById(xs, id, patch));

  const refreshRecipes = () => setRecipes(loadRecipeList());

  const openRecipes = () => {
    refreshRecipes();
    setRecipeSearch("");
    setRecipesOpen(true);
  };

  const closeRecipes = () => setRecipesOpen(false);

  const saveCurrentRecipe = () => {
    const name = normalizeRecipeName(recipeName);
    if (!name) {
      alert("Please enter a recipe name before saving.");
      return false;
    }

    const current = buildCurrentSavedRecipe(Date.now());
    const existing = recipes.find((r) => r.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      const ok = window.confirm(`A recipe named "${name}" already exists. Overwrite it?`);
      if (!ok) return false;
    }

    const next = upsertRecipe(recipes, { ...current, name });
    setRecipes(next);
    saveRecipeList(next);
    return true;
  };

  const loadRecipe = (recipe: SavedRecipeV1) => {
    const state = recipe.state;
    setRecipeName(state.recipeName ?? recipe.name);
    setBaseDoughG(state.baseDoughG);
    setHydrationPct(state.hydrationPct);
    setSaltPct(state.saltPct);
    setLevainPct(state.levainPct);
    setLevainHydrationPct(state.levainHydrationPct);
    setShowEffectiveHydration(state.showEffectiveHydration);
    setAdditions(createDefaultLineItems(state.additions));
    setInclusions(createDefaultLineItems(state.inclusions));
    setFlourParts(createDefaultFlourParts(state.flourParts));
    setNotes(state.notes ?? defaultCalculatorValues.notes);
    setRecipesOpen(false);
  };

  const deleteSavedRecipe = (name: string) => {
    const ok = window.confirm(`Delete recipe "${name}"?`);
    if (!ok) return;

    const latest = loadRecipeList();
    const next = deleteRecipe(latest, name);
    saveRecipeList(next);
    setRecipes(next);
  };

  const exportSavedRecipesJson = () => exportRecipeJson(recipes);
  const exportCurrentRecipeJson = () => exportRecipeJson([buildCurrentSavedRecipe(Date.now())]);

  const importSavedRecipesJson = (json: string) => {
    const imported = parseRecipeJson(json);
    if (!imported) {
      return { ok: false as const, error: "Invalid recipe JSON." };
    }
    if (imported.length === 0) {
      return { ok: false as const, error: "No valid recipes found in JSON." };
    }

    let next = loadRecipeList();
    for (const recipe of imported) {
      next = upsertRecipe(next, recipe);
    }

    saveRecipeList(next);
    setRecipes(next);

    return { ok: true as const, imported: imported.length };
  };

  const previewCurrentRecipeJson = (json: string) => {
    const imported = parseRecipeJson(json);
    if (!imported || imported.length === 0) {
      return { ok: false as const, error: "Invalid recipe JSON." };
    }

    return { ok: true as const, recipe: imported[0] };
  };

  const applyCurrentRecipeImport = (recipe: SavedRecipeV1) => {
    loadRecipe(recipe);
  };

  const resetCalculator = () => {
    setRecipeName(defaultCalculatorValues.recipeName);
    setBaseDoughG(defaultCalculatorValues.baseDoughG);
    setHydrationPct(defaultCalculatorValues.hydrationPct);
    setSaltPct(defaultCalculatorValues.saltPct);
    setLevainPct(defaultCalculatorValues.levainPct);
    setLevainHydrationPct(defaultCalculatorValues.levainHydrationPct);
    setShowEffectiveHydration(defaultCalculatorValues.showEffectiveHydration);
    setAdditions(createDefaultLineItems());
    setInclusions(createDefaultLineItems());
    setFlourParts(createDefaultFlourParts());
    setNotes(defaultCalculatorValues.notes);

    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
  };

  return {
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
  };
}
