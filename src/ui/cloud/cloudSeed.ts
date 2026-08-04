/** Stable 32-bit FNV-1a hash for deterministic cloud variation. */
export function hashCloudSeed(parts: string[]): number {
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const CLOUD_TEMPLATE_COUNT = 8;
export const PARTIAL_PATTERN_COUNT = 7;

export type CloudDensity = "partial" | "full";

export interface CloudSeedValues {
  templateIndex: number;
  partialPatternIndex: number;
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
  driftX: number;
  driftY: number;
  durationSec: number;
  innerDurationSec: number;
  wispOffset: number;
}

const SCALE_MIN = 0.88;
const SCALE_MAX = 1.14;
const ROT_MIN = -7;
const ROT_MAX = 7;
const DURATION_MIN = 18;
const DURATION_MAX = 32;
const INNER_DUR_MIN = 24;
const INNER_DUR_MAX = 40;

function pickRange(hash: number, min: number, max: number, salt: number): number {
  const span = max - min;
  const v = ((hash ^ salt) >>> 0) % 1000;
  return min + (v / 1000) * span;
}

function pickInt(hash: number, count: number, salt: number): number {
  return ((hash ^ salt) >>> 0) % count;
}

/**
 * Deterministic cloud identity per scenario/layer/hex.
 * Same inputs always yield the same template and motion params.
 */
export function deriveCloudSeed(
  scenarioId: string,
  layerId: string,
  hexId: string,
  density: CloudDensity
): CloudSeedValues {
  const base = hashCloudSeed([scenarioId, layerId, hexId, density]);
  const templateIndex = pickInt(base, CLOUD_TEMPLATE_COUNT, 0x9e3779b1);
  const partialPatternIndex = pickInt(base, PARTIAL_PATTERN_COUNT, 0x85ebca6b);

  return {
    templateIndex,
    partialPatternIndex,
    scaleX: pickRange(base, SCALE_MIN, SCALE_MAX, 0x517cc1b7),
    scaleY: pickRange(base, SCALE_MIN, SCALE_MAX, 0x6ed9eb1f),
    rotationDeg: pickRange(base, ROT_MIN, ROT_MAX, 0x1b873593),
    driftX: pickRange(base, -6, 6, 0xdeadbeef),
    driftY: pickRange(base, -4, 4, 0xcafebabe),
    durationSec: pickRange(base, DURATION_MIN, DURATION_MAX, 0x31415926),
    innerDurationSec: pickRange(base, INNER_DUR_MIN, INNER_DUR_MAX, 0x27182818),
    wispOffset: pickRange(base, 0, 100, 0x16180339),
  };
}

export function cloudSeedClassName(seed: CloudSeedValues, density: CloudDensity): string {
  const tpl = `cloudTpl${seed.templateIndex}`;
  const partial =
    density === "partial" ? `cloudPartial${seed.partialPatternIndex}` : "";
  return [tpl, partial].filter(Boolean).join(" ");
}
