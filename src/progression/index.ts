export type {
  MechanicId,
  NextTrackResolution,
  ProgressionMode,
  ProgressionPresentation,
  ProgressionRequirement,
  ProgressionSaveV1,
  ScenarioProgressionMeta,
  TrackCompletionRecord,
  TrackProgressionMeta,
  TrackProgressStatus,
  WorldProgressionMeta,
} from "./types";

export { progressionTrackKey, parseProgressionTrackKey } from "./keys";

export {
  createDefaultProgression,
  loadProgression,
  normalizeProgressionSave,
  resetProgression,
  saveProgression,
  PROGRESSION_STORAGE_KEY,
} from "./storage";

export {
  getContinueTarget,
  getNextAvailableTrack,
  getTrackStatus,
  hasSeenMechanic,
  isScenarioCompleted,
  isScenarioUnlocked,
  isTrackCompleted,
  isTrackUnlocked,
  isWorldCompleted,
  isWorldUnlocked,
  markMechanicSeen,
  markMechanicsIntroducedByTrack,
  recordTrackCompletion,
  requirementsMet,
  resolveScenarioProgressionMode,
  resolveWorldProgressionMode,
} from "./progression";

export { getMechanicIntroduction, MECHANIC_INTRODUCTIONS } from "./mechanicIntroductions";

export { validateProgressionContent, type ProgressionValidationIssue } from "./validate";
