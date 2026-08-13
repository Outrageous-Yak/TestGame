import type { GameState, Scenario, Hex } from "../../engine/types";
import { assertScenario } from "../../engine/scenario";
import { ROW_LENS } from "../../engine/board";
import { isEncounterTier, resolveEncounterId } from "../../engine/encounters/redEncounter";
import type {
  Coord,
  CardKey,
  CardTrigger,
  VillainKey,
  VillainTrigger,
} from "../types";

export const scenarioRef: { current: Scenario | null } = { current: null };

export function ensureScenario(st: any): any {
  if (st && !st.scenario && scenarioRef.current) {
    st.scenario = scenarioRef.current;
  }
  return st;
}

export function idToCoord(id: string): Coord | null {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
}

export function toPublicUrl(p: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const cleanBase = String(base).endsWith("/") ? String(base) : `${base}/`;
  const cleanPath = String(p).replace(/^\/+/, "");
  return cleanBase + cleanPath;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(toPublicUrl(path));
  if (!res.ok) throw new Error(`Failed to load: ${path}`);
  return res.json();
}

export async function loadScenario(path: string): Promise<Scenario> {
  const cacheKey = "20260801e";
  const url = path + (path.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(cacheKey);
  const s = await fetchJson<Scenario>(url);
  assertScenario(s as any);
  return s;
}

export function getHexFromState(state: GameState | null, id: string): Hex | undefined {
  if (!state) return undefined;
  const m: any = (state as any).hexesById;
  if (m?.get) return m.get(id);
  return (state as any).hexesById?.[id];
}

export function isBlockedOrMissing(hex: any): { blocked: boolean; missing: boolean } {
  if (!hex) return { blocked: true, missing: true };
  return { missing: !!hex.missing, blocked: !!hex.blocked };
}

export function layerCssVar(n: number) {
  const clamped = Math.max(1, Math.min(7, Math.floor(n || 1)));
  return `var(--L${clamped})`;
}

/** Brighter accent for reach pulse on hexes with a card trigger (matches deck card identity). */
export function cardAccentColor(card: CardKey): string {
  switch (card) {
    case "cosmic":
      return "#4a5fd4";
    case "risk":
      return "#e8384f";
    case "terrain":
      return "#1fa88a";
    case "shadow":
      return "#9b7fd4";
  }
}

export function reachPulseGlow(layer: number, card: CardKey | null): string {
  return card ? cardAccentColor(card) : layerCssVar(layer);
}

export function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function findGoalId(s: any, fallbackLayer: number): string | null {
  const direct =
    s?.goalHexId ??
    s?.goalId ??
    s?.exitHexId ??
    s?.exitId ??
    s?.targetHexId ??
    s?.targetId ??
    s?.winHexId ??
    s?.winId ??
    null;

  if (typeof direct === "string" && /^L\d+-R\d+-C\d+$/.test(direct)) return direct;

  const gc = s?.goal ?? s?.exit ?? s?.target ?? null;
  if (gc && typeof gc === "object") {
    const layer = Number(gc.layer ?? fallbackLayer);
    const row = Number(gc.row ?? gc.r);
    const col = Number(gc.col ?? gc.c);
    if (Number.isFinite(layer) && Number.isFinite(row) && Number.isFinite(col)) {
      return `L${layer}-R${row}-C${col}`;
    }
  }
  return null;
}

export function findFirstPlayableHexId(st: GameState | null, layer: number): string | null {
  for (let r = 0; r < ROW_LENS.length; r++) {
    const len = ROW_LENS[r];
    for (let c = 0; c < len; c++) {
      const id = "L" + layer + "-R" + r + "-C" + c;
      const hex = getHexFromState(st, id) as any;
      if (hex && !hex.blocked && !hex.missing) return id;
    }
  }
  return null;
}

/** Place a hex on the shared 14-column honeycomb grid (odd rows offset by half a step). */
export function hexGridPlacement(row: number, col: number): { gridColumn: string; gridRow: number } {
  const len = ROW_LENS[row] ?? 7;
  const isOffset = len === 6;
  const gridCol = isOffset ? col * 2 + 2 : col * 2 + 1;
  return { gridColumn: gridCol + " / span 2", gridRow: row + 1 };
}

export function parseCardTriggersFromScenario(s: any): CardTrigger[] {
  const src = (Array.isArray(s?.cardTriggers) && s.cardTriggers) || [];
  const allowed: CardKey[] = ["cosmic", "risk", "terrain", "shadow"];

  const toZeroBasedRow = (r: number) => (r >= 1 && r <= 7 ? r - 1 : r);
  const toZeroBasedCol = (c: number) => (c >= 1 && c <= 7 ? c - 1 : c);

  const out: CardTrigger[] = [];
  const usedIds = new Set<string>();

  for (const raw of src) {
    if (!raw || typeof raw !== "object") continue;

    const cardRaw = String(raw.card ?? raw.key ?? "cosmic");
    const card = (allowed.includes(cardRaw as any) ? cardRaw : "cosmic") as CardKey;

    const layer = Number(raw.layer ?? 1);
    let row = toZeroBasedRow(Number(raw.row ?? 0));
    let col = toZeroBasedCol(Number(raw.col ?? 0));

    if (!Number.isFinite(layer) || !Number.isFinite(row) || !Number.isFinite(col)) continue;

    let id = resolveEncounterId(raw.id, layer, row, col);
    // Avoid collisions when multiple legacy rows somehow share coords after bad data.
    if (usedIds.has(id)) {
      let n = 2;
      while (usedIds.has(`${id}__${n}`)) n += 1;
      id = `${id}__${n}`;
    }
    usedIds.add(id);

    const tierRaw = raw.encounterTier ?? raw.tier;
    const encounterTier = isEncounterTier(Number(tierRaw)) ? (Number(tierRaw) as 1 | 2 | 3 | 4) : undefined;

    out.push({
      id,
      card,
      layer,
      row,
      col,
      ...(encounterTier ? { encounterTier } : {}),
    });
  }

  return out;
}

export function pickRiskVillain(): VillainKey {
  const pool: VillainKey[] = ["bad1", "bad2", "bad3"];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function portalTransitionAt(
  st: any,
  id: string
): null | {
  type: "UP" | "DOWN";
  to: { layer: number; row: number; col: number };
} {
  const map = st?.transitionsByFromId;
  if (map?.get) {
    const t = map.get(id);
    if (t?.to) {
      return {
        type: t.type === "DOWN" ? "DOWN" : "UP",
        to: {
          layer: Number(t.to.layer),
          row: Number(t.to.row),
          col: Number(t.to.col),
        },
      };
    }
  }

  const transitions = st?.scenario?.transitions;
  if (!transitions) return null;

  const c = idToCoord(id);
  if (!c) return null;

  for (const t of transitions) {
    const from = t?.from;
    if (!from) continue;

    const fl = Number(from.layer);
    const fr = Number(from.row);
    const fc = Number(from.col);

    if (!Number.isFinite(fl) || !Number.isFinite(fr) || !Number.isFinite(fc)) continue;
    if (fl !== c.layer || fr !== c.row || fc !== c.col) continue;

    const type: "UP" | "DOWN" = t?.type === "DOWN" ? "DOWN" : "UP";
    const to = t?.to ?? {};

    const tl = Number(to.layer);
    const tr = Number(to.row);
    const tc = Number(to.col);

    return {
      type,
      to: {
        layer: Number.isFinite(tl) ? tl : type === "UP" ? c.layer + 1 : c.layer - 1,
        row: Number.isFinite(tr) ? tr : c.row,
        col: Number.isFinite(tc) ? tc : c.col,
      },
    };
  }

  return null;
}

export function parseVillainsFromScenario(s: any): VillainTrigger[] {
  const src =
    (Array.isArray(s?.villains) && s.villains) ||
    (Array.isArray(s?.villainTriggers) && s.villainTriggers) ||
    (Array.isArray(s?.encounters) && s.encounters) ||
    (Array.isArray(s?.triggers) && s.triggers) ||
    [];

  const allowed: VillainKey[] = ["bad1", "bad2", "bad3", "bad4"];
  const out: VillainTrigger[] = [];

  const toZeroBasedRow = (r: number) => (r >= 1 && r <= 7 ? r - 1 : r);
  const toZeroBasedCol = (c: number) => (c >= 1 && c <= 7 ? c - 1 : c);

  for (const raw of src) {
    if (!raw || typeof raw !== "object") continue;

    const base = raw.from && typeof raw.from === "object" ? raw.from : raw;

    const keyRaw = String(raw.key ?? raw.villainKey ?? raw.id ?? base.key ?? "bad1");
    const key = (allowed.includes(keyRaw as any) ? keyRaw : "bad1") as VillainKey;

    const layer = Number(base.layer ?? base.L ?? raw.layer ?? raw.L ?? 1);

    let row = Number(base.row ?? base.r ?? raw.row ?? raw.r ?? 0);
    row = toZeroBasedRow(row);

    let cols: "any" | number[] | undefined = undefined;
    const c = base.cols ?? base.col ?? base.c ?? raw.cols ?? raw.col ?? raw.c;

    if (c === "any") {
      cols = "any";
    } else if (Array.isArray(c)) {
      cols = c
        .map((n: any) => toZeroBasedCol(Number(n)))
        .filter((n: any) => Number.isFinite(n));
    } else if (Number.isFinite(Number(c))) {
      cols = [toZeroBasedCol(Number(c))];
    }

    if (!Number.isFinite(layer) || !Number.isFinite(row)) continue;
    out.push({ key, layer, row, cols });
  }

  return out;
}
