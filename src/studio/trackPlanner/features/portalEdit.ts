import type { Pos, TransitionType } from "../../../engine/types";
import type { PortalFeature } from "../types";

export function portalDirectionFor(source: Pos, dest: Pos): TransitionType {
  return dest.layer >= source.layer ? "UP" : "DOWN";
}

export function withPortalDestination(portal: PortalFeature, dest: Pos): PortalFeature {
  return {
    ...portal,
    destination: { ...dest },
    direction: portalDirectionFor(portal.source, dest),
  };
}
