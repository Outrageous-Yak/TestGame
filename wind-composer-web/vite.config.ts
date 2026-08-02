import { defineConfig } from "vite";

const base = process.env.BASE_PATH ?? "/TestGame/wind-composer/";

export default defineConfig({
  base,
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
