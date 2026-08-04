import { shouldShowDevMenu } from "./studioRouting";

/** Developer gate — Puzzle Studio menu is never shown during normal gameplay. */
export function isDevMode(): boolean {
  if (typeof window === "undefined") return false;
  return shouldShowDevMenu(window.location.search);
}

export { shouldShowDevMenu, resolveInitialScreen, parseStudioSearch } from "./studioRouting";
