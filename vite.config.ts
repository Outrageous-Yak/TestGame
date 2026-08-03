import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/TestGame/",
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["src/features/sprite-builder/__tests__/setup.ts"],
    include: ["src/engine/**/*.test.ts", "src/features/sprite-builder/**/*.test.ts"],
  },
});
