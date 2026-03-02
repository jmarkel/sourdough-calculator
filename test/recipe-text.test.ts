import assert from "node:assert/strict";
import test from "node:test";
import { compute } from "../src/lib/compute.ts";
import { buildRecipeText } from "../src/lib/recipeText.ts";
import {
  baseDough,
  defaultFlourParts,
  hydrationPct,
  levainHydrationPct,
  levainPct,
  saltPct,
} from "./helpers.ts";

test("buildRecipeText joins lines with newlines", () => {
  const result = compute(
    baseDough,
    hydrationPct,
    saltPct,
    levainPct,
    levainHydrationPct,
    [{ id: "a", name: "", pct: "", grams: "" }],
    [{ id: "i", name: "", pct: "", grams: "" }],
    defaultFlourParts,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    const text = buildRecipeText(result, "Example", "Notes here");
    assert.match(text, /Recipe: Example/);
    assert.match(text, /Main dough:\n- Flour:/);
    assert.match(text, /Notes:\nNotes here/);
  }
});
