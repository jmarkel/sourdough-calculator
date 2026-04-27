import { useEffect, useState } from "react";

export type AppPage = "calculator" | "results" | "recipes" | "settings";

const validPages = new Set<AppPage>(["calculator", "results", "recipes", "settings"]);

function parseHashPage(hash: string): AppPage {
  const path = hash.replace(/^#\/?/, "").trim().toLowerCase();
  return validPages.has(path as AppPage) ? (path as AppPage) : "calculator";
}

export function useHashPage() {
  const [page, setPageState] = useState<AppPage>(() =>
    typeof window === "undefined" ? "calculator" : parseHashPage(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setPageState(parseHashPage(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setPage = (nextPage: AppPage) => {
    if (typeof window === "undefined") return;
    const nextHash = `#/${nextPage}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
      return;
    }
    setPageState(nextPage);
  };

  return { page, setPage };
}
