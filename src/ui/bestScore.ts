export type HoverPreview = { fromId: string | null; destId: string | null; destLayer: number | null };
const KEY = "__hoverPreview";

export function getHoverPreview(): HoverPreview {
  return ((window as any)[KEY] ??= { fromId: null, destId: null, destLayer: null });
}
export function setHoverPreview(next: HoverPreview) { (window as any)[KEY] = next; }
export function clearHoverPreview() { setHoverPreview({ fromId: null, destId: null, destLayer: null }); }
