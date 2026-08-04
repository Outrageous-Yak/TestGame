import { neighborBoardSlots } from "./boardNeighbors";
import { allBoardSlots, slotKey } from "./boardSlot";
import type { BoardSlot } from "./types";

export type SlotTransformMap = Map<string, BoardSlot>;

const VERTICES = allBoardSlots();

function neighborIndices(index: number): number[] {
  const slot = VERTICES[index];
  const out: number[] = [];
  for (let j = 0; j < VERTICES.length; j++) {
    const other = VERTICES[j];
    if (neighborBoardSlots(slot).some((n) => n.row === other.row && n.col === other.col)) {
      out.push(j);
    }
  }
  return out;
}

function signature(index: number): string {
  const neigh = neighborIndices(index);
  const degrees = neigh.map((n) => neighborIndices(n).length).sort((a, b) => a - b);
  return `${neigh.length}:${degrees.join(",")}`;
}

const SIGNATURES = VERTICES.map((_, i) => signature(i));

function indexToMap(perm: number[]): SlotTransformMap {
  const map: SlotTransformMap = new Map();
  for (let i = 0; i < VERTICES.length; i++) {
    map.set(slotKey(VERTICES[i]), VERTICES[perm[i]]);
  }
  return map;
}

function isValidPermutation(perm: number[]): boolean {
  for (let i = 0; i < VERTICES.length; i++) {
    for (const j of neighborIndices(i)) {
      if (!neighborIndices(perm[i]).includes(perm[j])) return false;
    }
  }
  return true;
}

function fingerprint(perm: number[]): string {
  return perm.map((p) => String(p)).join(",");
}

export function discoverAutomorphismPermutations(limit = 200): number[][] {
  const n = VERTICES.length;
  const order = [...Array(n).keys()].sort((a, b) => SIGNATURES[a].localeCompare(SIGNATURES[b]));
  const found: number[][] = [];
  const seen = new Set<string>();
  const perm = new Array<number>(n).fill(-1);
  const used = new Array<boolean>(n).fill(false);

  const backtrack = (depth: number) => {
    if (found.length >= limit) return;
    if (depth === n) {
      if (!isValidPermutation(perm)) return;
      const fp = fingerprint(perm);
      if (seen.has(fp)) return;
      seen.add(fp);
      found.push([...perm]);
      return;
    }

    const vertex = order[depth];
    for (let candidate = 0; candidate < n; candidate++) {
      if (used[candidate]) continue;
      if (SIGNATURES[vertex] !== SIGNATURES[candidate]) continue;

      let ok = true;
      for (let earlier = 0; earlier < depth; earlier++) {
        const earlierVertex = order[earlier];
        const mappedEarlier = perm[earlierVertex];
        const adjacent = neighborIndices(vertex).includes(earlierVertex);
        const mappedAdjacent = neighborIndices(candidate).includes(mappedEarlier);
        if (adjacent !== mappedAdjacent) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      perm[vertex] = candidate;
      used[candidate] = true;
      backtrack(depth + 1);
      used[candidate] = false;
      perm[vertex] = -1;
    }
  };

  backtrack(0);
  return found;
}

export function permutationsToMaps(perms: number[][]): SlotTransformMap[] {
  return perms.map(indexToMap);
}

export function preservesAdjacency(map: SlotTransformMap): boolean {
  for (const slot of VERTICES) {
    const mappedFrom = map.get(slotKey(slot));
    if (!mappedFrom) return false;

    const mappedNeighborKeys = new Set(
      neighborBoardSlots(slot)
        .map((n) => map.get(slotKey(n)))
        .filter((n): n is BoardSlot => !!n)
        .map(slotKey)
    );

    for (const neighbor of neighborBoardSlots(mappedFrom)) {
      if (!mappedNeighborKeys.has(slotKey(neighbor))) return false;
    }
  }
  return true;
}

export function applySlotMap(slot: BoardSlot, map: SlotTransformMap): BoardSlot {
  const mapped = map.get(slotKey(slot));
  if (!mapped) throw new Error(`Missing mapping for ${slotKey(slot)}`);
  return mapped;
}

function isIdentityMap(map: SlotTransformMap): boolean {
  return VERTICES.every((s) => {
    const t = map.get(slotKey(s))!;
    return t.row === s.row && t.col === s.col;
  });
}

export function composeMaps(a: SlotTransformMap, b: SlotTransformMap): SlotTransformMap {
  const out: SlotTransformMap = new Map();
  for (const slot of VERTICES) {
    out.set(slotKey(slot), applySlotMap(applySlotMap(slot, a), b));
  }
  return out;
}

export function mapFingerprint(map: SlotTransformMap): string {
  return VERTICES.map((s) => {
    const t = applySlotMap(s, map);
    return `${s.row},${s.col}->${t.row},${t.col}`;
  }).join("|");
}

export function classifyMap(map: SlotTransformMap): { isIdentity: boolean; order: number } {
  if (isIdentityMap(map)) return { isIdentity: true, order: 1 };
  let power = map;
  for (let order = 2; order <= 12; order++) {
    if (isIdentityMap(power)) return { isIdentity: false, order };
    power = composeMaps(power, map);
  }
  return { isIdentity: false, order: 12 };
}

export function discoverUniqueAutomorphismMaps(limit = 200): SlotTransformMap[] {
  const perms = discoverAutomorphismPermutations(limit);
  const maps = permutationsToMaps(perms);
  const unique = new Map<string, SlotTransformMap>();
  for (const map of maps) {
    if (!preservesAdjacency(map)) continue;
    unique.set(mapFingerprint(map), map);
  }
  return [...unique.values()];
}

export { isIdentityMap };
