*** a/src/ui/app.tsx
--- b/src/ui/app.tsx
***************
*** 1,6 ****
  // src/ui/app.tsx
  import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
  
  import type { GameState, Scenario, Hex } from "../engine/types";
  import { assertScenario } from "../engine/scenario";
--- 1,6 ----
  // src/ui/app.tsx
  import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
  
  import type { GameState, Scenario, Hex } from "../engine/types";
  import { assertScenario } from "../engine/scenario";
***************
*** 129,170 ****
  /** If scenario/newGame doesn't provide a start tile, choose a safe one. */
  function findFirstPlayableHexId(st: GameState, layer: number): string {
    for (let r = 0; r < ROW_LENS.length; r++) {
      const len = ROW_LENS[r] ?? 7;
      for (let c = 0; c < len; c++) {
        const id = `L${layer}-R${r}-C${c}`;
        const hex = getHexFromState(st, id) as any;
        if (!hex) continue;
        if (hex.missing) continue;
        if (hex.blocked) continue;
        return id;
      }
    }
    return `L${layer}-R0-C0`;
  }
  
  /* =========================================================
     Minimal players (template)
  ========================================================= */
--- 129,190 ----
  /** If scenario/newGame doesn't provide a start tile, choose a safe one. */
  function findFirstPlayableHexId(st: GameState, layer: number): string {
    for (let r = 0; r < ROW_LENS.length; r++) {
      const len = ROW_LENS[r] ?? 7;
      for (let c = 0; c < len; c++) {
        const id = `L${layer}-R${r}-C${c}`;
        const hex = getHexFromState(st, id) as any;
        if (!hex) continue;
        if (hex.missing) continue;
        if (hex.blocked) continue;
        return id;
      }
    }
    return `L${layer}-R0-C0`;
  }
  
+ /** Facing from movement direction (for sprite rows). */
+ function facingFromMove(fromId: string | null, toId: string | null): "down" | "up" | "left" | "right" {
+   const a = fromId ? idToCoord(fromId) : null;
+   const b = toId ? idToCoord(toId) : null;
+   if (!a || !b) return "down";
+   if (a.layer !== b.layer) return "down";
+ 
+   const dRow = b.row - a.row;
+   const dCol = b.col - a.col;
+ 
+   if (Math.abs(dCol) >= Math.abs(dRow)) return dCol > 0 ? "right" : dCol < 0 ? "left" : "down";
+   return dRow > 0 ? "down" : "up";
+ }
+ 
  /* =========================================================
     Minimal players (template)
  ========================================================= */
***************
*** 219,231 ****
    const [state, setState] = useState<GameState | null>(null);
     const [, forceRender] = useState(0);
    const [currentLayer, setCurrentLayer] = useState<number>(1);
    const [selectedId, setSelectedId] = useState<string | null>(null);
  
    const [reachMap, setReachMap] = useState<ReachMap>({} as ReachMap);
    const reachable = useMemo(() => {
      const set = new Set<string>();
--- 239,255 ----
    const [state, setState] = useState<GameState | null>(null);
     const [, forceRender] = useState(0);
    const [currentLayer, setCurrentLayer] = useState<number>(1);
    const [selectedId, setSelectedId] = useState<string | null>(null);
+ 
+   // sprite facing (for your sprite sheet rows)
+   const [playerFacing, setPlayerFacing] = useState<"down" | "up" | "left" | "right">("down");
  
    const [reachMap, setReachMap] = useState<ReachMap>({} as ReachMap);
    const reachable = useMemo(() => {
      const set = new Set<string>();
***************
*** 381,390 ****
      setState(st);
      setSelectedId(pid);
      setCurrentLayer(layer);
  
      setRollValue(1);
      setDiceRot(BASE_DICE_VIEW);
      setDiceSpinning(false);
--- 405,415 ----
      setState(st);
      setSelectedId(pid);
      setCurrentLayer(layer);
+     setPlayerFacing("down");
  
      setRollValue(1);
      setDiceRot(BASE_DICE_VIEW);
      setDiceSpinning(false);
***************
*** 450,469 ****
        // Try move
        const res: any = tryMove(state as any, id);
        const nextState: any = res?.state ?? res ?? null;
        if (!nextState) return;
  
        setState(nextState);
        setSelectedId((nextState as any).playerHexId ?? id);
  
        const p2 = (nextState as any).playerHexId as string | null;
        const c2 = p2 ? idToCoord(p2) : null;
        const nextLayer = c2?.layer ?? currentLayer;
--- 475,501 ----
        // Try move
        const res: any = tryMove(state as any, id);
        const nextState: any = res?.state ?? res ?? null;
        if (!nextState) return;
  
+       const pidBefore = (state as any).playerHexId as string | null;
+       const pidAfter = (nextState as any).playerHexId as string | null;
+       setPlayerFacing(facingFromMove(pidBefore, pidAfter));
+ 
        setState(nextState);
-       setSelectedId((nextState as any).playerHexId ?? id);
+       setSelectedId(pidAfter ?? id);
  
-       const p2 = (nextState as any).playerHexId as string | null;
-       const c2 = p2 ? idToCoord(p2) : null;
+       const c2 = pidAfter ? idToCoord(pidAfter) : null;
        const nextLayer = c2?.layer ?? currentLayer;
***************
*** 532,543 ****
                    <HexBoard
                      kind="main"
                      activeLayer={currentLayer}
                      maxLayer={scenarioLayerCount}
                      state={state}
                      selectedId={selectedId}
                      reachable={reachable}
                      reachMap={reachMap}
                      onCellClick={tryMoveToId}
                      showCoords
                      showPlayerOnMini={false}
                    />
--- 564,576 ----
                    <HexBoard
                      kind="main"
                      activeLayer={currentLayer}
                      maxLayer={scenarioLayerCount}
                      state={state}
                      selectedId={selectedId}
                      reachable={reachable}
                      reachMap={reachMap}
                      onCellClick={tryMoveToId}
                      showCoords
                      showPlayerOnMini={false}
+                     playerFacing={playerFacing}
                    />
***************
*** 630,642 ****
  function HexBoard(props: {
    kind: "main" | "mini";
    activeLayer: number;
    maxLayer: number;
    state: GameState | null;
    selectedId: string | null;
    reachable: Set<string>;
    reachMap: ReachMap;
    onCellClick?: (id: string) => void;
    showCoords: boolean;
    showPlayerOnMini?: boolean;
  }) {
-   const { kind, activeLayer, maxLayer, state, selectedId, reachable, onCellClick, showCoords, showPlayerOnMini } = props;
+ function HexBoard(props: {
+   kind: "main" | "mini";
+   activeLayer: number;
+   maxLayer: number;
+   state: GameState | null;
+   selectedId: string | null;
+   reachable: Set<string>;
+   reachMap: ReachMap;
+   onCellClick?: (id: string) => void;
+   showCoords: boolean;
+   showPlayerOnMini?: boolean;
+   playerFacing?: "up" | "down" | "left" | "right";
+ }) {
+   const { kind, activeLayer, maxLayer, state, selectedId, reachable, onCellClick, showCoords, showPlayerOnMini } = props;
    const playerId = (state as any)?.playerHexId ?? null;
***************
*** 725,730 ****
  
                    {kind === "mini" ? <span className="miniNum">{col + 1}</span> : null}
                  </div>
                );
              })}
            </div>
--- 759,768 ----
  
+                   {/* Sprite Rendering inside HexBoard (main only) */}
+                   {isPlayer && kind === "main" ? (
+                     <span className={"playerSprite " + (props.playerFacing ?? "down")} />
+                   ) : null}
+ 
                    {kind === "mini" ? <span className="miniNum">{col + 1}</span> : null}
                  </div>
                );
              })}
            </div>
***************
*** 1000,1005 ****
  .diceReadout.subtle{ opacity: .78; }
  
  /* 6 glow on cube */
  .diceCube.glowSix{
    filter:
      drop-shadow(0 0 12px rgba(160,230,255,.95))
--- 1038,1070 ----
  .diceReadout.subtle{ opacity: .78; }
  
+ /* ===== Player sprite (pixel sprite sheet) ===== */
+ .playerSprite{
+   position:absolute;
+   left:50%;
+   top:52%;
+   width:44px;
+   height:44px;
+   transform:translate(-50%,-70%) scale(1.25);
+   z-index:30;
+   background-image:url("/images/players/sprite_sheet_20.png");
+   background-size:400% 500%;
+   image-rendering:pixelated;
+   animation:walk .7s steps(4) infinite;
+ }
+ .playerSprite.down{background-position-y:0%}
+ .playerSprite.left{background-position-y:25%}
+ .playerSprite.right{background-position-y:50%}
+ .playerSprite.up{background-position-y:75%}
+ 
+ @keyframes walk{
+   from{background-position-x:0%}
+   to{background-position-x:100%}
+ }
+ 
  /* 6 glow on cube */
  .diceCube.glowSix{
    filter:
      drop-shadow(0 0 12px rgba(160,230,255,.95))
