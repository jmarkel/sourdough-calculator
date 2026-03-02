import type { FlourPart, PersistedStateV1 } from "../src/lib/types.ts";

export const baseDough = "1000";
export const hydrationPct = "75";
export const saltPct = "2";
export const levainPct = "20";
export const levainHydrationPct = "100";

export const defaultFlourParts: FlourPart[] = [{ id: "f1", name: "Bread flour", pct: "100" }];

export function makePersistedState(name = "Test"): PersistedStateV1 {
  return {
    version: 1,
    recipeName: name,
    baseDoughG: baseDough,
    hydrationPct,
    saltPct,
    levainPct,
    levainHydrationPct,
    showEffectiveHydration: false,
    additions: [{ id: "a", name: "", pct: "", grams: "" }],
    inclusions: [{ id: "i", name: "", pct: "", grams: "" }],
    flourParts: [{ id: "f", name: "Bread", pct: "100" }],
    notes: "",
  };
}
