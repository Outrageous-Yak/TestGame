import type { MechanicId } from "./types";

export type MechanicIntroduction = {
  id: MechanicId;
  title: string;
  description: string;
  image?: string;
};

/** Small registry — Step 2 stores metadata only; no popup UI yet. */
export const MECHANIC_INTRODUCTIONS: Record<MechanicId, MechanicIntroduction> = {
  basic_movement: {
    id: "basic_movement",
    title: "Movement",
    description: "Tap adjacent hexes to move. Each move advances the board.",
  },
  missing_hexes: {
    id: "missing_hexes",
    title: "Missing hexes",
    description: "Some tiles are absent from the board. You cannot stand on them.",
  },
  portals: {
    id: "portals",
    title: "Portals",
    description: "Step on a portal to travel between layers.",
  },
  moving_rows: {
    id: "moving_rows",
    title: "Moving rows",
    description: "Rows shift after each move. Plan around the motion.",
  },
  partly_cloudy: {
    id: "partly_cloudy",
    title: "Cloud cover",
    description: "Visibility variants hide parts of the board until you explore.",
  },
  encounter_cards: {
    id: "encounter_cards",
    title: "Encounters",
    description: "Risk cards and villain hexes require a lucky roll to continue.",
  },
};
