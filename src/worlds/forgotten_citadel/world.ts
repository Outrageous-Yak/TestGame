import { FORGOTTEN_CITADEL_THEME, FORGOTTEN_CITADEL_TRACKS } from "./tracks";

export default {
  id: "forgotten_citadel",
  name: "Forgotten Citadel",
  desc: "Ancient stone lifts, hollow vaults, and portal machinery",
  menu: { solidColor: "#3d4f5f" },

  scenarios: [
    {
      id: "citadel_path",
      name: "Citadel Path",
      desc: "Ten original puzzles — vertical routing, portals, and shifting tiers",
      scenarioJson: "worlds/forgotten_citadel/scenarios/track01.json",
      theme: FORGOTTEN_CITADEL_THEME,
      tracks: [...FORGOTTEN_CITADEL_TRACKS],
    },
  ],
} as const;
