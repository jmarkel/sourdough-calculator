import assert from "node:assert/strict";
import test from "node:test";
import { deleteRecipe, upsertRecipe } from "../src/lib/recipes.ts";
import { normalizeRecipeName } from "../src/lib/text.ts";
import type { SavedRecipeV1 } from "../src/lib/types.ts";
import { makePersistedState } from "./helpers.ts";

test("normalizeRecipeName trims and collapses whitespace", () => {
  assert.equal(normalizeRecipeName("  Hello\n\tworld   "), "Hello world");
});

test("upsertRecipe replaces recipes case-insensitively", () => {
  const state = makePersistedState();
  const existing: SavedRecipeV1 = { name: "Test", savedAt: 1, state };
  const replacement: SavedRecipeV1 = { name: "test", savedAt: 2, state };

  const result = upsertRecipe([existing], replacement);

  assert.equal(result.length, 1);
  assert.equal(result[0].savedAt, 2);
});

test("deleteRecipe removes recipes case-insensitively", () => {
  const state = makePersistedState("X");
  const result = deleteRecipe(
    [
      { name: "Hello", savedAt: 1, state },
      { name: "World", savedAt: 2, state },
    ],
    "hello",
  );

  assert.deepEqual(
    result.map((recipe) => recipe.name),
    ["World"],
  );
});
