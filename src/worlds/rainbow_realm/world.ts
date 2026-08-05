// src/worlds/rainbow_realm/world.ts

import { PRISM_PATH_THEME, PRISM_PATH_TRACKS } from "./prismPathShared";

export default {
  id: "rainbow_realm",
  name: "Rainbow Realm",
  desc: "Bright, magical rainbow world",
  menu: { solidColor: "#1e66ff" },

  scenarios: [
    {
      id: "prism_path",
      name: "Prism Path",
      desc: "First rainbow scenario",
      scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario.json",
      theme: PRISM_PATH_THEME,
      tracks: [...PRISM_PATH_TRACKS],
    },
    {
      id: "cloudy",
      name: "Partly Cloudy",
      desc: "Navigate through shifting cloud banks. Your position, possible moves, and the nearby path remain visible.",
      cloudMode: "cloudy",
      scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario.json",
      theme: PRISM_PATH_THEME,
      tracks: [...PRISM_PATH_TRACKS],
    },
    {
      id: "full_cloud",
      name: "Cloudy",
      desc: "The board is hidden beneath dense clouds. Only your position, possible moves, portals, and the goal remain visible.",
      cloudMode: "full_cloud",
      scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario.json",
      theme: PRISM_PATH_THEME,
      tracks: [...PRISM_PATH_TRACKS],
    },
  ],
} as const;
