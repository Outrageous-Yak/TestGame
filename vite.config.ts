import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/TestGame/",
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/engine/**/*.test.ts", "src/features/sprite-builder/**/*.test.ts"],
  },
});
