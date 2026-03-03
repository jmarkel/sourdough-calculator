import { normalizeRecipeName } from "./text.ts";
import { safeJsonParse } from "./storage.ts";
import type { RecipeJsonExportV1, SavedRecipeV1 } from "./types.ts";

export const LS_KEY = "sourdough-calculator:v1";
export const LS_RECIPES_KEY = "sourdough-calculator:recipes:v1";

function isSavedRecipeV1(value: unknown): value is SavedRecipeV1 {
  if (!value || typeof value !== "object") return false;

  const recipe = value as Partial<SavedRecipeV1>;
  return (
    typeof recipe.name === "string" &&
    typeof recipe.savedAt === "number" &&
    !!recipe.state &&
    typeof recipe.state === "object" &&
    recipe.state.version === 1
  );
}

export function normalizeRecipeList(list: unknown): SavedRecipeV1[] {
  if (!Array.isArray(list)) return [];

  return list
    .filter(isSavedRecipeV1)
    .map((recipe) => ({ ...recipe, name: normalizeRecipeName(recipe.name) }))
    .filter((recipe) => recipe.name.length > 0)
    .sort((a, b) => b.savedAt - a.savedAt);
}

export function loadRecipeList(): SavedRecipeV1[] {
  if (typeof window === "undefined") return [];

  return normalizeRecipeList(safeJsonParse<SavedRecipeV1[]>(localStorage.getItem(LS_RECIPES_KEY)));
}

export function saveRecipeList(list: SavedRecipeV1[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_RECIPES_KEY, JSON.stringify(list));
}

export function upsertRecipe(list: SavedRecipeV1[], recipe: SavedRecipeV1): SavedRecipeV1[] {
  const name = normalizeRecipeName(recipe.name);
  const next = list.filter((r) => normalizeRecipeName(r.name).toLowerCase() !== name.toLowerCase());
  next.unshift({ ...recipe, name });
  return next;
}

export function deleteRecipe(list: SavedRecipeV1[], name: string): SavedRecipeV1[] {
  const normalized = normalizeRecipeName(name).toLowerCase();
  return list.filter((r) => normalizeRecipeName(r.name).toLowerCase() !== normalized);
}

export function exportRecipeJson(list: SavedRecipeV1[]): string {
  const payload: RecipeJsonExportV1 = {
    version: 1,
    exportedAt: Date.now(),
    recipes: normalizeRecipeList(list),
  };

  return JSON.stringify(payload, null, 2);
}

export function parseRecipeJson(json: string): SavedRecipeV1[] | null {
  const parsed = safeJsonParse<RecipeJsonExportV1 | SavedRecipeV1[] | SavedRecipeV1>(json);
  if (!parsed) return null;

  if (Array.isArray(parsed)) {
    return normalizeRecipeList(parsed);
  }

  if (isSavedRecipeV1(parsed)) {
    return normalizeRecipeList([parsed]);
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    parsed.version === 1 &&
    "recipes" in parsed
  ) {
    return normalizeRecipeList(parsed.recipes);
  }

  return null;
}
