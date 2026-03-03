import { useRef, useState, type ChangeEvent } from "react";
import type { SavedRecipeV1 } from "../lib/types.ts";

type RecipesModalProps = {
  recipes: SavedRecipeV1[];
  search: string;
  setSearch: (s: string) => void;
  onClose: () => void;
  onLoad: (r: SavedRecipeV1) => void;
  onDelete: (name: string) => void;
  onReload: () => void;
  onExportLibraryJson: () => string;
  onImportLibraryJson: (json: string) => { ok: true; imported: number } | { ok: false; error: string };
  onExportCurrentJson: () => string;
  onPreviewCurrentJson: (json: string) => { ok: true; recipe: SavedRecipeV1 } | { ok: false; error: string };
  onApplyCurrentJson: (recipe: SavedRecipeV1) => void;
};

export function RecipesModal({
  recipes,
  search,
  setSearch,
  onClose,
  onLoad,
  onDelete,
  onReload,
  onExportLibraryJson,
  onImportLibraryJson,
  onExportCurrentJson,
  onPreviewCurrentJson,
  onApplyCurrentJson,
}: RecipesModalProps) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonMode, setJsonMode] = useState<"export" | "import">("export");
  const [jsonScope, setJsonScope] = useState<"current" | "library">("library");
  const [jsonValue, setJsonValue] = useState("");
  const [jsonStatus, setJsonStatus] = useState("");
  const [pendingCurrentRecipe, setPendingCurrentRecipe] = useState<SavedRecipeV1 | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const query = search.trim().toLowerCase();
  const shown = query ? recipes.filter((r) => r.name.toLowerCase().includes(query)) : recipes;

  const updateStatus = (message: string) => {
    setJsonStatus(message);
    setJsonOpen(true);
  };

  const formatLibraryImportMessage = (imported: number, fromFile = false) =>
    `Imported ${imported} recipe${imported === 1 ? "" : "s"}${fromFile ? " from file" : ""}.`;

  const getExportJson = (scope: "current" | "library") =>
    scope === "current" ? onExportCurrentJson() : onExportLibraryJson();

  const handleDownloadJson = (scope: "current" | "library") => {
    const json = getExportJson(scope);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = scope === "current" ? "sourdough-current-recipe.json" : "sourdough-recipes-library.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setJsonScope(scope);
    setJsonMode("export");
    setJsonValue(json);
    updateStatus(`Downloaded ${scope === "current" ? "current recipe" : "recipe library"} JSON.`);
  };

  const handleUploadClick = (scope: "current" | "library") => {
    setJsonScope(scope);
    setJsonMode("import");
    setPendingCurrentRecipe(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      if (jsonScope === "current") {
        const result = onPreviewCurrentJson(text);
        if (!result.ok) {
          setJsonMode("import");
          setJsonValue(text);
          updateStatus(result.error);
          return;
        }

        setJsonMode("import");
        setJsonValue(text);
        setPendingCurrentRecipe(result.recipe);
        updateStatus(`Review current recipe "${result.recipe.name}" and confirm to replace the form.`);
        return;
      }

      const result = onImportLibraryJson(text);
      if (!result.ok) {
        setJsonMode("import");
        setJsonValue(text);
        updateStatus(result.error);
        return;
      }

      setJsonMode("import");
      setJsonValue("");
      updateStatus(formatLibraryImportMessage(result.imported, true));
    } catch {
      updateStatus("Could not read the selected JSON file.");
    }
  };

  const handleOpenExport = (scope: "current" | "library") => {
    setJsonScope(scope);
    setJsonMode("export");
    setJsonValue(getExportJson(scope));
    setJsonStatus("");
    setPendingCurrentRecipe(null);
    setJsonOpen(true);
  };

  const handleOpenImport = (scope: "current" | "library") => {
    setJsonScope(scope);
    setJsonMode("import");
    setJsonValue("");
    setJsonStatus("");
    setPendingCurrentRecipe(null);
    setJsonOpen(true);
  };

  const handleImport = () => {
    if (jsonScope === "current") {
      const result = onPreviewCurrentJson(jsonValue);
      if (!result.ok) {
        setJsonStatus(result.error);
        return;
      }

      setPendingCurrentRecipe(result.recipe);
      setJsonStatus(`Review current recipe "${result.recipe.name}" and confirm to replace the form.`);
      return;
    }

    const result = onImportLibraryJson(jsonValue);
    if (!result.ok) {
      setJsonStatus(result.error);
      return;
    }

    setJsonStatus(formatLibraryImportMessage(result.imported));
    setJsonValue("");
  };

  const handleConfirmCurrentImport = () => {
    if (!pendingCurrentRecipe) return;
    onApplyCurrentJson(pendingCurrentRecipe);
    setJsonStatus(`Loaded current recipe "${pendingCurrentRecipe.name}".`);
    setPendingCurrentRecipe(null);
    setJsonValue("");
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="absolute left-1/2 top-12 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-medium text-slate-800">Recipes</div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleDownloadJson("current")}
              className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              Download Current
            </button>
            <button
              type="button"
              onClick={() => handleUploadClick("current")}
              className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              Upload Current
            </button>
            <button
              type="button"
              onClick={() => handleDownloadJson("library")}
              className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              Download Library
            </button>
            <button
              type="button"
              onClick={() => handleUploadClick("library")}
              className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              Upload Library
            </button>
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
          {jsonOpen ? (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-800">
                  {jsonMode === "export" ? "Recipe JSON export" : "Recipe JSON import"}:
                  {" "}
                  {jsonScope === "current" ? "current recipe" : "recipe library"}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenExport("current")}
                    className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                    style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                  >
                    Current Export
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenImport("current")}
                    className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                    style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                  >
                    Current Import
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenExport("library")}
                    className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                    style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                  >
                    Library Export
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenImport("library")}
                    className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                    style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                  >
                    Library Import
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setJsonOpen(false)}
                  className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                  style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                >
                  Hide
                </button>
              </div>

              <textarea
                className="mt-3 min-h-[12rem] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-slate-300"
                value={jsonValue}
                onChange={(e) => setJsonValue((e.target as HTMLTextAreaElement).value)}
                readOnly={jsonMode === "export"}
                placeholder={jsonMode === "import" ? "Paste recipe JSON here" : undefined}
              />

              {jsonMode === "import" && jsonScope === "current" && pendingCurrentRecipe ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-800">Replace current form with this recipe?</div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-600 md:grid-cols-2">
                    <div>Name: {pendingCurrentRecipe.name}</div>
                    <div>Saved: {new Date(pendingCurrentRecipe.savedAt).toLocaleString()}</div>
                    <div>Base dough: {pendingCurrentRecipe.state.baseDoughG} g</div>
                    <div>Hydration: {pendingCurrentRecipe.state.hydrationPct}%</div>
                    <div>Salt: {pendingCurrentRecipe.state.saltPct}%</div>
                    <div>Levain: {pendingCurrentRecipe.state.levainPct}%</div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmCurrentImport}
                      className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                      style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                    >
                      Confirm Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingCurrentRecipe(null);
                        setJsonStatus("Current recipe import canceled.");
                      }}
                      className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                      style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {jsonMode === "export" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setJsonValue(getExportJson(jsonScope))}
                      className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                      style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                    >
                      Refresh JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadJson(jsonScope)}
                      className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                      style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                    >
                      Download File
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleImport}
                      className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                      style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                    >
                      Import Recipes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUploadClick(jsonScope)}
                      className="appearance-none rounded-lg border !border-slate-300 !bg-white !text-slate-900 px-2 py-1 text-xs leading-none hover:!bg-slate-100 active:!bg-slate-200"
                      style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                    >
                      Upload File
                    </button>
                  </>
                )}

                {jsonStatus ? <span className="text-xs text-slate-600">{jsonStatus}</span> : null}
              </div>
            </div>
          ) : null}

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
