import { parseNum, round2 } from "../lib/number.ts";
import type { FlourPart } from "../lib/types.ts";

type FlourBreakdownEditorProps = {
  parts: FlourPart[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<FlourPart>) => void;
};

export function FlourBreakdownEditor({ parts, onAdd, onRemove, onUpdate }: FlourBreakdownEditorProps) {
  const totalPct = parts
    .map((p) => parseNum(p.pct))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => a + b, 0);

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Flour breakdown</h3>
          <div className="text-xs text-slate-600">Percent of main dough flour (should total ~100%)</div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
          style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
        >
          + Add
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        {parts.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 md:grid-cols-[minmax(0,1.75fr)_minmax(7rem,0.9fr)_auto]"
          >
            <div className="col-span-full min-w-0 md:col-span-1">
              <label className="grid min-w-0 gap-1">
                <span className="text-xs text-slate-600">Flour name</span>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  value={p.name}
                  onChange={(ev) => onUpdate(p.id, { name: (ev.target as HTMLInputElement).value })}
                  placeholder="e.g., bread flour"
                />
              </label>
            </div>

            <div className="min-w-0">
              <label className="grid min-w-0 gap-1">
                <span className="text-xs text-slate-600">% of flour</span>
                <input
                  inputMode="decimal"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm tabular-nums outline-none focus:ring-2 focus:ring-slate-300"
                  value={p.pct}
                  onChange={(ev) => onUpdate(p.id, { pct: (ev.target as HTMLInputElement).value })}
                  placeholder="e.g., 70"
                />
              </label>
            </div>

            <div className="flex justify-end md:pb-0">
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="min-h-10 min-w-10 appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                title="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-[11px] text-slate-500">Current total: {round2(totalPct)}%</div>
    </div>
  );
}
