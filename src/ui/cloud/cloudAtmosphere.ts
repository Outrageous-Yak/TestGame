import type { CloudMode } from "./computeCloudVisibility";
import type { BoardVisibilityMode } from "./boardVisibility";

export function cloudAtmosphereClass(
  mode: CloudMode | BoardVisibilityMode,
  surface: "scene" | "board"
): string {
  const base = surface === "scene" ? "cloudSceneDim" : "cloudBoardDim";
  return `${base} ${base}--${mode}`;
}
