import type { PlannerTrack } from "../types";
import type { AnalysisBudget } from "./analysisBudget";
import { runSimulator, type SimulatorResult } from "./runSimulator";
import type { SimulatorWorkerResponse } from "./simulatorWorker";

export type SimulatorRunHandle = {
  runId: number;
  promise: Promise<SimulatorResult>;
  cancel: () => void;
};

let nextRunId = 1;

function supportsWorker(): boolean {
  return typeof Worker !== "undefined" && typeof window !== "undefined";
}

/**
 * Launch Simulator analysis off the main thread when Workers are available.
 * Falls back to a deferred sync run (setTimeout 0) in Node/tests.
 */
export function startSimulatorRun(
  track: PlannerTrack,
  options: {
    budget?: Partial<AnalysisBudget>;
    /** When false, force main-thread sync (tests). Default: use Worker in browser. */
    useWorker?: boolean;
  } = {}
): SimulatorRunHandle {
  const runId = nextRunId++;
  let cancelled = false;
  let worker: Worker | null = null;

  const cancel = () => {
    cancelled = true;
    if (worker) {
      worker.postMessage({ type: "cancel" });
      worker.terminate();
      worker = null;
    }
  };

  const useWorker = options.useWorker ?? supportsWorker();

  if (useWorker) {
    const promise = new Promise<SimulatorResult>((resolve, reject) => {
      try {
        worker = new Worker(new URL("./simulatorWorker.ts", import.meta.url), {
          type: "module",
        });
      } catch (e) {
        // Worker construction failed — sync fallback.
        queueMicrotask(() => {
          if (cancelled) {
            resolve(
              runSimulator(track, {
                budget: options.budget,
                isCancelled: () => true,
              })
            );
            return;
          }
          try {
            resolve(
              runSimulator(track, {
                budget: options.budget,
                isCancelled: () => cancelled,
              })
            );
          } catch (err) {
            reject(err);
          }
        });
        return;
      }

      worker.onmessage = (event: MessageEvent<SimulatorWorkerResponse>) => {
        const msg = event.data;
        if (msg.runId !== runId) return;
        worker?.terminate();
        worker = null;
        if (cancelled) {
          resolve(
            runSimulator(track, {
              budget: options.budget,
              isCancelled: () => true,
            })
          );
          return;
        }
        if (msg.type === "done") resolve(msg.result);
        else reject(new Error(msg.message));
      };
      worker.onerror = (err) => {
        worker?.terminate();
        worker = null;
        reject(err.error ?? new Error(err.message || "Simulator worker failed"));
      };
      worker.postMessage({
        type: "run",
        runId,
        track,
        budget: options.budget,
      });
    });

    return { runId, promise, cancel };
  }

  const promise = new Promise<SimulatorResult>((resolve, reject) => {
    // Yield once so React can paint "Running…" before sync work.
    setTimeout(() => {
      try {
        resolve(
          runSimulator(track, {
            budget: options.budget,
            isCancelled: () => cancelled,
          })
        );
      } catch (e) {
        reject(e);
      }
    }, 0);
  });

  return { runId, promise, cancel };
}
