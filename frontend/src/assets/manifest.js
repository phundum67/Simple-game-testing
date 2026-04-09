import sahoorPortrait from "./characters/portraits/sahoor-sproing.svg";
import sixtyPortrait from "./characters/portraits/sixty-hex.svg";
import gobboPortrait from "./characters/portraits/gobbo-gacha.svg";
import doctorPortrait from "./characters/portraits/doctor-oof.svg";
import cachePortrait from "./characters/portraits/cache-money.svg";

import sahoorSprite from "./characters/sprites/sahoor-sproing.svg";
import sixtySprite from "./characters/sprites/sixty-hex.svg";
import gobboSprite from "./characters/sprites/gobbo-gacha.svg";
import doctorSprite from "./characters/sprites/doctor-oof.svg";
import cacheSprite from "./characters/sprites/cache-money.svg";

import sahoorIcon from "./ui/icons/sahoor-sproing.svg";
import sixtyIcon from "./ui/icons/sixty-hex.svg";
import gobboIcon from "./ui/icons/gobbo-gacha.svg";
import doctorIcon from "./ui/icons/doctor-oof.svg";
import cacheIcon from "./ui/icons/cache-money.svg";

import walkerSprite from "./enemies/walker.svg";
import flyerSprite from "./enemies/flyer.svg";
import chaserSprite from "./enemies/chaser.svg";
import bossSprite from "./enemies/boss.svg";

export const CHARACTER_VISUALS = {
  "sahoor-sproing": {
    portrait: sahoorPortrait,
    sprite: sahoorSprite,
    icon: sahoorIcon,
    frame: "#ffb14b",
    glow: "rgba(255, 177, 75, 0.35)",
  },
  "sixty-hex": {
    portrait: sixtyPortrait,
    sprite: sixtySprite,
    icon: sixtyIcon,
    frame: "#3bd7ff",
    glow: "rgba(59, 215, 255, 0.35)",
  },
  "gobbo-gacha": {
    portrait: gobboPortrait,
    sprite: gobboSprite,
    icon: gobboIcon,
    frame: "#99d228",
    glow: "rgba(153, 210, 40, 0.35)",
  },
  "doctor-oof": {
    portrait: doctorPortrait,
    sprite: doctorSprite,
    icon: doctorIcon,
    frame: "#ff68d0",
    glow: "rgba(255, 104, 208, 0.35)",
  },
  "cache-money": {
    portrait: cachePortrait,
    sprite: cacheSprite,
    icon: cacheIcon,
    frame: "#33d7ff",
    glow: "rgba(51, 215, 255, 0.35)",
  },
};

export const ENEMY_VISUALS = {
  walker: { sprite: walkerSprite, tint: "#b7f07b" },
  flyer: { sprite: flyerSprite, tint: "#97ecff" },
  chaser: { sprite: chaserSprite, tint: "#ff92c2" },
  boss: { sprite: bossSprite, tint: "#ff4d91" },
};

export function mergeCharacterVisuals(character) {
  return {
    ...character,
    visuals: CHARACTER_VISUALS[character.id] ?? null,
  };
}
