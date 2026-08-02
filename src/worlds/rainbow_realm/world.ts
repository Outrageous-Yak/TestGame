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
            "worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",

          diceFacesBase:
            "worlds/rainbow_realm/scenarios/prism_path/assets/dice/faces",

          diceCornerBorder:
            "worlds/rainbow_realm/scenarios/prism_path/assets/dice/borders/corner_flame_red.png",

          villainsBase:
            "worlds/rainbow_realm/scenarios/prism_path/assets/villains",

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
      },

      // ✅ TRACKS (same theme, different JSON boards)
      tracks: [
        { id: "t1", name: "Track 1", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario.json" },
        { id: "t2", name: "Track 2", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario2.json" },
        { id: "t3", name: "Track 3", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario3.json" },
        { id: "t4", name: "Track 4", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario4.json" },
        { id: "t5", name: "Track 5", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario5.json" },
        { id: "t6", name: "Track 6", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario5.json" },
        { id: "t7", name: "Track 7", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario6.json" },
        { id: "t8", name: "Track 8", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario7.json" },
        { id: "t9", name: "Track 9", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario8.json" },
        { id: "t10", name: "Track 10", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario9.json" },
        { id: "t11", name: "Track 11", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario10.json" },
        { id: "t12", name: "Track 12", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario11.json" },
        { id: "t13", name: "Brain Melter I", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario12.json" },
        { id: "t14", name: "Brain Melter II", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario13.json" },
        { id: "t15", name: "Brain Melter III", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario14.json" },
        { id: "t16", name: "Brain Melter IV", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario15.json" },
        { id: "t17", name: "Brain Melter V", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario16.json" },
        { id: "t18", name: "Brain Melter VI", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario17.json" },
        { id: "t19", name: "Brain Melter VII", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario18.json" },
        { id: "t20", name: "Brain Melter VIII", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario19.json" },
        { id: "t21", name: "Brain Melter IX", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario20.json" },
        { id: "t22", name: "Brain Melter X", scenarioJson: "worlds/rainbow_realm/scenarios/prism_path/scenario21.json" },
      ],
    },
  ],
} as const;
