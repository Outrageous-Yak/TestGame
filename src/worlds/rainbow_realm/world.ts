// src/worlds/rainbow_realm/world.ts
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

      theme: {
        palette: {
          L1: "#FF4D7D",
          L2: "#FF9A3D",
          L3: "#FFD35A",
          L4: "#4BEE9C",
          L5: "#3ED7FF",
          L6: "#5C7CFF",
          L7: "#B66BFF",
        },
        assets: {
          backgroundGame:
            "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",
          diceFacesBase:
            "worlds/rainbow_realm/scenarios/prism_path/assets/dice/faces",
          diceCornerBorder:
            "worlds/rainbow_realm/scenarios/prism_path/assets/dice/borders/corner_flame_red.png",
          villainsBase:
            "worlds/rainbow_realm/scenarios/prism_path/assets/villains",

          // ✅ HEX TILE TEXTURE (this is the important part)
          hexTile:
            "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/AlbedoBase_XL_Image_features_a_geometric_pattern_composed_of_h_0.jpg",
        },
      },
    },
  ],
} as const;
