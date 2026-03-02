import { normalizeRecipeName } from "./text.ts";
import { round1, roundWhole } from "./number.ts";
import type { CalcOk } from "./types.ts";

export function buildRecipeText(result: CalcOk, recipeName: string, notes: string) {
  const lines: string[] = [];
  const name = normalizeRecipeName(recipeName);

  if (name) {
    lines.push(`Recipe: ${name}`);
    lines.push("");
  }

  lines.push(`Base dough weight (w/o inclusions): ${roundWhole(result.checks.targetBaseDough)} g`);
  lines.push("");
  lines.push("Main dough:");
  lines.push(`- Flour: ${roundWhole(result.flour)} g`);
  lines.push(`- Water: ${roundWhole(result.water)} g`);
  lines.push(`- Salt: ${roundWhole(result.salt)} g`);
  lines.push(`- Levain (total): ${roundWhole(result.levain)} g`);

  if (result.additions.length) {
    lines.push("");
    lines.push("Additional ingredients:");
    for (const x of result.additions) {
      lines.push(`- ${x.name || "Additional"}: ${roundWhole(x.grams)} g (${round1(x.pct)}%)`);
    }
  }

  if (result.inclusions.length) {
    lines.push("");
    lines.push("Inclusions:");
    for (const x of result.inclusions) {
      lines.push(`- ${x.name || "Inclusion"}: ${roundWhole(x.grams)} g (${round1(x.pct)}%)`);
    }
    lines.push(`Dough weight incl. inclusions: ${roundWhole(result.doughWithInclusions)} g`);
  }

  lines.push("");
  lines.push("Levain build (optional):");
  lines.push(`- Levain flour: ${roundWhole(result.levainBuildFlour)} g`);
  lines.push(`- Levain water: ${roundWhole(result.levainBuildWater)} g`);

  lines.push("");
  lines.push(`Prefermented flour: ${round1(result.prefermentedFlourPct)}%`);
  lines.push(`Effective hydration (incl. levain): ${round1(result.effectiveHydrationPct)}%`);

  lines.push("");
  lines.push("Flour breakdown (main dough flour):");
  for (const f of result.flourBreakdown) {
    lines.push(`- ${f.name}: ${roundWhole(f.grams)} g (${round1(f.pct)}%)`);
  }

  if (notes.trim()) {
    lines.push("");
    lines.push("Notes:");
    lines.push(notes.trim());
  }

  return lines.join("\n");
}
