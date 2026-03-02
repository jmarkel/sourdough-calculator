import { makeId } from "./id.ts";
import type { FlourPart, LineItem } from "./types.ts";

export function createEmptyLineItem(): LineItem {
  return { id: makeId(), name: "", pct: "", grams: "" };
}

export function createDefaultFlourPart(): FlourPart {
  return { id: makeId(), name: "Bread flour", pct: "100" };
}

export function createEmptyFlourPart(): FlourPart {
  return { id: makeId(), name: "", pct: "0" };
}
