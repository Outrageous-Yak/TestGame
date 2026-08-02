import type { MusicalEvaluation } from "./producerTypes";
import { clamp } from "../utils";

export interface EvalInput {
  bar: number;
  section: string;
  energy: number;
  padGain: number;
  drumDensity: number;
  bassActivity: number;
  lastBassChangeBar: number;
  lastFillBar: number;
  tension: number;
  isDanceStyle: boolean;
}

export function evaluateMusicalState(input: EvalInput): MusicalEvaluation {
  const barsSinceBass = input.bar - input.lastBassChangeBar;
  const barsSinceFill = input.bar - input.lastFillBar;

  const repetitionScore = clamp(barsSinceBass / 16);
  const grooveScore = input.isDanceStyle
    ? clamp(input.drumDensity * 0.6 + input.bassActivity * 0.4)
    : clamp(input.energy * 0.5);

  const densityScore = clamp(
    input.padGain * 0.45 + input.drumDensity * 0.35 + input.bassActivity * 0.2,
  );

  const clarityScore = input.isDanceStyle
    ? clamp(1 - input.padGain * 0.7 - (input.drumDensity < 0.25 ? 0.35 : 0))
    : clamp(0.5 + input.energy * 0.3);

  const noiseRiskScore = clamp(
    input.padGain * 0.4 + (input.isDanceStyle ? 0 : input.energy * 0.3),
  );

  const contrastScore = clamp(barsSinceFill / 32 + input.tension * 0.2);
  const bassKickLockScore = input.isDanceStyle ? clamp(input.bassActivity * 0.85 + 0.15) : 0.5;
  const styleAuthenticityScore = input.isDanceStyle
    ? clamp(input.drumDensity * 0.5 + grooveScore * 0.5)
    : clamp(0.4 + input.energy * 0.2);

  const melodicCoherenceScore = clamp(0.5 + input.energy * 0.25);

  return {
    grooveScore,
    repetitionScore,
    clarityScore,
    tensionScore: input.tension,
    contrastScore,
    densityScore,
    styleAuthenticityScore,
    melodicCoherenceScore,
    bassKickLockScore,
    noiseRiskScore,
  };
}
