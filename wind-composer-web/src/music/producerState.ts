import type { ProducerAction, ProducerState, SectionType } from "./producerTypes";

export function createProducerState(): ProducerState {
  return {
    bar: 0,
    measure: 0,
    section: "Intro",
    tension: 0.35,
    lastAction: "MaintainGroove",
    lastActionBar: 0,
    lastEvaluationBar: 0,
    startupGroovePhase: 0,
    bassPatternFamily: "offbeat",
    drumPatternFamily: "deep_house_core",
    lastProducerNotice: "",
  };
}

export function updateProducerState(
  state: ProducerState,
  bar: number,
  section: SectionType,
  tension: number,
  action: ProducerAction | null,
  bassFamily: string,
  notice: string,
): ProducerState {
  return {
    ...state,
    bar,
    measure: bar,
    section,
    tension,
    lastAction: action ?? state.lastAction,
    lastActionBar: action ? bar : state.lastActionBar,
    bassPatternFamily: bassFamily,
    lastProducerNotice: notice || state.lastProducerNotice,
  };
}
