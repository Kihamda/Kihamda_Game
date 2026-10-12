export type CatalogState = { query: string; filter: "all" | "released" };

export function readCatalogState(search: string): CatalogState {
  const params = new URLSearchParams(search);
  return { query: params.get("q") ?? "", filter: params.get("filter") === "released" ? "released" : "all" };
}

export function catalogSearch(state: CatalogState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.filter === "released") params.set("filter", "released");
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function catalogHref(state: CatalogState): string {
  return `/${catalogSearch(state)}#works`;
}
