import type { Screen } from "../../ui/types";

/** Parse query string (with or without leading `?`). */
export function parseStudioSearch(search: string): URLSearchParams {
  const q = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(q);
}

/** Whether dev affordances (Developer menu) should be visible. */
export function shouldShowDevMenu(search: string): boolean {
  const params = parseStudioSearch(search);
  return params.get("dev") === "true" || params.get("studio") === "true";
}

/** Initial app screen from URL search — only `studio=true` deep-links into Puzzle Studio. */
export function resolveInitialScreen(search: string): Screen {
  const params = parseStudioSearch(search);
  if (params.get("studio") === "true") return "studio";
  return "start";
}
