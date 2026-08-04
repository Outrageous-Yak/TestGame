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
] as const;

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
    backgroundGame: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",
    diceFacesBase: "worlds/rainbow_realm/scenarios/prism_path/assets/dice/faces",
    diceCornerBorder: "worlds/rainbow_realm/scenarios/prism_path/assets/dice/borders/corner_flame_red.png",
    villainsBase: "worlds/rainbow_realm/scenarios/prism_path/assets/villains",
    backgroundLayers: {
      L1: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",
      L2: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",
      L3: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",
      L4: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",
      L5: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",
      L6: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",
      L7: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",
    },
  },
} as const;
