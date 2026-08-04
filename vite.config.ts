import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

const root = path.dirname(fileURLToPath(import.meta.url));

const browserOnlyAliases = process.env.VITEST
  ? {}
  : {
      fs: path.resolve(root, "src/features/puzzle-studio/browserStubs/fs.ts"),
      path: path.resolve(root, "src/features/puzzle-studio/browserStubs/path.ts"),
    };

export default defineConfig({
  base: "/TestGame/",
  plugins: [react()],
  resolve: {
    alias: browserOnlyAliases,
  },
  test: {
    environment: "node",
    include: [
      "src/engine/**/*.test.ts",
      "src/features/sprite-builder/**/*.test.ts",
      "src/features/puzzle-studio/**/*.test.ts",
      "src/ui/**/*.test.ts",
    ],
  },
});
