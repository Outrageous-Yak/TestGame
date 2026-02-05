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
      scenarioJson:
        "worlds/rainbow_realm/scenarios/prism_path/scenario.json",

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
            "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/IMG_4163.jpeg",

          diceFacesBase:
            "worlds/rainbow_realm/scenarios/prism_path/assets/dice/faces",

          diceCornerBorder:
            "worlds/rainbow_realm/scenarios/prism_path/assets/dice/borders/corner_flame_red.png",

          villainsBase:
            "worlds/rainbow_realm/scenarios/prism_path/assets/villains",

          backgroundLayers: {
            L1: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/IMG_4163.jpeg",
            L2: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/IMG_4163.jpeg",
            L3: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/IMG_4163.jpeg",
            L4: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/IMG_4163.jpeg",
            L5: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/IMG_4163.jpeg",
            L6: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/IMG_4163.jpeg",
            L7: "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/bg-layer7.jpg", 
          },
        },
      },

      // ✅ TRACKS (same theme, different JSON boards)
      tracks: [
        { id: "t1", name: "Track 1", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario.json" },
        { id: "t2", name: "Track 2", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario2.json" },
        { id: "t3", name: "Track 3", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario3.json" },
        { id: "t4", name: "Track 4", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario4.json" },
        { id: "t5", name: "Track 5", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario4.json" },
        { id: "t6", name: "Track 6", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario5.json" },
        { id: "t7", name: "Track 7", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario6.json" },
        { id: "t8", name: "Track 8", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario7.json" },
        { id: "t9", name: "Track 9", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario8.json" },
        { id: "t10", name: "Track 10", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario9.json" }
      
      ],
    },
  ],
} as const;
