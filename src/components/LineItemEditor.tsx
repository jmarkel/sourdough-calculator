import { round1, roundWhole } from "../lib/number.ts";
import type { LineItem, LineItemComputed } from "../lib/types.ts";

type LineItemEditorProps = {
  title: string;
  subtitle: string;
  items: LineItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<LineItem>) => void;
  computed: LineItemComputed[];
};

export function LineItemEditor({
  title,
  subtitle,
  items,
  onAdd,
  onRemove,
  onUpdate,
  computed,
}: LineItemEditorProps) {
  const computedMap = new Map(computed.map((c) => [c.id, c]));

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-800">{title}</h3>
          <div className="text-xs text-slate-600">{subtitle}</div>
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
        {items.map((e) => {
          const computedValue = computedMap.get(e.id);
          const hasInput = e.pct.trim() !== "" || e.grams.trim() !== "";
          const mode: "grams" | "pct" | "empty" =
            e.grams.trim() !== "" ? "grams" : e.pct.trim() !== "" ? "pct" : "empty";

          return (
            <div key={e.id} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-12 md:col-span-5">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-600">Name</span>
                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    value={e.name}
                    onChange={(ev) => onUpdate(e.id, { name: (ev.target as HTMLInputElement).value })}
                    placeholder={title === "Inclusions" ? "e.g., olives, nuts" : "e.g., diastatic malt"}
                  />
                </label>
              </div>

              <div className="col-span-6 min-w-0 md:col-span-3">
                <label className="grid min-w-0 gap-1">
                  <span className="text-xs text-slate-600">% of flour</span>
                  <div className="flex min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white">
                    <input
                      inputMode="decimal"
                      dir="ltr"
                      className="min-w-0 flex-1 px-3 py-2 text-right text-sm tabular-nums outline-none"
                      value={e.pct}
                      onChange={(ev) => onUpdate(e.id, { pct: (ev.target as HTMLInputElement).value, grams: "" })}
                      placeholder="e.g., 0.5"
                    />
                    <div className="flex items-center border-l border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-500 tabular-nums">
                      {hasInput && mode === "grams" && computedValue ? `${round1(computedValue.pct)}%` : ""}
                    </div>
                  </div>
                </label>
              </div>

              <div className="col-span-6 min-w-0 md:col-span-3">
                <label className="grid min-w-0 gap-1">
                  <span className="text-xs text-slate-600">grams</span>
                  <div className="flex min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white">
                    <input
                      inputMode="decimal"
                      dir="ltr"
                      className="min-w-0 flex-1 px-3 py-2 text-right text-sm tabular-nums outline-none"
                      value={e.grams}
                      onChange={(ev) => onUpdate(e.id, { grams: (ev.target as HTMLInputElement).value, pct: "" })}
                      placeholder="e.g., 80"
                    />
                    <div className="flex items-center border-l border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-500 tabular-nums">
                      {hasInput && mode === "pct" && computedValue ? `${roundWhole(computedValue.grams)}g` : ""}
                    </div>
                  </div>
                </label>
              </div>

              <div className="col-span-12 flex justify-end md:col-span-1">
                <button
                  type="button"
                  onClick={() => onRemove(e.id)}
                  className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-2 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                  style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>

              <div className="col-span-12 text-[11px] text-slate-500">
                Enter either % or grams; the other will be calculated.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
