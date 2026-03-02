import { round1, roundWhole } from "../lib/number.ts";
import type { FlourPartComputed, LineItemComputed } from "../lib/types.ts";

export function OutRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{roundWhole(value)} g</span>
    </div>
  );
}

export function SummaryCard({ title, items }: { title: string; items: LineItemComputed[] }) {
  const fallbackName = title.endsWith("s") ? title.slice(0, -1) : title;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-800">{title}</h3>
        <span className="text-xs text-slate-600">grams</span>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        {items.map((x) => (
          <div key={x.id} className="flex items-center justify-between">
            <span className="text-slate-700">{x.name || fallbackName}</span>
            <span className="font-medium tabular-nums">
              {roundWhole(x.grams)} g ({round1(x.pct)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlourBreakdownSummary({ items }: { items: FlourPartComputed[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-800">Flour breakdown</h3>
        <span className="text-xs text-slate-600">grams</span>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        {items.map((f) => (
          <div key={f.id} className="flex items-center justify-between">
            <span className="text-slate-700">{f.name}</span>
            <span className="font-medium tabular-nums">
              {roundWhole(f.grams)} g ({round1(f.pct)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
