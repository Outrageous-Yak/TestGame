import React, { useCallback, useEffect, useRef, useState } from "react";
import { BASE_DICE_VIEW, rotForRoll, type DiceRot } from "./diceGeometry";

export type D6FaceSource = () => number;

export type UseDiceRollOptions = {
  reducedMotion: boolean;
  /** Animation length for visual flicker (ignored when reducedMotion). */
  durationMs?: number;
  tickMs?: number;
  /** Visual-only flicker faces during animation (not the gameplay result). */
  flickerSource?: D6FaceSource;
};

/**
 * Shared dice roll animation.
 *
 * Caller supplies the authoritative final face once via `roll(finalFace)`.
 * Animation may flicker other faces but MUST settle on that final face.
 */
export function useDiceRoll(options: UseDiceRollOptions) {
  const {
    reducedMotion,
    durationMs = 650,
    tickMs = 55,
    flickerSource = () => 1 + Math.floor(Math.random() * 6),
  } = options;

  const [value, setValue] = useState(2);
  const [rot, setRot] = useState<DiceRot>(BASE_DICE_VIEW);
  const [rolling, setRolling] = useState(false);
  const generationRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Invalidate in-flight animation (scenario restart / unmount). */
  const cancel = useCallback(() => {
    generationRef.current += 1;
    clearTimer();
    setRolling(false);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      clearTimer();
    };
  }, [clearTimer]);

  const settle = useCallback((face: number) => {
    setValue(face);
    setRot(rotForRoll(face));
    setRolling(false);
  }, []);

  /**
   * Animate toward an already-chosen authoritative face.
   * Returns false if a roll is already in progress.
   */
  const roll = useCallback(
    (finalFace: number, onSettled?: (face: number) => void): boolean => {
      if (rolling) return false;
      if (!Number.isInteger(finalFace) || finalFace < 1 || finalFace > 6) return false;

      const gen = ++generationRef.current;
      clearTimer();

      if (reducedMotion) {
        settle(finalFace);
        onSettled?.(finalFace);
        return true;
      }

      setRolling(true);
      const start = performance.now();

      const tick = () => {
        if (generationRef.current !== gen) return;
        const elapsed = performance.now() - start;
        let flicker = flickerSource();
        if (!Number.isInteger(flicker) || flicker < 1 || flicker > 6) flicker = ((flicker % 6) + 6) % 6 || 1;
        setValue(flicker);
        setRot(rotForRoll(flicker));

        if (elapsed < durationMs) {
          timerRef.current = window.setTimeout(tick, tickMs);
        } else {
          if (generationRef.current !== gen) return;
          settle(finalFace);
          onSettled?.(finalFace);
        }
      };

      tick();
      return true;
    },
    [rolling, reducedMotion, clearTimer, settle, flickerSource, durationMs, tickMs]
  );

  return { value, rot, rolling, roll, cancel, settle };
}
