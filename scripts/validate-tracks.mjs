#!/usr/bin/env node
/** Wrapper — runs track validation via vitest (TS engine modules). */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.argv[2];

const args = ["vitest", "run", "src/engine/trackValidator.test.ts"];
if (dir) {
  console.log("Note: custom directory not yet supported; validates Forgotten Citadel pack.");
}

const result = spawnSync("npm", ["test", "--", ...args.slice(2)], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
