export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;
export const GRAVITY = 2200;
export const MAX_FALL_SPEED = 1300;
export const PLAYER_WIDTH = 42;
export const PLAYER_HEIGHT = 54;

export const POWER_UPS = {
  speed: {
    id: "speed",
    name: "Speed Boost",
    description: "Turbo shoes for fast sprints and wider jumps.",
    duration: 6500,
    color: "#00f5d4",
  },
  shield: {
    id: "shield",
    name: "Shield",
    description: "Blocks the next hit before popping.",
    duration: 8000,
    color: "#7bdff2",
  },
  double: {
    id: "double",
    name: "Double Points",
    description: "All score pickups are doubled for a short burst.",
    duration: 8500,
    color: "#ffd166",
  },
  freeze: {
    id: "freeze",
    name: "Enemy Freeze",
    description: "Enemies stop moving for a few seconds.",
    duration: 5000,
    color: "#9bf6ff",
  },
  extraJump: {
    id: "extraJump",
    name: "Extra Jump",
    description: "Adds one bonus mid-air jump while active.",
    duration: 7000,
    color: "#ff99c8",
  },
};

export const ENEMY_STATS = {
  walker: { width: 40, height: 34, speed: 92, hitPoints: 1, score: 60, bounce: 560 },
  flyer: { width: 38, height: 28, speed: 124, hitPoints: 1, score: 80, bounce: 580 },
  chaser: { width: 46, height: 38, speed: 114, hitPoints: 1, score: 100, bounce: 600 },
  boss: { width: 78, height: 78, speed: 74, hitPoints: 3, score: 240, bounce: 640 },
};

