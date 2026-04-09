import {
  ENEMY_STATS,
  GRAVITY,
  MAX_FALL_SPEED,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  POWER_UPS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "./constants";
import { ENEMY_VISUALS } from "../assets/manifest";

const PLAYER_BASE_SPEED = 270;
const PLAYER_BASE_JUMP = 810;

const themePalettes = {
  neonCity: { skyTop: "#20004e", skyBottom: "#071327", platform: "#3d2c8d", platformEdge: "#7d7cff" },
  dreamWorld: { skyTop: "#7f7eff", skyBottom: "#f7b8d6", platform: "#a65cb7", platformEdge: "#ffd6ff" },
  jungleRuins: { skyTop: "#1a936f", skyBottom: "#114b5f", platform: "#7c5f3c", platformEdge: "#d9c59a" },
  glitchWorld: { skyTop: "#110b22", skyBottom: "#041017", platform: "#26305f", platformEdge: "#7ffff7" },
};

const imageCache = new Map();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const insetRect = (rect, inset = 0) => ({
  x: rect.x + inset,
  y: rect.y + inset,
  w: rect.w - inset * 2,
  h: rect.h - inset * 2,
});

const roundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const getImageAsset = (src) => {
  if (!src) {
    return null;
  }

  if (!imageCache.has(src)) {
    const image = new Image();
    image.src = src;
    imageCache.set(src, image);
  }

  return imageCache.get(src);
};

const getCharacterModifiers = (character) => ({
  jumpMultiplier: character?.ability?.jump_multiplier ?? 1,
  speedMultiplier: character?.ability?.speed_multiplier ?? 1,
  boxLuck: character?.ability?.box_luck ?? 0,
  extraHealth: character?.ability?.extra_health ?? 0,
  startingScoreBonus: character?.ability?.starting_score_bonus ?? 0,
});

const createQuestState = (quest) => ({ ...quest, progress: 0, completed: false, rewarded: false });

const cloneLevel = (template) => ({
  ...template,
  platforms: template.platforms.map((platform) => ({
    ...platform,
    x: platform.x,
    y: platform.y,
    baseX: platform.x,
    baseY: platform.y,
    dx: 0,
    dy: 0,
  })),
  traps: template.traps.map((item) => ({ ...item })),
  collectibles: template.collectibles.map((item) => ({ ...item, collected: false })),
  mysteryBoxes: template.mysteryBoxes.map((item) => ({ ...item, opened: false })),
  enemies: template.enemies.map((item) => {
    const stats = ENEMY_STATS[item.type];
    return {
      ...item,
      x: item.x,
      y: item.y,
      baseX: item.x,
      baseY: item.y,
      width: stats.width,
      height: stats.height,
      hitPoints: stats.hitPoints,
      direction: 1,
      dead: false,
      wobble: Math.random() * Math.PI * 2,
    };
  }),
  sideQuestState: template.sideQuests.map(createQuestState),
});

const makePlayer = (spawn, character, health, maxHealth) => ({
  x: spawn.x,
  y: spawn.y,
  prevX: spawn.x,
  prevY: spawn.y,
  w: PLAYER_WIDTH,
  h: PLAYER_HEIGHT,
  vx: 0,
  vy: 0,
  onGround: false,
  jumpsUsed: 0,
  facing: 1,
  color: character.color,
  accent: character.accent,
  health,
  maxHealth,
  invincibleTimer: 0,
  standingPlatformId: null,
  effects: { speed: 0, shield: 0, double: 0, extraJump: 0 },
});

const addMessage = (game, text, color = "#ffffff") => {
  game.messages.push({ id: `${Date.now()}-${Math.random()}`, text, color, ttl: 2400 });
};

const scoreMultiplier = (game) => (game.player.effects.double > 0 ? 2 : 1);

const addScore = (game, baseValue) => {
  game.totalScore += Math.round(baseValue * scoreMultiplier(game));
};

const progressQuest = (game, type, amount = 1) => {
  const quest = game.level.sideQuestState.find((item) => item.type === type && !item.completed);
  if (!quest) {
    return;
  }

  quest.progress = Math.min(quest.target, quest.progress + amount);
  if (quest.progress >= quest.target) {
    quest.completed = true;
    addMessage(game, `Quest cleared: ${quest.description}`, "#ffe66d");
  }
};

const choosePowerUp = (luckBonus) => {
  const entries = [
    { key: "speed", weight: 0.23 },
    { key: "shield", weight: 0.2 + luckBonus * 0.9 },
    { key: "double", weight: 0.17 + luckBonus * 0.7 },
    { key: "freeze", weight: 0.16 + luckBonus * 0.55 },
    { key: "extraJump", weight: 0.24 },
  ];

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return POWER_UPS[entry.key];
    }
  }

  return POWER_UPS.speed;
};

const applyPowerUp = (game, powerUp) => {
  const durationBoost = 1 + game.modifiers.boxLuck * 0.65;
  const boostedDuration = Math.round(powerUp.duration * durationBoost);
  if (powerUp.id === "freeze") {
    game.freezeTimer = Math.max(game.freezeTimer, boostedDuration);
  } else {
    game.player.effects[powerUp.id] = Math.max(game.player.effects[powerUp.id], boostedDuration);
  }

  addMessage(game, `${powerUp.name}! ${powerUp.description}`, powerUp.color);
};

const openMysteryBox = (game, mysteryBox, audio) => {
  if (mysteryBox.opened) {
    return;
  }

  mysteryBox.opened = true;
  game.stats.boxesOpened += 1;
  addScore(game, 25);
  const powerUp = choosePowerUp(game.modifiers.boxLuck);
  applyPowerUp(game, powerUp);
  audio?.play("box");
  audio?.play("power");
};

const respawnPlayer = (game) => {
  const spawn = game.level.spawn;
  game.player.x = spawn.x;
  game.player.y = spawn.y;
  game.player.prevX = spawn.x;
  game.player.prevY = spawn.y;
  game.player.vx = 0;
  game.player.vy = 0;
  game.player.onGround = false;
  game.player.jumpsUsed = 0;
  game.player.standingPlatformId = null;
  game.cameraX = clamp(spawn.x - VIEW_WIDTH * 0.3, 0, game.level.worldWidth - VIEW_WIDTH);
};

const finishRun = (game, outcome) => {
  game.status = outcome === "win" ? "won" : "lost";
  game.result = {
    outcome,
    score: game.totalScore,
    characterId: game.character.id,
    characterName: game.character.name,
    coins: game.totalCoins,
    enemiesDefeated: game.stats.enemiesDefeated,
    sideQuestsCompleted: game.stats.sideQuestsCompleted,
    levelsCleared: game.stats.levelsCleared,
    boxesOpened: game.stats.boxesOpened,
    timeSeconds: Math.round(game.totalTime),
    levelReached: game.levelIndex + 1,
  };
};

const hurtPlayer = (game, sourceLabel, audio) => {
  if (game.player.invincibleTimer > 0 || game.status !== "playing") {
    return;
  }

  if (game.player.effects.shield > 0) {
    game.player.effects.shield = 0;
    game.player.invincibleTimer = 1;
    addMessage(game, "Shield saved the run!", "#7bdff2");
    audio?.play("power");
    return;
  }

  game.player.health -= 1;
  game.player.invincibleTimer = 1.35;
  addMessage(game, `${sourceLabel} smacked you. Respawning...`, "#ff5d8f");
  audio?.play("hit");

  if (game.player.health <= 0) {
    finishRun(game, "loss");
    return;
  }

  respawnPlayer(game);
};

const loadLevel = (game, index) => {
  const nextLevel = cloneLevel(game.levelTemplates[index]);
  const health = game.player?.health ?? 3 + game.modifiers.extraHealth;
  const maxHealth = game.player?.maxHealth ?? 3 + game.modifiers.extraHealth;

  game.levelIndex = index;
  game.level = nextLevel;
  game.levelTime = 0;
  game.freezeTimer = 0;
  game.player = makePlayer(nextLevel.spawn, game.character, health, maxHealth);
  game.cameraX = 0;
  addMessage(game, `Level ${index + 1}: ${nextLevel.name}`);
};

export function createGame(levelTemplates, character) {
  const game = {
    character,
    modifiers: getCharacterModifiers(character),
    levelTemplates,
    levelIndex: 0,
    level: null,
    player: null,
    totalScore: getCharacterModifiers(character).startingScoreBonus,
    totalCoins: 0,
    totalTime: 0,
    levelTime: 0,
    stats: { enemiesDefeated: 0, boxesOpened: 0, sideQuestsCompleted: 0, levelsCleared: 0 },
    cameraX: 0,
    freezeTimer: 0,
    status: "playing",
    paused: false,
    result: null,
    messages: [],
  };

  loadLevel(game, 0);
  addMessage(game, `${character.name} enters the chaos run.`, character.accent);
  if (game.modifiers.startingScoreBonus > 0) {
    addMessage(game, `Combo Cache bonus: +${game.modifiers.startingScoreBonus} score`, "#f7d154");
  }
  return game;
}

export function togglePause(game) {
  if (game.status === "playing") {
    game.paused = !game.paused;
  }
}

const getSolids = (level) => [
  ...level.platforms,
  ...level.mysteryBoxes.map((mysteryBox) => ({
    id: mysteryBox.id,
    x: mysteryBox.x,
    y: mysteryBox.y,
    w: mysteryBox.w,
    h: mysteryBox.h,
    isBox: true,
    ref: mysteryBox,
  })),
];

const getEnemyRect = (enemy) => ({ x: enemy.x, y: enemy.y, w: enemy.width, h: enemy.height });

const updateMovingPlatforms = (game) => {
  for (const platform of game.level.platforms) {
    const previousX = platform.x;
    const previousY = platform.y;

    if (platform.moving) {
      const wave = Math.sin(game.totalTime * platform.moving.speed + platform.moving.phase);
      if (platform.moving.axis === "x") {
        platform.x = platform.baseX + wave * platform.moving.range;
      }

      if (platform.moving.axis === "y") {
        platform.y = platform.baseY + wave * platform.moving.range;
      }
    }

    platform.dx = platform.x - previousX;
    platform.dy = platform.y - previousY;
  }
};

const updateEnemy = (game, enemy, dt) => {
  const stats = ENEMY_STATS[enemy.type];
  const frozen = game.freezeTimer > 0;
  if (enemy.dead || frozen) {
    return;
  }

  if (enemy.type === "walker") {
    enemy.x += stats.speed * enemy.direction * dt;
    if (enemy.x <= enemy.patrolMin || enemy.x + enemy.width >= enemy.patrolMax) {
      enemy.direction *= -1;
    }
  }

  if (enemy.type === "flyer") {
    enemy.x += stats.speed * enemy.direction * dt;
    enemy.y = enemy.baseY + Math.sin(game.totalTime * 2.2 + enemy.phase + enemy.wobble) * 18;
    if (enemy.x <= enemy.patrolMin || enemy.x + enemy.width >= enemy.patrolMax) {
      enemy.direction *= -1;
    }
  }

  if (enemy.type === "chaser") {
    const distance = game.player.x - enemy.x;
    if (Math.abs(distance) < 260) {
      enemy.direction = distance > 0 ? 1 : -1;
      enemy.x += enemy.direction * stats.speed * dt;
    } else {
      enemy.x += enemy.direction * stats.speed * 0.6 * dt;
      if (enemy.x <= enemy.patrolMin || enemy.x + enemy.width >= enemy.patrolMax) {
        enemy.direction *= -1;
      }
    }
  }

  if (enemy.type === "boss") {
    const distance = game.player.x - enemy.x;
    enemy.direction = distance > 0 ? 1 : -1;
    const bossSpeed = Math.abs(distance) < 320 ? stats.speed * 1.15 : stats.speed * 0.6;
    enemy.x += enemy.direction * bossSpeed * dt;
    enemy.x = clamp(enemy.x, enemy.patrolMin, enemy.patrolMax - enemy.width);
  }
};

const handleCollectibles = (game, audio) => {
  const playerRect = insetRect(game.player, -6);
  for (const collectible of game.level.collectibles) {
    if (collectible.collected) {
      continue;
    }

    const rect = { x: collectible.x - 11, y: collectible.y - 11, w: 22, h: 22 };
    if (!overlaps(playerRect, rect)) {
      continue;
    }

    collectible.collected = true;
    audio?.play("coin");
    if (collectible.kind === "coin") {
      game.totalCoins += 1;
      addScore(game, 10);
    } else {
      addScore(game, 140);
      progressQuest(game, "collectHidden", 1);
      addMessage(game, "Hidden relic collected!", "#ffe66d");
    }
  }
};

const handleSecretRoom = (game) => {
  const room = game.level.secretRoom;
  if (room && !room.found && overlaps(game.player, room)) {
    room.found = true;
    progressQuest(game, "secretRoom", 1);
    addMessage(game, "Secret room discovered!", "#b8f2e6");
  }
};

const handleTraps = (game, audio) => {
  for (const trap of game.level.traps) {
    if (overlaps(insetRect(game.player, 8), trap)) {
      hurtPlayer(game, trap.type === "laser" ? "A laser slab" : "A trap", audio);
      return;
    }
  }
};

const handleEnemies = (game, audio) => {
  for (const enemy of game.level.enemies) {
    updateEnemy(game, enemy, game.frameDt);
    if (enemy.dead) {
      continue;
    }

    const enemyRect = getEnemyRect(enemy);
    if (!overlaps(insetRect(game.player, 4), enemyRect)) {
      continue;
    }

    const stomped =
      game.player.vy > 120 &&
      game.player.prevY + game.player.h <= enemyRect.y + enemyRect.h * 0.45;

    if (stomped) {
      enemy.hitPoints -= 1;
      game.player.vy = -ENEMY_STATS[enemy.type].bounce;
      audio?.play("stomp");

      if (enemy.hitPoints <= 0) {
        enemy.dead = true;
        game.stats.enemiesDefeated += 1;
        addScore(game, ENEMY_STATS[enemy.type].score);
        progressQuest(game, "defeatEnemies", 1);
      } else {
        addMessage(game, "Mini-boss staggered!", "#ffd166");
      }
    } else {
      hurtPlayer(game, enemy.type === "boss" ? "The mini-boss" : "An enemy", audio);
      return;
    }
  }
};

const finishLevel = (game, audio) => {
  const fastQuest = game.level.sideQuestState.find((quest) => quest.type === "finishFast");
  if (fastQuest && game.levelTime <= fastQuest.target && !fastQuest.completed) {
    fastQuest.progress = fastQuest.target;
    fastQuest.completed = true;
  }

  const newlyRewarded = game.level.sideQuestState.filter((quest) => quest.completed && !quest.rewarded);
  let questBonus = 0;
  for (const quest of newlyRewarded) {
    quest.rewarded = true;
    questBonus += quest.bonus;
    game.stats.sideQuestsCompleted += 1;
  }

  const timeRemaining = Math.max(0, Math.ceil(game.level.timeLimit - game.levelTime));
  addScore(game, 500 + timeRemaining * 12 + questBonus);
  game.stats.levelsCleared += 1;
  audio?.play("finish");

  if (game.levelIndex >= game.levelTemplates.length - 1) {
    finishRun(game, "win");
    return;
  }

  addMessage(game, `${game.level.name} cleared. Into the next mess...`, "#b8f2e6");
  loadLevel(game, game.levelIndex + 1);
};

const handleFinishPortal = (game, audio) => {
  if (overlaps(game.player, game.level.finish)) {
    finishLevel(game, audio);
  }
};

export function stepGame(game, input, dt, audio) {
  if (game.paused || game.status !== "playing") {
    return;
  }

  game.frameDt = dt;
  game.totalTime += dt;
  game.levelTime += dt;
  game.freezeTimer = Math.max(0, game.freezeTimer - dt * 1000);
  game.player.invincibleTimer = Math.max(0, game.player.invincibleTimer - dt);

  for (const key of Object.keys(game.player.effects)) {
    game.player.effects[key] = Math.max(0, game.player.effects[key] - dt * 1000);
  }

  for (const message of game.messages) {
    message.ttl -= dt * 1000;
  }
  game.messages = game.messages.filter((message) => message.ttl > 0);

  updateMovingPlatforms(game);
  const standingPlatform = game.level.platforms.find((platform) => platform.id === game.player.standingPlatformId);
  if (standingPlatform) {
    game.player.x += standingPlatform.dx;
    game.player.y += standingPlatform.dy;
  }

  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const speedBoost = game.player.effects.speed > 0 ? 1.3 : 1;
  const speed = PLAYER_BASE_SPEED * game.modifiers.speedMultiplier * speedBoost;
  game.player.vx = direction * speed;
  if (direction !== 0) {
    game.player.facing = direction;
  }

  const maxJumps = game.player.effects.extraJump > 0 ? 2 : 1;
  if (input.jumpPressed && (game.player.onGround || game.player.jumpsUsed < maxJumps)) {
    game.player.vy = -PLAYER_BASE_JUMP * game.modifiers.jumpMultiplier;
    game.player.onGround = false;
    game.player.jumpsUsed += 1;
    audio?.play("jump");
  }

  game.player.vy = clamp(game.player.vy + GRAVITY * dt, -1600, MAX_FALL_SPEED);
  game.player.prevX = game.player.x;
  game.player.prevY = game.player.y;

  const solids = getSolids(game.level);
  game.player.x += game.player.vx * dt;
  for (const solid of solids) {
    if (!overlaps(game.player, solid)) {
      continue;
    }

    if (game.player.prevX + game.player.w <= solid.x + 10) {
      game.player.x = solid.x - game.player.w;
    } else if (game.player.prevX >= solid.x + solid.w - 10) {
      game.player.x = solid.x + solid.w;
    }
  }

  game.player.y += game.player.vy * dt;
  game.player.onGround = false;
  game.player.standingPlatformId = null;
  for (const solid of solids) {
    if (!overlaps(game.player, solid)) {
      continue;
    }

    if (game.player.prevY + game.player.h <= solid.y + 10) {
      game.player.y = solid.y - game.player.h;
      game.player.vy = 0;
      game.player.onGround = true;
      game.player.jumpsUsed = 0;
      game.player.standingPlatformId = solid.id;
    } else if (game.player.prevY >= solid.y + solid.h - 8) {
      game.player.y = solid.y + solid.h;
      game.player.vy = 80;
      if (solid.isBox) {
        openMysteryBox(game, solid.ref, audio);
      }
    } else if (game.player.prevX + game.player.w <= solid.x + 12) {
      game.player.x = solid.x - game.player.w;
    } else {
      game.player.x = solid.x + solid.w;
    }
  }

  if (game.player.y > VIEW_HEIGHT + 260) {
    hurtPlayer(game, "The void", audio);
    return;
  }

  handleCollectibles(game, audio);
  handleSecretRoom(game);
  handleTraps(game, audio);
  handleEnemies(game, audio);
  if (game.status !== "playing") {
    return;
  }

  handleFinishPortal(game, audio);
  game.cameraX = clamp(game.player.x - VIEW_WIDTH * 0.35, 0, Math.max(0, game.level.worldWidth - VIEW_WIDTH));
}

export function getGameSnapshot(game) {
  return {
    levelName: game.level.name,
    levelIndex: game.levelIndex + 1,
    levelCount: game.levelTemplates.length,
    score: game.totalScore,
    coins: game.totalCoins,
    health: game.player.health,
    maxHealth: game.player.maxHealth,
    timeLeft: Math.max(0, Math.ceil(game.level.timeLimit - game.levelTime)),
    sideQuests: game.level.sideQuestState.map((quest) => ({
      id: quest.id,
      description: quest.description,
      progress: quest.progress,
      target: quest.target,
      completed: quest.completed,
    })),
    effects: Object.entries(game.player.effects)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({ key, secondsLeft: Math.ceil(value / 1000) })),
    status: game.status,
  };
}

const drawBackground = (ctx, level, cameraX) => {
  const palette = themePalettes[level.theme];
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  gradient.addColorStop(0, palette.skyTop);
  gradient.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  const loops = level.theme === "glitchWorld" ? 30 : 14;
  for (let i = 0; i < loops; i += 1) {
    const x = ((i * 170 - cameraX * (level.theme === "dreamWorld" ? 0.15 : 0.2)) % 1200) - 120;
    if (level.theme === "neonCity") {
      const height = 160 + (i % 4) * 50;
      ctx.fillStyle = `rgba(25,255,220,${0.08 + (i % 3) * 0.03})`;
      ctx.fillRect(x, VIEW_HEIGHT - 140 - height, 120, height);
      ctx.fillStyle = "rgba(255, 78, 205, 0.16)";
      ctx.fillRect(x + 18, VIEW_HEIGHT - 120 - height, 22, height - 20);
    }

    if (level.theme === "dreamWorld") {
      const y = 90 + (i % 3) * 42;
      ctx.fillStyle = `rgba(255,255,255,${0.12 + (i % 4) * 0.04})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 100, 38, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (level.theme === "jungleRuins") {
      ctx.fillStyle = `rgba(192,245,169,${0.08 + (i % 4) * 0.03})`;
      ctx.beginPath();
      ctx.moveTo(x, VIEW_HEIGHT - 120);
      ctx.lineTo(x + 30, VIEW_HEIGHT - 260);
      ctx.lineTo(x + 60, VIEW_HEIGHT - 120);
      ctx.fill();
    }

    if (level.theme === "glitchWorld") {
      const y = 70 + (i % 8) * 42;
      ctx.fillStyle = i % 2 === 0 ? "rgba(70,240,240,0.08)" : "rgba(255,0,110,0.08)";
      ctx.fillRect(x, y, 48 + (i % 3) * 20, 8);
    }
  }
};

const drawPlatforms = (ctx, level) => {
  const palette = themePalettes[level.theme];
  for (const platform of level.platforms) {
    roundedRect(ctx, platform.x, platform.y, platform.w, platform.h, 10);
    ctx.fillStyle = palette.platform;
    ctx.fill();
    ctx.fillStyle = palette.platformEdge;
    ctx.fillRect(platform.x + 8, platform.y + 6, platform.w - 16, 4);
  }
};

const drawTraps = (ctx, level) => {
  for (const trap of level.traps) {
    if (trap.type === "laser") {
      ctx.fillStyle = "#ff006e";
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
      ctx.fillStyle = "rgba(255,0,110,0.25)";
      ctx.fillRect(trap.x, trap.y - 8, trap.w, trap.h + 16);
      continue;
    }

    if (trap.type === "goo") {
      ctx.fillStyle = "#ff8fab";
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(trap.x + 5, trap.y + 3, trap.w - 10, 3);
      continue;
    }

    ctx.fillStyle = "#ff5d8f";
    const spikes = Math.max(2, Math.floor(trap.w / 16));
    for (let i = 0; i < spikes; i += 1) {
      ctx.beginPath();
      ctx.moveTo(trap.x + i * 16, trap.y + trap.h);
      ctx.lineTo(trap.x + i * 16 + 8, trap.y);
      ctx.lineTo(trap.x + i * 16 + 16, trap.y + trap.h);
      ctx.closePath();
      ctx.fill();
    }
  }
};

const drawCollectibles = (ctx, level) => {
  for (const collectible of level.collectibles) {
    if (collectible.collected) {
      continue;
    }

    if (collectible.kind === "coin") {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(collectible.x, collectible.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff2b2";
      ctx.beginPath();
      ctx.arc(collectible.x, collectible.y, 4, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.fillStyle = "#b8f2e6";
    ctx.beginPath();
    ctx.moveTo(collectible.x, collectible.y - 14);
    ctx.lineTo(collectible.x + 12, collectible.y);
    ctx.lineTo(collectible.x, collectible.y + 14);
    ctx.lineTo(collectible.x - 12, collectible.y);
    ctx.closePath();
    ctx.fill();
  }
};

const drawMysteryBoxes = (ctx, level) => {
  for (const mysteryBox of level.mysteryBoxes) {
    roundedRect(ctx, mysteryBox.x, mysteryBox.y, mysteryBox.w, mysteryBox.h, 10);
    ctx.fillStyle = mysteryBox.opened ? "#6c757d" : "#f9c74f";
    ctx.fill();
    ctx.fillStyle = mysteryBox.opened ? "#d1d5db" : "#8d4f00";
    ctx.font = "bold 26px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText(mysteryBox.opened ? "!" : "?", mysteryBox.x + mysteryBox.w / 2, mysteryBox.y + 29);
  }
};

const drawFinishPortal = (ctx, level) => {
  roundedRect(ctx, level.finish.x, level.finish.y, level.finish.w, level.finish.h, 24);
  ctx.fillStyle = "rgba(184, 242, 230, 0.2)";
  ctx.fill();
  ctx.strokeStyle = "#b8f2e6";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Space Grotesk";
  ctx.textAlign = "left";
  ctx.fillText("EXIT", level.finish.x + 12, level.finish.y - 12);
};

const getPlayerPose = (game, player) => {
  if (game.status === "won") {
    return "win";
  }

  if (player.invincibleTimer > 0.95) {
    return "hurt";
  }

  if (!player.onGround && player.vy < -120) {
    return "jump";
  }

  if (!player.onGround && player.vy > 180) {
    return "fall";
  }

  if (player.onGround && Math.abs(player.vx) > 40) {
    return "run";
  }

  return "idle";
};

const drawSpriteWithPose = (ctx, image, x, y, width, height, options = {}) => {
  if (!image?.complete) {
    return false;
  }

  const {
    facing = 1,
    angle = 0,
    scaleX = 1,
    scaleY = 1,
    yOffset = 0,
    glowColor = null,
    alpha = 1,
  } = options;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + yOffset);
  ctx.scale(facing * scaleX, scaleY);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  if (glowColor) {
    ctx.shadowBlur = 24;
    ctx.shadowColor = glowColor;
  }

  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
};

const drawEnemies = (ctx, game) => {
  for (const enemy of game.level.enemies) {
    if (enemy.dead) {
      continue;
    }

    const frozen = game.freezeTimer > 0;
    const visual = ENEMY_VISUALS[enemy.type];
    const image = getImageAsset(visual?.sprite);
    const bob = enemy.type === "flyer" ? Math.sin(game.totalTime * 8 + enemy.phase) * 2.5 : 0;

    const drewSprite = drawSpriteWithPose(
      ctx,
      image,
      enemy.x - enemy.width * 0.2,
      enemy.y - enemy.height * 0.2 + bob,
      enemy.width * 1.4,
      enemy.height * 1.4,
      {
        facing: enemy.direction >= 0 ? 1 : -1,
        angle: enemy.type === "boss" ? Math.sin(game.totalTime * 2) * 0.04 : 0,
        glowColor: frozen ? "rgba(157,180,192,0.55)" : visual?.tint,
        alpha: frozen ? 0.72 : 1,
      },
    );

    if (!drewSprite) {
      roundedRect(ctx, enemy.x, enemy.y, enemy.width, enemy.height, enemy.type === "boss" ? 24 : 16);
      ctx.fillStyle = frozen ? "#9db4c0" : visual?.tint ?? "#c0f5a9";
      ctx.fill();
    }
  }
};

const drawPlayer = (ctx, game) => {
  const player = game.player;
  const pose = getPlayerPose(game, player);
  const sprite = getImageAsset(game.character.visuals?.sprite);
  const flickerAlpha = player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0 ? 0.55 : 1;

  if (player.effects.shield > 0) {
    ctx.fillStyle = "rgba(123, 223, 242, 0.25)";
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  const pulse = Math.sin(game.totalTime * 8);
  const poseOptions = {
    idle: { yOffset: Math.sin(game.totalTime * 4) * 1.8, angle: pulse * 0.01, scaleX: 1, scaleY: 1 },
    run: { yOffset: Math.abs(pulse) * 2.6, angle: pulse * 0.1 * player.facing, scaleX: 1.03, scaleY: 0.98 },
    jump: { yOffset: -4, angle: -0.12 * player.facing, scaleX: 1, scaleY: 1.04 },
    fall: { yOffset: 2, angle: 0.12 * player.facing, scaleX: 0.98, scaleY: 1.02 },
    hurt: { yOffset: 0, angle: -0.18 * player.facing, scaleX: 1.05, scaleY: 0.95 },
    win: { yOffset: -8 - Math.abs(Math.sin(game.totalTime * 7)) * 5, angle: Math.sin(game.totalTime * 5) * 0.08, scaleX: 1.05, scaleY: 1.05 },
  }[pose];

  const drewSprite = drawSpriteWithPose(
    ctx,
    sprite,
    player.x - player.w * 0.55,
    player.y - player.h * 0.5,
    player.w * 2.1,
    player.h * 2.1,
    {
      ...poseOptions,
      facing: player.facing,
      glowColor: game.character.visuals?.glow,
      alpha: flickerAlpha,
    },
  );

  if (!drewSprite) {
    ctx.globalAlpha = flickerAlpha;
    roundedRect(ctx, player.x, player.y, player.w, player.h, 18);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.fillStyle = player.accent;
    ctx.fillRect(player.x + 6, player.y + player.h - 14, player.w - 12, 8);
  }

  if (pose === "hurt") {
    ctx.fillStyle = "rgba(255, 93, 143, 0.18)";
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
};

const drawHud = (ctx, game) => {
  const snapshot = getGameSnapshot(game);
  roundedRect(ctx, 18, 16, 305, 112, 22);
  ctx.fillStyle = "rgba(4, 11, 27, 0.72)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Space Grotesk";
  ctx.fillText(`${snapshot.levelName} (${snapshot.levelIndex}/${snapshot.levelCount})`, 34, 42);
  ctx.font = "15px Space Grotesk";
  ctx.fillText(`Score: ${snapshot.score}`, 34, 68);
  ctx.fillText(`Coins: ${snapshot.coins}`, 34, 90);
  ctx.fillText(`Time Left: ${snapshot.timeLeft}s`, 34, 112);

  roundedRect(ctx, 750, 16, 192, 112, 22);
  ctx.fillStyle = "rgba(4, 11, 27, 0.72)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Space Grotesk";
  ctx.fillText("Health", 770, 42);
  for (let index = 0; index < snapshot.maxHealth; index += 1) {
    ctx.fillStyle = index < snapshot.health ? "#ff5d8f" : "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(782 + index * 28, 80, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  const effectsText =
    snapshot.effects.length > 0
      ? snapshot.effects.map((effect) => `${effect.key} ${effect.secondsLeft}s`).join(" | ")
      : "No active buffs";
  ctx.font = "13px Space Grotesk";
  ctx.fillStyle = "#b8f2e6";
  ctx.fillText(effectsText, 770, 110);

  roundedRect(ctx, 18, 398, 290, 124, 22);
  ctx.fillStyle = "rgba(4, 11, 27, 0.72)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Space Grotesk";
  ctx.fillText("Side Quests", 34, 426);
  ctx.font = "13px Space Grotesk";
  snapshot.sideQuests.forEach((quest, index) => {
    ctx.fillStyle = quest.completed ? "#b8f2e6" : "#ffffff";
    ctx.fillText(`${quest.completed ? "Done" : `${quest.progress}/${quest.target}`}: ${quest.description}`, 34, 452 + index * 24);
  });
};

export function drawGame(ctx, game) {
  drawBackground(ctx, game.level, game.cameraX);
  ctx.save();
  ctx.translate(-game.cameraX, 0);
  drawFinishPortal(ctx, game.level);
  drawPlatforms(ctx, game.level);
  drawTraps(ctx, game.level);
  drawCollectibles(ctx, game.level);
  drawMysteryBoxes(ctx, game.level);
  drawEnemies(ctx, game);
  drawPlayer(ctx, game);
  ctx.restore();
  drawHud(ctx, game);
}
