// ============================================================
// Battle Tanks: Seeker Edition — Canvas Renderer
// Pure drawing functions for the NES-style game field
// ============================================================

import {
  TILE_SIZE, MAP_COLS, MAP_ROWS, MAP_WIDTH, MAP_HEIGHT,
  RENDER_SCALE, BULLET_SIZE,
  Direction, TileType, PowerUpType,
  NES_COLORS,
} from './constants';
import { World, Tank, Bullet, PowerUp, Explosion } from './types';

// All draw* functions receive a canvas 2d context and the world state.
// Coordinates are in NES pixel space (208x208), scaled by RENDER_SCALE.

export function renderWorld(ctx: CanvasRenderingContext2D, world: World, scale: number): void {
  ctx.save();
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = NES_COLORS.BLACK;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Map tiles
  renderMap(ctx, world.map);

  // PowerUps (under tanks)
  for (const pu of world.powerUps) {
    renderPowerUp(ctx, pu);
  }

  // Tanks
  for (const tank of world.tanks) {
    if (tank.alive) renderTank(ctx, tank);
  }

  // Bullets
  for (const bullet of world.bullets) {
    renderBullet(ctx, bullet);
  }

  // Forest overlay (renders on top of tanks for visibility hiding)
  renderForestOverlay(ctx, world.map);

  // Explosions (on top of everything)
  for (const exp of world.explosions) {
    renderExplosion(ctx, exp);
  }

  ctx.restore();
}

// ── Map tiles ────────────────────────────────────────────
function renderMap(ctx: CanvasRenderingContext2D, map: TileType[][]): void {
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const tile = map[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      switch (tile) {
        case TileType.BRICK:
          drawBrick(ctx, x, y);
          break;
        case TileType.STEEL:
          drawSteel(ctx, x, y);
          break;
        case TileType.WATER:
          drawWater(ctx, x, y);
          break;
        case TileType.FOREST:
          // Drawn in overlay pass
          break;
        case TileType.BASE:
          drawBase(ctx, x, y, false);
          break;
        case TileType.BASE_DESTROYED:
          drawBase(ctx, x, y, true);
          break;
      }
    }
  }
}

function renderForestOverlay(ctx: CanvasRenderingContext2D, map: TileType[][]): void {
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (map[row][col] === TileType.FOREST) {
        drawForest(ctx, col * TILE_SIZE, row * TILE_SIZE);
      }
    }
  }
}

// ── Tile drawing ─────────────────────────────────────────
function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const s = TILE_SIZE;
  ctx.fillStyle = NES_COLORS.BRICK;
  ctx.fillRect(x, y, s, s);
  // Brick pattern
  ctx.fillStyle = NES_COLORS.BRICK_DARK;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const bx = x + c * 4 + (r % 2 === 0 ? 0 : 2);
      const by = y + r * 4;
      ctx.fillRect(bx, by, 1, 4);
    }
  }
}

function drawSteel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const s = TILE_SIZE;
  ctx.fillStyle = NES_COLORS.STEEL;
  ctx.fillRect(x, y, s, s);
  // Steel rivets pattern
  ctx.fillStyle = NES_COLORS.STEEL_DARK;
  ctx.fillRect(x, y, s, 1);
  ctx.fillRect(x, y, 1, s);
  ctx.fillRect(x + s - 1, y, 1, s);
  ctx.fillRect(x, y + s - 1, s, 1);
  // Cross pattern
  ctx.fillRect(x + s / 2, y + 2, 1, s - 4);
  ctx.fillRect(x + 2, y + s / 2, s - 4, 1);
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const s = TILE_SIZE;
  ctx.fillStyle = NES_COLORS.WATER;
  ctx.fillRect(x, y, s, s);
  // Wave pattern
  ctx.fillStyle = NES_COLORS.WATER_DARK;
  const t = Date.now() / 300;
  for (let i = 0; i < s; i += 4) {
    const waveY = y + Math.floor(Math.sin(t + i / 4) * 2) + s / 2;
    ctx.fillRect(x + i, waveY, 3, 1);
  }
}

function drawForest(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const s = TILE_SIZE;
  ctx.fillStyle = NES_COLORS.FOREST;
  ctx.fillRect(x, y, s, s);
  // Tree pattern
  ctx.fillStyle = NES_COLORS.FOREST_DARK;
  ctx.fillRect(x + 2, y + 2, 4, 4);
  ctx.fillRect(x + 10, y + 2, 4, 4);
  ctx.fillRect(x + 6, y + 8, 4, 4);
  ctx.fillRect(x + 2, y + 10, 4, 4);
  ctx.fillRect(x + 10, y + 10, 4, 4);
}

function drawBase(ctx: CanvasRenderingContext2D, x: number, y: number, destroyed: boolean): void {
  const s = TILE_SIZE;
  if (destroyed) {
    ctx.fillStyle = NES_COLORS.BRICK_DARK;
    ctx.fillRect(x, y, s, s);
    // X pattern for destroyed
    ctx.fillStyle = NES_COLORS.RED;
    ctx.fillRect(x + 2, y + 2, 2, 2);
    ctx.fillRect(x + 12, y + 2, 2, 2);
    ctx.fillRect(x + 7, y + 7, 2, 2);
    ctx.fillRect(x + 2, y + 12, 2, 2);
    ctx.fillRect(x + 12, y + 12, 2, 2);
  } else {
    ctx.fillStyle = NES_COLORS.BASE;
    ctx.fillRect(x, y, s, s);
    // Eagle/flag pattern
    ctx.fillStyle = NES_COLORS.BASE_DARK;
    ctx.fillRect(x + 4, y + 2, 8, 2);
    ctx.fillRect(x + 6, y + 4, 4, 8);
    ctx.fillRect(x + 4, y + 12, 8, 2);
  }
}

// ── Tank drawing ─────────────────────────────────────────
function renderTank(ctx: CanvasRenderingContext2D, tank: Tank): void {
  // Invincibility blink
  if (tank.spawning && Math.floor(Date.now() / 100) % 2 === 0) return;

  ctx.save();

  const cx = tank.x + TILE_SIZE / 2;
  const cy = tank.y + TILE_SIZE / 2;

  ctx.translate(cx, cy);

  // Rotate based on direction
  const angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][tank.direction];
  ctx.rotate(angle);

  ctx.translate(-TILE_SIZE / 2, -TILE_SIZE / 2);

  // Colors based on player
  const colors = tank.playerIndex === 0
    ? { body: NES_COLORS.P1_BODY, tracks: NES_COLORS.P1_TRACKS, gun: NES_COLORS.P1_GUN }
    : { body: NES_COLORS.P2_BODY, tracks: NES_COLORS.P2_TRACKS, gun: NES_COLORS.P2_GUN };

  const s = TILE_SIZE;
  const f = tank.animFrame;

  // Tracks (left)
  ctx.fillStyle = colors.tracks;
  ctx.fillRect(0, 1, 3, s - 2);
  // Track tread animation
  for (let i = f; i < s - 2; i += 4) {
    ctx.fillRect(0, 1 + i, 3, 2);
  }

  // Tracks (right)
  ctx.fillRect(s - 3, 1, 3, s - 2);
  for (let i = f; i < s - 2; i += 4) {
    ctx.fillRect(s - 3, 1 + i, 3, 2);
  }

  // Body
  ctx.fillStyle = colors.body;
  ctx.fillRect(3, 3, s - 6, s - 4);

  // Gun barrel
  ctx.fillStyle = colors.gun;
  ctx.fillRect(s / 2 - 1, 0, 2, s / 2);

  // Helmet shield indicator
  if (tank.invincible && !tank.spawning) {
    ctx.strokeStyle = NES_COLORS.WHITE;
    ctx.lineWidth = 1;
    ctx.strokeRect(-1, -1, s + 2, s + 2);
  }

  ctx.restore();
}

// ── Bullet drawing ───────────────────────────────────────
function renderBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  ctx.fillStyle = NES_COLORS.WHITE;
  ctx.fillRect(bullet.x, bullet.y, BULLET_SIZE, BULLET_SIZE);
  // Bullet core
  ctx.fillStyle = NES_COLORS.YELLOW;
  ctx.fillRect(bullet.x + 1, bullet.y + 1, 2, 2);
}

// ── PowerUp drawing ──────────────────────────────────────
function renderPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUp): void {
  // Blink effect
  if (Math.floor(pu.blinkTimer / 200) % 2 === 0) return;

  const x = pu.x;
  const y = pu.y;
  const s = TILE_SIZE;

  // Glow background
  ctx.fillStyle = NES_COLORS.POWERUP_GLOW;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(x - 1, y - 1, s + 2, s + 2);
  ctx.globalAlpha = 1.0;

  // Icon based on type
  ctx.fillStyle = NES_COLORS.WHITE;
  ctx.fillRect(x, y, s, s);

  ctx.fillStyle = NES_COLORS.BLACK;

  switch (pu.type) {
    case PowerUpType.STAR:
      // Star shape
      drawPixelStar(ctx, x + 3, y + 3, 10);
      break;
    case PowerUpType.HELMET:
      // Helmet shape
      ctx.fillRect(x + 3, y + 2, 10, 3);
      ctx.fillRect(x + 2, y + 5, 12, 6);
      ctx.fillRect(x + 4, y + 11, 8, 3);
      break;
    case PowerUpType.GRENADE:
      // Grenade/bomb
      ctx.fillRect(x + 5, y + 2, 6, 3);
      ctx.fillRect(x + 3, y + 5, 10, 8);
      ctx.fillRect(x + 5, y + 13, 6, 1);
      break;
    case PowerUpType.TIMER:
      // Clock
      ctx.fillRect(x + 4, y + 2, 8, 12);
      ctx.fillStyle = NES_COLORS.WHITE;
      ctx.fillRect(x + 5, y + 3, 6, 10);
      ctx.fillStyle = NES_COLORS.BLACK;
      ctx.fillRect(x + 7, y + 5, 1, 4);
      ctx.fillRect(x + 7, y + 5, 3, 1);
      break;
    case PowerUpType.SHOVEL:
      // Shovel
      ctx.fillRect(x + 7, y + 2, 2, 8);
      ctx.fillRect(x + 4, y + 10, 8, 4);
      break;
    case PowerUpType.TANK:
      // Extra tank
      ctx.fillRect(x + 7, y + 2, 2, 4);
      ctx.fillRect(x + 3, y + 5, 10, 7);
      ctx.fillRect(x + 1, y + 6, 2, 6);
      ctx.fillRect(x + 13, y + 6, 2, 6);
      break;
  }
}

function drawPixelStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = Math.floor(size / 2);
  ctx.fillRect(x + s, y, 1, size);
  ctx.fillRect(x, y + s, size, 1);
  ctx.fillRect(x + 1, y + 1, size - 2, 1);
  ctx.fillRect(x + 1, y + size - 2, size - 2, 1);
  ctx.fillRect(x + s - 1, y + s - 1, 3, 3);
}

// ── Explosion drawing ────────────────────────────────────
function renderExplosion(ctx: CanvasRenderingContext2D, exp: Explosion): void {
  const sizes = exp.big
    ? [4, 8, 12, 16, 12, 8]
    : [4, 8, 12, 8];
  const size = sizes[Math.min(exp.frame, sizes.length - 1)];

  const cx = exp.x;
  const cy = exp.y;

  // Outer
  ctx.fillStyle = NES_COLORS.RED;
  ctx.fillRect(cx - size / 2, cy - size / 2, size, size);

  // Inner
  const inner = Math.floor(size * 0.6);
  ctx.fillStyle = NES_COLORS.YELLOW;
  ctx.fillRect(cx - inner / 2, cy - inner / 2, inner, inner);

  // Core
  const core = Math.floor(size * 0.3);
  ctx.fillStyle = NES_COLORS.WHITE;
  ctx.fillRect(cx - core / 2, cy - core / 2, core, core);
}

// ── HUD drawing ──────────────────────────────────────────
export function renderHUD(
  ctx: CanvasRenderingContext2D,
  world: World,
  canvasWidth: number,
  scale: number,
): void {
  const hudHeight = 32 * scale;
  const mapOffset = hudHeight;

  ctx.fillStyle = NES_COLORS.HUD_BG;
  ctx.fillRect(0, 0, canvasWidth, hudHeight);

  ctx.fillStyle = NES_COLORS.HUD_TEXT;
  ctx.font = `${12 * scale}px monospace`;

  // Timer
  const mins = Math.floor(world.timeRemaining / 60000);
  const secs = Math.floor((world.timeRemaining % 60000) / 1000);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  ctx.fillText(timeStr, canvasWidth / 2 - 20 * scale, 20 * scale);

  // P1 lives (bottom player = "you")
  ctx.fillStyle = NES_COLORS.P1_BODY;
  const p1 = world.tanks[0];
  for (let i = 0; i < p1.lives; i++) {
    ctx.fillRect(10 * scale + i * 14 * scale, 8 * scale, 10 * scale, 10 * scale);
  }

  // P2 lives (top player = "enemy")
  ctx.fillStyle = NES_COLORS.P2_BODY;
  const p2 = world.tanks[1];
  for (let i = 0; i < p2.lives; i++) {
    ctx.fillRect(canvasWidth - (14 * scale * (i + 1)), 8 * scale, 10 * scale, 10 * scale);
  }
}
