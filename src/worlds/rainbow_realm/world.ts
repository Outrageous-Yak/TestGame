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

backgroundLayers: {
  L1: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/bg-layer1.jpg",
  L2: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/bg-layer2.jpg",
  L3: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/bg-layer3.jpg",
  L4: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/bg-layer4.jpg",
  L5: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/bg-layer5.jpg",
  L6: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/bg-layer6.jpg",
  L7: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/bg-layer7.jpg",
},

        },
      },
    },
  ],
} as const;
