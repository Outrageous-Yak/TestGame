import type { CloudMode } from "./computeCloudVisibility";

export function cloudAtmosphereClass(mode: CloudMode, surface: "scene" | "board"): string {
  const base = surface === "scene" ? "cloudSceneDim" : "cloudBoardDim";
  return `${base} ${base}--${mode}`;
}
