import type { CardColor } from "../types";

/** Authoring vs runtime capability — planner must not pretend unfinished mechanics exist. */
export type SupportLevel = {
  authoring: boolean;
  runtime: boolean;
  note?: string;
};

export const CARD_RUNTIME_SUPPORT: Record<CardColor, SupportLevel> = {
  RED: { authoring: true, runtime: true, note: "Encounter trigger (cosmic)" },
  BLUE: { authoring: true, runtime: false, note: "Terrain — visual/audio only" },
  GREEN: { authoring: true, runtime: false, note: "Risk — visual/audio only" },
  BLACK: { authoring: true, runtime: false, note: "Shadow — visual/audio only" },
  RANDOM: {
    authoring: true,
    runtime: false,
    note: "Random RED/BLUE/GREEN/BLACK — resolution deferred",
  },
  HIDDEN: {
    authoring: true,
    runtime: true,
    note: "Predetermined ? — exports resolved color to runtime",
  },
};

export const HIDDEN_PORTAL_RUNTIME: SupportLevel = {
  authoring: true,
  runtime: false,
  note: "Hidden portal metadata preserved; runtime concealment deferred",
};

export const HIDDEN_CARD_RUNTIME: SupportLevel = {
  authoring: true,
  runtime: false,
  note: "Hidden card flag is planner metadata; runtime concealment deferred",
};
