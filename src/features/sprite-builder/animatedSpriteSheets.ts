export type AnimatedSpriteSheet = {
  id: string;
  name: string;
  path: string;
  description: string;
  cols: 4;
  rows: 5;
  frameWidth: 128;
  frameHeight: 128;
};

export const DEFAULT_ANIMATED_SPRITE_ID = "__default_animated__";
export const GOTHIC_ELF_SPRITE_ID = "animated-gothic-elf-mage";

export const ANIMATED_SPRITE_SHEETS: readonly AnimatedSpriteSheet[] = [
  {
    id: DEFAULT_ANIMATED_SPRITE_ID,
    name: "Default Character",
    path: "images/players/sprite_sheet_20.png",
    description: "Built-in animated sprite",
    cols: 4,
    rows: 5,
    frameWidth: 128,
    frameHeight: 128,
  },
  {
    id: GOTHIC_ELF_SPRITE_ID,
    name: "Gothic Elf Mage",
    path: "images/players/gothic-elf-mage.png",
    description: "Animated dark-elf mage with violet magic",
    cols: 4,
    rows: 5,
    frameWidth: 128,
    frameHeight: 128,
  },
] as const;

export function resolveAnimatedSpriteSheet(
  activeId: string | null
): AnimatedSpriteSheet {
  return (
    ANIMATED_SPRITE_SHEETS.find((sheet) => sheet.id === activeId) ??
    ANIMATED_SPRITE_SHEETS[0]
  );
}

export function selectionIdForAnimatedSprite(
  sheet: AnimatedSpriteSheet
): string | null {
  return sheet.id === DEFAULT_ANIMATED_SPRITE_ID ? null : sheet.id;
}
