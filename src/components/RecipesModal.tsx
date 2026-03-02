import type { SavedRecipeV1 } from "../lib/types.ts";

type RecipesModalProps = {
  recipes: SavedRecipeV1[];
  search: string;
  setSearch: (s: string) => void;
  onClose: () => void;
  onLoad: (r: SavedRecipeV1) => void;
  onDelete: (name: string) => void;
  onReload: () => void;
};

export function RecipesModal({
  recipes,
  search,
  setSearch,
  onClose,
  onLoad,
  onDelete,
  onReload,
}: RecipesModalProps) {
  const query = search.trim().toLowerCase();
  const shown = query ? recipes.filter((r) => r.name.toLowerCase().includes(query)) : recipes;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="absolute left-1/2 top-12 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-medium text-slate-800">Recipes</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReload}
              className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-4">
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Search recipes…"
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
          />

          <div className="mt-3 max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
            {shown.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">No recipes found.</div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {shown.map((r) => (
                  <li key={`${r.name}-${r.savedAt}`} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{r.name}</div>
                      <div className="text-xs text-slate-500">Saved {new Date(r.savedAt).toLocaleString()}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onLoad(r)}
                        className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                        style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(r.name)}
                        className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-rose-700 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                        style={{ backgroundColor: "#ffffff" }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Saving a recipe with an existing name will ask to overwrite it.
          </div>
        </div>
      </div>
    </div>
  );
}
