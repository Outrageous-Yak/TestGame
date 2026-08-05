/**
 * Forgotten Citadel movable hex tile selection.
 * White movable image appears only during reach-pulse flash on reachable hexes.
 */
export function shouldShowMovableFlashHexTile(
  hexTileMovable: string | undefined,
  isReach: boolean,
  isReachPulse: boolean
): boolean {
  return isReach && isReachPulse && !!hexTileMovable;
}

export function selectHexTileArtUrl(
  regularHexTile: string,
  hexTileMovable: string | undefined,
  isReach: boolean,
  isReachPulse: boolean
): string {
  if (shouldShowMovableFlashHexTile(hexTileMovable, isReach, isReachPulse)) {
    return hexTileMovable!;
  }
  return regularHexTile;
}
