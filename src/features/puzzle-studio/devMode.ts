/** Developer gate — Puzzle Studio is never shown during normal gameplay. */
export function isDevMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("dev") === "true" || params.get("studio") === "true";
}
