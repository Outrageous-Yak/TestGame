/**
 * Simulator analysis Web Worker.
 * Runs the same authoritative `runSimulator` off the UI thread.
 * Production gameplay does not depend on this worker.
 */
import type { PlannerTrack } from "../types";
import type { AnalysisBudget } from "./analysisBudget";
import { runSimulator, type SimulatorResult } from "./runSimulator";

export type SimulatorWorkerRequest = {
  type: "run";
  runId: number;
  track: PlannerTrack;
  budget?: Partial<AnalysisBudget>;
};

export type SimulatorWorkerResponse =
  | { type: "done"; runId: number; result: SimulatorResult }
  | { type: "error"; runId: number; message: string };

const cancelled = { value: false };

self.onmessage = (event: MessageEvent<SimulatorWorkerRequest | { type: "cancel" }>) => {
  const data = event.data;
  if (data.type === "cancel") {
    cancelled.value = true;
    return;
  }
  if (data.type !== "run") return;

  cancelled.value = false;
  try {
    const result = runSimulator(data.track, {
      budget: data.budget,
      isCancelled: () => cancelled.value,
    });
    const response: SimulatorWorkerResponse = {
      type: "done",
      runId: data.runId,
      result,
    };
    self.postMessage(response);
  } catch (e) {
    const response: SimulatorWorkerResponse = {
      type: "error",
      runId: data.runId,
      message: e instanceof Error ? e.message : String(e),
    };
    self.postMessage(response);
  }
};
