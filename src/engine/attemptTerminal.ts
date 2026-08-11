/**
 * Runtime attempt terminal evaluation after a fully resolved turn (or initial settle).
 * Goal always wins over STRANDED. Uses authoritative legal successful moves.
 */
import type { GameState } from "./types";
import {
  isAuthoritativeStranded,
  playerOnGoal,
} from "./legalMoves";

export type AttemptTerminalKind = "playing" | "success" | "stranded";

export type AttemptTerminal =
  | { kind: "playing" }
  | { kind: "success" }
  | { kind: "stranded" };

export function evaluateAttemptTerminal(state: GameState): AttemptTerminal {
  if (playerOnGoal(state)) return { kind: "success" };
  if (isAuthoritativeStranded(state)) return { kind: "stranded" };
  return { kind: "playing" };
}
