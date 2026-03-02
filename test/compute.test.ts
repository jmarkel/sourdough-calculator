import assert from "node:assert/strict";
import test from "node:test";
import { compute } from "../src/lib/compute.ts";
import {
  baseDough,
  defaultFlourParts,
  hydrationPct,
  levainHydrationPct,
  levainPct,
  saltPct,
} from "./helpers.ts";

test("compute reconciles totals to base dough weight", () => {
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
    assert.equal(result.checks.baseTotal, 1000);
  }
});

test("compute treats inclusions as outside base dough", () => {
  const result = compute(
    baseDough,
    hydrationPct,
    saltPct,
    levainPct,
    levainHydrationPct,
    [{ id: "a", name: "", pct: "", grams: "" }],
    [{ id: "i", name: "olives", pct: "", grams: "100" }],
    defaultFlourParts,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.checks.baseTotal, 1000);
    assert.equal(result.doughWithInclusions, 1100);
  }
});

test("compute includes additional ingredients in base dough", () => {
  const result = compute(
    baseDough,
    hydrationPct,
    saltPct,
    levainPct,
    levainHydrationPct,
    [{ id: "a", name: "malt", pct: "", grams: "10" }],
    [{ id: "i", name: "", pct: "", grams: "" }],
    defaultFlourParts,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.checks.baseTotal, 1000);
  }
});

test("compute normalizes flour parts and reconciles grams to total flour", () => {
  const result = compute(
    baseDough,
    hydrationPct,
    saltPct,
    levainPct,
    levainHydrationPct,
    [{ id: "a", name: "", pct: "", grams: "" }],
    [{ id: "i", name: "", pct: "", grams: "" }],
    [
      { id: "f1", name: "Bread", pct: "70" },
      { id: "f2", name: "Whole wheat", pct: "20" },
      { id: "f3", name: "Rye", pct: "10" },
    ],
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    const total = result.flourBreakdown.reduce((sum, item) => sum + item.grams, 0);
    assert.equal(total, result.flour);
  }
});

test("compute allows extra flour rows at 0%", () => {
  const result = compute(
    baseDough,
    hydrationPct,
    saltPct,
    levainPct,
    levainHydrationPct,
    [{ id: "a", name: "", pct: "", grams: "" }],
    [{ id: "i", name: "", pct: "", grams: "" }],
    [
      { id: "f1", name: "Bread", pct: "100" },
      { id: "f2", name: "", pct: "0" },
    ],
  );

  assert.equal(result.ok, true);
});

test("compute rejects invalid base inputs", () => {
  const result = compute(
    "not-a-number",
    hydrationPct,
    saltPct,
    levainPct,
    levainHydrationPct,
    [{ id: "a", name: "", pct: "", grams: "" }],
    [{ id: "i", name: "", pct: "", grams: "" }],
    defaultFlourParts,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /valid numbers/i);
  }
});
