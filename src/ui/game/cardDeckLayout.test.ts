import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..", "..");
const controller = readFileSync(
  join(root, "src/ui/game/GameController.tsx"),
  "utf8"
);
const css = readFileSync(join(root, "src/ui/app.css"), "utf8");

describe("compact card deck row", () => {
  it("renders the compact row on every screen and removes the side overlay", () => {
    expect(controller).toContain(
      "<HexDeckCardsRow glowVar={layerCssVar(currentLayer)} />"
    );
    expect(controller).not.toContain("<HexDeckCardsOverlay");
    expect(css).toMatch(
      /\.mobileDeckRow\s*\{[\s\S]*?display:\s*flex;[\s\S]*?grid-row:\s*2;/
    );
  });

  it("keeps each compact card wired to the fly-out origin effect", () => {
    expect(controller).toContain(
      "ref={(el) => (deckRefs.current[card] = el)}"
    );
    expect(controller).toContain("deckRefs.current[card]");
    expect(controller).toContain("el.getBoundingClientRect()");
  });

  it("hides per-hex card markers without removing logical card triggers", () => {
    expect(controller).toContain("findCardTriggerAt(landedId)");
    expect(css).toMatch(/\.cardLayer\s*\{[^}]*display:\s*none;/);
  });
});
