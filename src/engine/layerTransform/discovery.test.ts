import { describe, expect, it } from "vitest";
import { getActiveLayerTransformIds } from "./transformDefinitions";

describe("active transform ids", () => {
  it("lists four canonical symmetry ids", () => {
    const ids = getActiveLayerTransformIds();
    expect(ids).toEqual(["identity", "reflect-horizontal", "symmetry-b", "symmetry-c"]);
  });
});
