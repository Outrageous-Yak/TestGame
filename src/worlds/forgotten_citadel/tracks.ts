/** Forgotten Citadel track registry */
export const FORGOTTEN_CITADEL_TRACKS = [
  { id: "fc_t01", name: "First Steps", scenarioJson: "worlds/forgotten_citadel/scenarios/track01.json" },
  { id: "fc_t02", name: "Rift Isles", scenarioJson: "worlds/forgotten_citadel/scenarios/track02.json" },
  { id: "fc_t03", name: "Portal Fork", scenarioJson: "worlds/forgotten_citadel/scenarios/track03.json" },
  { id: "fc_t04", name: "False Summit", scenarioJson: "worlds/forgotten_citadel/scenarios/track04.json" },
  { id: "fc_t05", name: "Broken Span", scenarioJson: "worlds/forgotten_citadel/scenarios/track05.json" },
  { id: "fc_t06", name: "Return Valve", scenarioJson: "worlds/forgotten_citadel/scenarios/track06.json" },
  { id: "fc_t07", name: "Helix Coil", scenarioJson: "worlds/forgotten_citadel/scenarios/track07.json" },
  { id: "fc_t08", name: "Gate Order", scenarioJson: "worlds/forgotten_citadel/scenarios/track08.json" },
  { id: "fc_t09", name: "Twin Relics", scenarioJson: "worlds/forgotten_citadel/scenarios/track09.json" },
  { id: "fc_t10", name: "Citadel Engine", scenarioJson: "worlds/forgotten_citadel/scenarios/track10.json" },
  { id: "fc_t11", name: "Track4", scenarioJson: "worlds/forgotten_citadel/scenarios/track11.json" },
  { id: "fc_t12", name: "Deep Vault", scenarioJson: "worlds/forgotten_citadel/scenarios/track12.json" },
  { id: "fc_t13", name: "Twin Currents", scenarioJson: "worlds/forgotten_citadel/scenarios/track13.json" },
  { id: "fc_t14", name: "Twin Currents2", scenarioJson: "worlds/forgotten_citadel/scenarios/fc_t14.json" },
  { id: "fc_t15", name: "Twin Currents3", scenarioJson: "worlds/forgotten_citadel/scenarios/fc_t15.json" },
] as const;

/** Portal Fork only — for Fork visibility-variant scenarios. */
export const PORTAL_FORK_TRACK = FORGOTTEN_CITADEL_TRACKS[2];

export const FORGOTTEN_CITADEL_THEME = {
  palette: {
    L1: "#8B7355",
    L2: "#6B8E6B",
    L3: "#5C7C8A",
    L4: "#7A6B8A",
    L5: "#9A8B6E",
    L6: "#4A5568",
    L7: "#2D3748",
  },
  assets: {
    backgroundGame: "worlds/forgotten_citadel/assets/backgrounds/citadel-bg.png",
    diceFacesBase: "worlds/rainbow_realm/scenarios/prism_path/assets/dice/faces",
    diceCornerBorder: "worlds/rainbow_realm/scenarios/prism_path/assets/dice/borders/corner_flame_red.png",
    villainsBase: "worlds/rainbow_realm/scenarios/prism_path/assets/villains",
    hexTile: "worlds/forgotten_citadel/assets/tiles/hex-normal.png",
    hexTileMovable: "worlds/forgotten_citadel/assets/tiles/hex-normal-white.png",
    solidGoldGoal: true,
    backgroundMusic: "worlds/forgotten_citadel/assets/audio/citadel-bgm.mp3",
    backgroundLayers: {
      L1: "worlds/forgotten_citadel/assets/backgrounds/board-bg.png",
      L2: "worlds/forgotten_citadel/assets/backgrounds/board-bg.png",
      L3: "worlds/forgotten_citadel/assets/backgrounds/board-bg.png",
      L4: "worlds/forgotten_citadel/assets/backgrounds/board-bg.png",
      L5: "worlds/forgotten_citadel/assets/backgrounds/board-bg.png",
      L6: "worlds/forgotten_citadel/assets/backgrounds/board-bg.png",
      L7: "worlds/forgotten_citadel/assets/backgrounds/board-bg.png",
    },
  },
} as const;
