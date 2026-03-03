import assert from "node:assert/strict";
import test from "node:test";
import { exportRecipeJson, parseRecipeJson } from "../src/lib/recipes.ts";
import type { SavedRecipeV1 } from "../src/lib/types.ts";
import { makePersistedState } from "./helpers.ts";

test("exportRecipeJson wraps recipes in a versioned payload", () => {
  const recipes: SavedRecipeV1[] = [{ name: "Country loaf", savedAt: 1, state: makePersistedState("Country loaf") }];
  const json = exportRecipeJson(recipes);
  const parsed = JSON.parse(json) as { version: number; recipes: SavedRecipeV1[] };

  assert.equal(parsed.version, 1);
  assert.equal(parsed.recipes.length, 1);
  assert.equal(parsed.recipes[0].name, "Country loaf");
});

test("parseRecipeJson accepts versioned recipe export payloads", () => {
  const json = JSON.stringify({
    version: 1,
    exportedAt: 123,
    recipes: [{ name: "Country loaf", savedAt: 1, state: makePersistedState("Country loaf") }],
  });

  const parsed = parseRecipeJson(json);

  assert.ok(parsed);
  assert.equal(parsed?.length, 1);
  assert.equal(parsed?.[0].name, "Country loaf");
});

test("parseRecipeJson accepts a single saved recipe", () => {
  const json = JSON.stringify({ name: "Country loaf", savedAt: 1, state: makePersistedState("Country loaf") });

  const parsed = parseRecipeJson(json);

  assert.ok(parsed);
  assert.equal(parsed?.length, 1);
});

test("parseRecipeJson rejects invalid JSON payloads", () => {
  assert.equal(parseRecipeJson('{"hello":"world"}'), null);
});
