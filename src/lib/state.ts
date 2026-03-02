import { createDefaultFlourPart, createEmptyLineItem } from "./defaults.ts";
import type { FlourPart, LineItem, PersistedStateV1 } from "./types.ts";

export const defaultCalculatorValues = {
  baseDoughG: "1000",
  hydrationPct: "78",
  saltPct: "2",
  levainPct: "20",
  levainHydrationPct: "100",
  showEffectiveHydration: false,
  recipeName: "",
  notes: "",
} as const;

export function createDefaultLineItems(items?: LineItem[]) {
  return items?.length ? items : [createEmptyLineItem()];
}

export function createDefaultFlourParts(parts?: FlourPart[]) {
  return parts?.length ? parts : [createDefaultFlourPart()];
}

export function buildPersistedState(
  recipeName: string,
  baseDoughG: string,
  hydrationPct: string,
  saltPct: string,
  levainPct: string,
  levainHydrationPct: string,
  showEffectiveHydration: boolean,
  additions: LineItem[],
  inclusions: LineItem[],
  flourParts: FlourPart[],
  notes: string,
): PersistedStateV1 {
  return {
    version: 1,
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
  };
}
