import { FORGOTTEN_CITADEL_THEME, FORGOTTEN_CITADEL_TRACKS, PORTAL_FORK_TRACK } from "./tracks";

const PORTAL_FORK_JSON = "worlds/forgotten_citadel/scenarios/track03.json";

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
    {
      id: "citadel_partly_cloudy",
      name: "Partly Cloudy",
      desc: "Mist drifts through the citadel. Your position, possible moves, and nearby stone paths remain visible.",
      cloudMode: "cloudy",
      scenarioJson: "worlds/forgotten_citadel/scenarios/track01.json",
      theme: FORGOTTEN_CITADEL_THEME,
      tracks: [...FORGOTTEN_CITADEL_TRACKS],
    },
    {
      id: "citadel_cloudy",
      name: "Cloudy",
      desc: "Dense storm clouds conceal the citadel. Only your position, possible moves, portals, and the goal remain visible.",
      cloudMode: "full_cloud",
      scenarioJson: "worlds/forgotten_citadel/scenarios/track01.json",
      theme: FORGOTTEN_CITADEL_THEME,
      tracks: [...FORGOTTEN_CITADEL_TRACKS],
    },
    {
      id: "citadel_fork",
      name: "Fork",
      desc: "Portal Fork — clear visibility.",
      scenarioJson: PORTAL_FORK_JSON,
      theme: FORGOTTEN_CITADEL_THEME,
      tracks: [PORTAL_FORK_TRACK],
    },
    {
      id: "citadel_fork_partly_cloudy",
      name: "Fork Partly Cloudy",
      desc: "Portal Fork with mist — nearby paths stay visible.",
      cloudMode: "cloudy",
      scenarioJson: PORTAL_FORK_JSON,
      theme: FORGOTTEN_CITADEL_THEME,
      tracks: [PORTAL_FORK_TRACK],
    },
    {
      id: "citadel_fork_cloudy",
      name: "Fork Cloudy",
      desc: "Portal Fork in dense clouds — only your tile, moves, portals, and goal show.",
      cloudMode: "full_cloud",
      scenarioJson: PORTAL_FORK_JSON,
      theme: FORGOTTEN_CITADEL_THEME,
      tracks: [PORTAL_FORK_TRACK],
    },
  ],
} as const;
