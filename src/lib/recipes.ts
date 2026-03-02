import { normalizeRecipeName } from "./text.ts";
import { safeJsonParse } from "./storage.ts";
import type { SavedRecipeV1 } from "./types.ts";

export const LS_KEY = "sourdough-calculator:v1";
export const LS_RECIPES_KEY = "sourdough-calculator:recipes:v1";

export function loadRecipeList(): SavedRecipeV1[] {
  if (typeof window === "undefined") return [];

  const raw = safeJsonParse<SavedRecipeV1[]>(localStorage.getItem(LS_RECIPES_KEY));
  if (!raw || !Array.isArray(raw)) return [];

  return raw
    .filter((r) => r && typeof r.name === "string" && r.state && r.state.version === 1)
    .map((r) => ({ ...r, name: normalizeRecipeName(r.name) }))
    .filter((r) => r.name.length > 0)
    .sort((a, b) => b.savedAt - a.savedAt);
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
