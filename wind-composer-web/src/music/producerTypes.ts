export type SectionType =
  | "Intro"
  | "Groove"
  | "Development"
  | "Build"
  | "Drop"
  | "Breakdown"
  | "Recovery"
  | "Outro"
  | "Flow";

export type ProducerAction =
  | "MaintainGroove"
  | "AddClosedHats"
  | "AddOpenHat"
  | "ThinPercussion"
  | "IncreaseBassActivity"
  | "SimplifyBass"
  | "BeginBuild"
  | "TriggerDrop"
  | "BeginBreakdown"
  | "RecoverGroove"
  | "AddFill"
  | "ReducePads"
  | "ReduceAtmosphere"
  | "IncreaseSpatialDepth"
  | "CreateSilenceBeat"
  | "ReturnCorePattern";

export interface ProducerIntent {
  energyTarget: number;
  tensionTarget: number;
  grooveIntensity: number;
  rhythmicDensity: number;
  bassActivity: number;
  harmonicComplexity: number;
  melodicPresence: number;
  atmosphericDensity: number;
  brightness: number;
  warmth: number;
  spatialDepth: number;
  surpriseProbability: number;
  transitionUrgency: number;
  repetitionTolerance: number;
  silenceProbability: number;
  sectionPreference: SectionType;
  preferredNextAction: ProducerAction;
  targetBpm: number;
  padGainLimit: number;
  atmosphereLimit: number;
  noiseBudget: number;
  sidechainAmount: number;
  kickDryness: number;
  allowPads: boolean;
  allowLeads: boolean;
}

export interface MusicalEvaluation {
  grooveScore: number;
  repetitionScore: number;
  clarityScore: number;
  tensionScore: number;
  contrastScore: number;
  densityScore: number;
  styleAuthenticityScore: number;
  melodicCoherenceScore: number;
  bassKickLockScore: number;
  noiseRiskScore: number;
}

export interface ProducerState {
  bar: number;
  measure: number;
  section: SectionType;
  tension: number;
  lastAction: ProducerAction;
  lastActionBar: number;
  lastEvaluationBar: number;
  startupGroovePhase: number;
  bassPatternFamily: string;
  drumPatternFamily: string;
  lastProducerNotice: string;
}

export interface ProducerTickContext {
  styleName: string;
  bar: number;
  measure: number;
  beat: number;
  energy: number;
  section: string;
  danceEffectsEnabled: boolean;
  weatherInfluence: string;
  grooveStrength: string;
  variation: string;
  windKmh: number;
  gust: boolean;
  trendWindDelta: number;
  trendPressureDelta: number;
  stormLikelihood: number;
  bpmMin: number;
  bpmMax: number;
  currentBpm: number;
}

export interface ProducerTickResult {
  intent: ProducerIntent;
  evaluation: MusicalEvaluation;
  action: ProducerAction | null;
  actionNotice: string;
  clapPattern: number[];
  hatPattern: number[];
  bassPatternFamily: string;
}
