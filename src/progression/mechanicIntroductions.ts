import type { MechanicId } from "./types";

export type MechanicIntroduction = {
  id: MechanicId;
  title: string;
  description: string;
  image?: string;
};

/** Small registry for future tutorial popups — metadata only in Step 2. */
export const MECHANIC_INTRODUCTIONS: Record<MechanicId, MechanicIntroduction> = {
  basic_movement: {
    id: "basic_movement",
    title: "Movement",
    description: "Tap a neighbouring hex to move. Each move advances the board.",
  },
  missing_hexes: {
    id: "missing_hexes",
    title: "Missing hexes",
    description: "Some positions have no tile. Stepping onto a missing hex costs a turn.",
  },
  portals: {
    id: "portals",
    title: "Portals",
    description: "Land on a portal to travel to another layer or position.",
  },
  moving_rows: {
    id: "moving_rows",
    title: "Moving rows",
    description: "After each move, some rows shift left or right.",
  },
  partly_cloudy: {
    id: "partly_cloudy",
    title: "Partly cloudy",
    description: "Clouds hide distant tiles. Nearby paths remain visible.",
  },
  encounter_cards: {
    id: "encounter_cards",
    title: "Encounter cards",
    description: "Risk cards can trigger a villain encounter — roll a 6 to continue.",
  },
};

export function getMechanicIntroduction(id: MechanicId): MechanicIntroduction {
  return MECHANIC_INTRODUCTIONS[id];
}
