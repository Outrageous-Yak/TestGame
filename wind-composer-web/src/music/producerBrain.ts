import { clamp } from "../utils";
import {
  DEEP_HOUSE_CLAP,
  DEEP_HOUSE_HAT_CLOSED,
  DEEP_HOUSE_HAT_OPEN,
  DEEP_HOUSE_KICK,
  DEEP_HOUSE_MIX,
  DEEP_HOUSE_TEMPO,
  type BassPatternFamily,
  deepHouseBassPattern,
} from "./deepHouseGroove";
import { evaluateMusicalState } from "./musicalEvaluator";
import { NoveltyManager } from "./noveltyManager";
import { createProducerState, updateProducerState } from "./producerState";
import type {
  ProducerAction,
  ProducerIntent,
  ProducerState,
  ProducerTickContext,
  ProducerTickResult,
  SectionType,
} from "./producerTypes";
import { getStyle } from "./styleEngine";
import { TensionEngine } from "./tensionEngine";
import { windToTargetBpm } from "./tempoEngine";

const WEATHER_INFLUENCE_SCALE = { subtle: 0.35, balanced: 0.65, strong: 0.9 } as const;

function mapSection(raw: string): SectionType {
  const s = raw as SectionType;
  const valid: SectionType[] = [
    "Intro", "Groove", "Development", "Build", "Drop", "Breakdown", "Recovery", "Outro", "Flow",
  ];
  return valid.includes(s) ? s : "Flow";
}

function grooveStrengthScale(level: string): number {
  if (level === "low") return 0.55;
  if (level === "strong") return 1.0;
  return 0.78;
}

function variationScale(level: string): number {
  if (level === "stable") return 0.25;
  if (level === "adventurous") return 0.85;
  return 0.55;
}

export class ProducerBrain {
  private state = createProducerState();
  private tensionEngine = new TensionEngine();
  private novelty = new NoveltyManager();
  private lastBassChangeBar = 0;
  private lastFillBar = -16;
  private targetBpm = 118;
  private weatherBpmInfluence = 0;
  private nextPlannedAction: ProducerAction = "MaintainGroove";
  private padGainEstimate = 0.4;
  private drumDensityEstimate = 0.5;

  reset(): void {
    this.state = createProducerState();
    this.tensionEngine.reset();
    this.novelty.reset();
    this.lastBassChangeBar = 0;
    this.lastFillBar = -16;
    this.weatherBpmInfluence = 0;
    this.nextPlannedAction = "MaintainGroove";
  }

  getState(): ProducerState {
    return this.state;
  }

  getTargetBpm(): number {
    return this.targetBpm;
  }

  getWeatherBpmInfluence(): number {
    return this.weatherBpmInfluence;
  }

  getNextPlannedAction(): ProducerAction {
    return this.nextPlannedAction;
  }

  tick(ctx: ProducerTickContext): ProducerTickResult {
    const style = getStyle(ctx.styleName);
    const isDeepHouse = ctx.styleName === "Deep House";
    const isDance = style.drumDensity > 0.3;
    const wScale =
      WEATHER_INFLUENCE_SCALE[
        ctx.weatherInfluence as keyof typeof WEATHER_INFLUENCE_SCALE
      ] ?? 0.65;
    const gStrength = grooveStrengthScale(ctx.grooveStrength);
    const varAmt = variationScale(ctx.variation);

    const tempoProfile = isDeepHouse ? DEEP_HOUSE_TEMPO : {
      minBpm: style.bpmMin,
      preferredLow: style.bpmMin + 2,
      preferredHigh: style.bpmMax - 2,
      maxBpm: style.bpmMax,
      maxChangePerBar: 1,
      gustMaxChangePerBar: 2,
    };

    const windTarget = windToTargetBpm(
      ctx.windKmh,
      tempoProfile.minBpm,
      tempoProfile.maxBpm,
      ctx.trendWindDelta,
      ctx.stormLikelihood,
    );
    const preferredMid = (tempoProfile.preferredLow + tempoProfile.preferredHigh) / 2;
    const styleBase = preferredMid;
    const windContrib = (windTarget - styleBase) * wScale * 0.5;
    const trendContrib = ctx.trendWindDelta * 0.08 * wScale;
    const energyContrib = (ctx.energy - 0.5) * 8 * wScale;
    this.weatherBpmInfluence = windContrib + trendContrib;

    this.targetBpm = clamp(
      styleBase * 0.5 + windTarget * 0.25 + ctx.currentBpm * 0.15 + energyContrib + styleBase * 0.1,
      tempoProfile.minBpm,
      tempoProfile.maxBpm,
    );

    const section = mapSection(ctx.section);
    const barChanged = ctx.bar > this.state.bar;
    const tensionTarget = clamp(
      0.35 +
        ctx.stormLikelihood * 0.35 * wScale +
        (-ctx.trendPressureDelta * 0.015 * wScale) +
        ctx.energy * 0.2,
      0.15,
      0.92,
    );

    const tension = this.tensionEngine.update(
      tensionTarget,
      section,
      ctx.trendPressureDelta,
      ctx.stormLikelihood,
      barChanged,
    );

    const intent = this.buildIntent(
      ctx,
      section,
      tension,
      wScale,
      gStrength,
      varAmt,
      isDeepHouse,
      isDance,
    );

    const evaluation = evaluateMusicalState({
      bar: ctx.bar,
      section,
      energy: ctx.energy,
      padGain: this.padGainEstimate,
      drumDensity: this.drumDensityEstimate,
      bassActivity: intent.bassActivity,
      lastBassChangeBar: this.lastBassChangeBar,
      lastFillBar: this.lastFillBar,
      tension,
      isDanceStyle: isDance && ctx.danceEffectsEnabled,
    });

    let action: ProducerAction | null = null;
    let actionNotice = "";
    const noticeParts: string[] = [];

    if (barChanged && ctx.danceEffectsEnabled && isDance) {
      if (ctx.bar % 8 === 0 && ctx.bar > 0) {
        action = this.evaluateBar8(ctx, section, evaluation, intent, varAmt);
      } else if (ctx.bar % 4 === 0 && ctx.bar > 0) {
        action = this.evaluateBar4(ctx, section, evaluation, intent);
      }

      if (action && !this.novelty.actionCooldown(action)) {
        this.novelty.recordAction(action, ctx.bar);
        actionNotice = this.describeAction(action);
        noticeParts.push(actionNotice);
        this.applyActionEffects(action, ctx.bar);
      } else {
        action = null;
      }
    }

    if (ctx.bar > this.state.bar) {
      this.state.startupGroovePhase = Math.min(4, this.state.startupGroovePhase + 1);
    }

    const bassFamily = this.pickBassFamily(section, intent, evaluation);
    if (bassFamily !== this.state.bassPatternFamily) {
      this.lastBassChangeBar = ctx.bar;
    }

    const { clapPattern, hatPattern } = this.pickDrumPatterns(
      ctx.styleName,
      section,
      intent,
      style,
    );

    this.padGainEstimate = intent.padGainLimit;
    this.drumDensityEstimate = intent.rhythmicDensity;

    this.nextPlannedAction = this.planNextAction(section, evaluation, intent);

    this.state = updateProducerState(
      this.state,
      ctx.bar,
      section,
      tension,
      action,
      bassFamily,
      noticeParts.join("; "),
    );

    if (ctx.bar % 8 === 0) this.state.lastEvaluationBar = ctx.bar;

    return {
      intent,
      evaluation,
      action,
      actionNotice,
      clapPattern,
      hatPattern,
      bassPatternFamily: bassFamily,
    };
  }

  private buildIntent(
    ctx: ProducerTickContext,
    section: SectionType,
    tension: number,
    wScale: number,
    gStrength: number,
    varAmt: number,
    isDeepHouse: boolean,
    isDance: boolean,
  ): ProducerIntent {
    const mix = isDeepHouse ? DEEP_HOUSE_MIX : {
      padGainMax: 0.45,
      atmosphereMax: 0.28,
      noiseBudget: 0.6,
      kickDryness: 0.9,
      sidechainAmount: 0.35,
    };

    const startupPhase = this.state.startupGroovePhase;
    const grooveRamp = clamp(startupPhase / 3, 0.25, 1);

    const energyTarget = clamp(ctx.energy * 0.6 + wScale * 0.25 + gStrength * 0.15, 0.2, 0.95);
    const rhythmicDensity = clamp(
      (isDance ? 0.45 + gStrength * 0.4 : 0.2) * grooveRamp + ctx.energy * 0.15,
      0.15,
      0.92,
    );

    const bassActivity = clamp(
      (isDeepHouse ? 0.55 : 0.4) * gStrength * grooveRamp + ctx.energy * 0.2,
      0.1,
      0.95,
    );

    const padLimit = mix.padGainMax * (1 - gStrength * 0.15) * (section === "Breakdown" ? 1.1 : 0.85);
    const atmoLimit = mix.atmosphereMax * (1 - rhythmicDensity * 0.3);

    const allowPads = startupPhase >= 2 || section !== "Intro";
    const allowLeads = startupPhase >= 3 && section !== "Intro" && section !== "Build";

    return {
      energyTarget,
      tensionTarget: tension,
      grooveIntensity: clamp(gStrength * grooveRamp, 0.3, 1),
      rhythmicDensity,
      bassActivity,
      harmonicComplexity: clamp(0.4 + varAmt * 0.35 + tension * 0.2, 0.3, 0.85),
      melodicPresence: clamp(0.25 + varAmt * 0.4 - gStrength * 0.1, 0.1, 0.7),
      atmosphericDensity: atmoLimit,
      brightness: clamp(0.5 + ctx.energy * 0.3, 0.35, 0.9),
      warmth: clamp(0.55 + (1 - ctx.energy) * 0.2, 0.4, 0.85),
      spatialDepth: clamp(0.35 + tension * 0.25, 0.2, 0.75),
      surpriseProbability: clamp(varAmt * 0.5 + tension * 0.2, 0.1, 0.65),
      transitionUrgency: clamp(tension * 0.6 + ctx.stormLikelihood * 0.3, 0, 0.9),
      repetitionTolerance: clamp(1 - varAmt * 0.5, 0.35, 0.85),
      silenceProbability: section === "Build" ? 0.12 : 0.04,
      sectionPreference: section,
      preferredNextAction: this.nextPlannedAction,
      targetBpm: this.targetBpm,
      padGainLimit: padLimit,
      atmosphereLimit: atmoLimit,
      noiseBudget: mix.noiseBudget,
      sidechainAmount: mix.sidechainAmount * gStrength,
      kickDryness: mix.kickDryness,
      allowPads,
      allowLeads,
    };
  }

  private evaluateBar8(
    ctx: ProducerTickContext,
    section: SectionType,
    eval_: ReturnType<typeof evaluateMusicalState>,
    intent: ProducerIntent,
    varAmt: number,
  ): ProducerAction | null {
    if (eval_.densityScore > 0.72 && eval_.clarityScore < 0.45) {
      return eval_.noiseRiskScore > 0.55 ? "ReduceAtmosphere" : "ReducePads";
    }
    if (eval_.repetitionScore > 0.85 && varAmt > 0.4) {
      return "IncreaseBassActivity";
    }
    if (section === "Groove" && eval_.tensionScore > 0.55 && this.novelty.canSurprise(ctx.bar, intent.surpriseProbability)) {
      return "BeginBuild";
    }
    if (section === "Build" && eval_.tensionScore > 0.7) {
      return "TriggerDrop";
    }
    if (section === "Drop" && ctx.bar % 16 === 0 && varAmt > 0.5) {
      return "BeginBreakdown";
    }
    if (section === "Breakdown" && eval_.tensionScore < 0.4) {
      return "RecoverGroove";
    }
    return null;
  }

  private evaluateBar4(
    ctx: ProducerTickContext,
    section: SectionType,
    eval_: ReturnType<typeof evaluateMusicalState>,
    intent: ProducerIntent,
  ): ProducerAction | null {
    if (section === "Intro" && ctx.bar >= 4 && intent.rhythmicDensity > 0.35) {
      return "AddClosedHats";
    }
    if (eval_.grooveScore < 0.4 && section !== "Breakdown") {
      return "ReturnCorePattern";
    }
    if (
      ctx.bar - this.lastFillBar >= 8 &&
      intent.surpriseProbability > 0.35 &&
      section !== "Intro" &&
      this.novelty.canSurprise(ctx.bar, intent.surpriseProbability)
    ) {
      return "AddFill";
    }
    if (section === "Build" && ctx.bar % 4 === 0) {
      return "AddOpenHat";
    }
    if (eval_.noiseRiskScore > 0.65) {
      return "ReduceAtmosphere";
    }
    return null;
  }

  private applyActionEffects(action: ProducerAction, bar: number): void {
    switch (action) {
      case "TriggerDrop":
        this.tensionEngine.applyRelease(0.35);
        break;
      case "RecoverGroove":
        this.tensionEngine.applyRelease(0.2);
        break;
      case "AddFill":
        this.lastFillBar = bar;
        break;
      case "BeginBreakdown":
        this.state.startupGroovePhase = 2;
        break;
      default:
        break;
    }
  }

  private pickBassFamily(
    section: SectionType,
    intent: ProducerIntent,
    eval_: ReturnType<typeof evaluateMusicalState>,
  ): BassPatternFamily {
    if (section === "Breakdown") return "breakdown";
    if (section === "Build") return "syncopated";
    if (eval_.repetitionScore > 0.7) return "root_fifth";
    if (intent.bassActivity > 0.65) return "syncopated";
    return "offbeat";
  }

  private pickDrumPatterns(
    styleName: string,
    section: SectionType,
    intent: ProducerIntent,
    style: ReturnType<typeof getStyle>,
  ): { clapPattern: number[]; hatPattern: number[] } {
    if (styleName === "Deep House") {
      const hats = [...DEEP_HOUSE_HAT_CLOSED];
      if (section === "Build" || section === "Drop" || intent.rhythmicDensity > 0.55) {
        for (let i = 0; i < 16; i++) {
          if (DEEP_HOUSE_HAT_OPEN[i]) hats[i] = 1;
        }
      }
      return { clapPattern: DEEP_HOUSE_CLAP, hatPattern: hats };
    }
    return {
      clapPattern: style.useClap ? [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] : [],
      hatPattern: style.hatPattern,
    };
  }

  private planNextAction(
    section: SectionType,
    eval_: ReturnType<typeof evaluateMusicalState>,
    intent: ProducerIntent,
  ): ProducerAction {
    if (section === "Build") return "TriggerDrop";
    if (section === "Breakdown") return "RecoverGroove";
    if (eval_.densityScore > 0.7) return "ReducePads";
    if (eval_.grooveScore < 0.45) return "ReturnCorePattern";
    if (intent.rhythmicDensity < 0.5) return "AddClosedHats";
    return "MaintainGroove";
  }

  private describeAction(action: ProducerAction): string {
    const labels: Record<ProducerAction, string> = {
      MaintainGroove: "Maintaining groove",
      AddClosedHats: "Closed hats added",
      AddOpenHat: "Open hat introduced",
      ThinPercussion: "Percussion thinned",
      IncreaseBassActivity: "Bass activity increased",
      SimplifyBass: "Bass simplified",
      BeginBuild: "Build extended",
      TriggerDrop: "Drop triggered",
      BeginBreakdown: "Breakdown begun",
      RecoverGroove: "Groove recovery",
      AddFill: "Fill probability increased",
      ReducePads: "Pads reduced",
      ReduceAtmosphere: "Atmosphere reduced",
      IncreaseSpatialDepth: "Spatial depth increased",
      CreateSilenceBeat: "One-beat silence",
      ReturnCorePattern: "Core pattern restored",
    };
    return labels[action] ?? action;
  }

  getBassMidiPattern(rootMidi: number, family: string): number[] {
    const f = family as BassPatternFamily;
    return deepHouseBassPattern(f, rootMidi);
  }

  getKickPattern(styleName: string): number[] {
    if (styleName === "Deep House") return DEEP_HOUSE_KICK;
    return getStyle(styleName).kickPattern;
  }
}
