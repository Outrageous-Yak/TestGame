/**
 * Shared dice face rotation + cube presentation helpers.
 * Used by Green risk/villain dice and Step 5C Red encounter dice.
 */

export type DiceRot = { x: number; y: number };

export const BASE_DICE_VIEW: DiceRot = { x: -28, y: -36 };

export function rotForRoll(n: number): DiceRot {
  switch (n) {
    case 1:
      return { x: -90, y: 0 };
    case 2:
      return { x: 0, y: 0 };
    case 3:
      return { x: 0, y: -90 };
    case 4:
      return { x: 0, y: 90 };
    case 5:
      return { x: 0, y: 180 };
    case 6:
      return { x: 90, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}
