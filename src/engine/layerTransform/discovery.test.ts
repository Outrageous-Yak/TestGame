import { describe, expect, it } from "vitest";
import { getActiveLayerTransformIds } from "./transformDefinitions";

describe("active transform ids", () => {
  it("lists discovered ids", () => {
    const ids = getActiveLayerTransformIds();
    // eslint-disable-next-line no-console
    console.log("active ids", ids);
    expect(ids).toContain("identity");
    expect(ids.length).toBe(4);
  });
});
