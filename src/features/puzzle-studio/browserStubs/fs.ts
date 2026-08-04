/** Browser stub — Node fs APIs are only used by CLI/test file helpers in trackValidator. */
export function readFileSync(): string {
  throw new Error("readFileSync is not available in the browser");
}

export function existsSync(): boolean {
  return false;
}

export function readdirSync(): string[] {
  return [];
}
