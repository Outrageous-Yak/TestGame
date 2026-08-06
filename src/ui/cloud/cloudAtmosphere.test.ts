import { describe, expect, it } from "vitest";
import { cloudAtmosphereClass } from "./cloudAtmosphere";

describe("cloudAtmosphereClass", () => {
  it("returns scene dim classes per mode", () => {
    expect(cloudAtmosphereClass("cloudy", "scene")).toBe("cloudSceneDim cloudSceneDim--cloudy");
    expect(cloudAtmosphereClass("full_cloud", "scene")).toBe("cloudSceneDim cloudSceneDim--full_cloud");
  });

  it("returns board dim classes per mode", () => {
    expect(cloudAtmosphereClass("cloudy", "board")).toBe("cloudBoardDim cloudBoardDim--cloudy");
    expect(cloudAtmosphereClass("full_cloud", "board")).toBe("cloudBoardDim cloudBoardDim--full_cloud");
  });
});
