// ============================================================
// Battle Tanks: Seeker Edition — Game Engine
// Pure game logic loop, no rendering dependencies
// ============================================================

import {
  TILE_SIZE, MAP_COLS, MAP_ROWS, MAP_WIDTH, MAP_HEIGHT,
  TARGET_FPS, FRAME_TIME, MATCH_DURATION,
  TANK_SPEED, SPAWN_INVINCIBILITY, MAX_LIVES,
  BULLET_SPEED, MAX_BULLETS_DEFAULT, BULLET_COOLDOWN,
  POWERUP_SPAWN_INTERVAL, POWERUP_DURATION_HELMET,
  POWERUP_DURATION_TIMER, POWERUP_DURATION_SHOVEL,
  MAX_BULLETS_STAR, BULLET_FAST_SPEED,
  Direction, TileType, GameState, PowerUpType,
} from './constants';
import {
  World, Tank, Bullet, PowerUp, Explosion,
  InputState, MatchConfig, TileMap, MatchResult,
} from './types';
import { createDefaultMap, MAPS } from './Maps';
import { BotAI } from './BotAI';

let nextId = 0;
function uid(): string {
  return `e_${++nextId}`;
}

export class Engine {
  world: World;
  config: MatchConfig;
  p1Input: InputState = { up: false, down: false, left: false, right: false, fire: false };
  p2Input: InputState = { up: false, down: false, left: false, right: false, fire: false };
  botAI: BotAI | null = null;
  onGameOver?: (result: MatchResult) => void;
  private lastPowerUpSpawn: number = 0;

  constructor(config: MatchConfig) {
    this.config = config;
    this.world = this.createWorld(config);
    if (config.mode === 'pve') {
      this.botAI = new BotAI(config.botDifficulty);
    }
  }

  private createWorld(config: MatchConfig): World {
    const map = MAPS[config.mapIndex] ? [...MAPS[config.mapIndex].map(r => [...r])] : createDefaultMap();

    const p1Tank = this.createTank('p1', 6, 12, Direction.UP, true, 0);
    const p2Tank = this.createTank('p2', 6, 0, Direction.DOWN, config.mode === 'pvp', 1);

    return {
      state: GameState.COUNTDOWN,
      map,
      tanks: [p1Tank, p2Tank],
      bullets: [],
      powerUps: [],
      explosions: [],
      timeRemaining: MATCH_DURATION,
      matchStartTime: Date.now(),
      bases: {
        p1: { row: 12, col: 6, destroyed: false },
        p2: { row: 0, col: 6, destroyed: false },
      },
      scores: { p1Kills: 0, p2Kills: 0 },
      shovelActive: false,
      shovelTimer: 0,
      shovelPlayerIndex: -1,
    };
  }

  private createTank(
    id: string, col: number, row: number,
    direction: Direction, isPlayer: boolean, playerIndex: number,
  ): Tank {
    return {
      id,
      x: col * TILE_SIZE,
      y: row * TILE_SIZE,
      direction,
      speed: TANK_SPEED,
      moving: false,
      lives: MAX_LIVES,
      alive: true,
      spawning: true,
      spawnTimer: SPAWN_INVINCIBILITY,
      invincible: true,
      invincibleTimer: SPAWN_INVINCIBILITY,
      maxBullets: MAX_BULLETS_DEFAULT,
      bulletSpeed: BULLET_SPEED,
      hasStar: false,
      hasHelmet: false,
      frozen: false,
      frozenTimer: 0,
      isPlayer,
      playerIndex,
      lastFireTime: 0,
      animFrame: 0,
      animTimer: 0,
    };
  }

  // ── Main update tick ──────────────────────────────────
  update(dt: number): void {
    const w = this.world;

    if (w.state === GameState.GAME_OVER || w.state === GameState.PAUSED) return;

    if (w.state === GameState.COUNTDOWN) {
      // 3-second countdown handled by UI, auto-start
      w.state = GameState.PLAYING;
      w.matchStartTime = Date.now();
      return;
    }

    // Timer
    w.timeRemaining -= dt;
    if (w.timeRemaining <= 0) {
      this.endGame('draw');
      return;
    }

    // Bot AI
    if (this.botAI) {
      this.p2Input = this.botAI.think(w, w.tanks[1], w.tanks[0], dt);
    }

    // Update tanks
    this.updateTank(w.tanks[0], this.p1Input, dt);
    this.updateTank(w.tanks[1], this.p2Input, dt);

    // Update bullets
    this.updateBullets(dt);

    // Update explosions
    this.updateExplosions(dt);

    // Update powerup timers
    this.updatePowerUpTimers(dt);

    // Spawn powerups
    this.trySpawnPowerUp(dt);

    // Check win conditions
    this.checkWinConditions();
  }

  // ── Tank movement (grid-locked, NES authentic) ─────────
  private updateTank(tank: Tank, input: InputState, dt: number): void {
    if (!tank.alive) return;

    // Spawn timer
    if (tank.spawning) {
      tank.spawnTimer -= dt;
      if (tank.spawnTimer <= 0) {
        tank.spawning = false;
        tank.invincible = false;
        tank.invincibleTimer = 0;
      }
    }

    // Invincibility timer (helmet)
    if (tank.invincible && !tank.spawning) {
      tank.invincibleTimer -= dt;
      if (tank.invincibleTimer <= 0) {
        tank.invincible = false;
        tank.hasHelmet = false;
      }
    }

    // Frozen timer
    if (tank.frozen) {
      tank.frozenTimer -= dt;
      if (tank.frozenTimer <= 0) {
        tank.frozen = false;
      }
      return; // Can't move while frozen
    }

    // Animation
    tank.animTimer += dt;
    if (tank.animTimer > 100) {
      tank.animTimer = 0;
      tank.animFrame = (tank.animFrame + 1) % 2;
    }

    // Determine direction from input
    let newDir: Direction | null = null;
    if (input.up) newDir = Direction.UP;
    else if (input.down) newDir = Direction.DOWN;
    else if (input.left) newDir = Direction.LEFT;
    else if (input.right) newDir = Direction.RIGHT;

    tank.moving = newDir !== null;

    if (newDir !== null) {
      // Turn first, then move (NES behavior)
      if (tank.direction !== newDir) {
        tank.direction = newDir;
        // Snap to grid on direction change (NES behavior)
        tank.x = Math.round(tank.x / (TILE_SIZE / 2)) * (TILE_SIZE / 2);
        tank.y = Math.round(tank.y / (TILE_SIZE / 2)) * (TILE_SIZE / 2);
      }

      // Calculate movement
      let dx = 0, dy = 0;
      switch (tank.direction) {
        case Direction.UP: dy = -tank.speed; break;
        case Direction.DOWN: dy = tank.speed; break;
        case Direction.LEFT: dx = -tank.speed; break;
        case Direction.RIGHT: dx = tank.speed; break;
      }

      const newX = tank.x + dx;
      const newY = tank.y + dy;

      // Boundary check
      if (newX >= 0 && newX <= MAP_WIDTH - TILE_SIZE &&
          newY >= 0 && newY <= MAP_HEIGHT - TILE_SIZE) {
        // Tile collision check
        if (!this.checkTileCollision(newX, newY, tank.id)) {
          // Tank-to-tank collision
          if (!this.checkTankCollision(newX, newY, tank.id)) {
            tank.x = newX;
            tank.y = newY;
          }
        }
      }
    }

    // Fire
    if (input.fire) {
      this.fireBullet(tank);
    }
  }

  // ── Tile collision ─────────────────────────────────────
  private checkTileCollision(x: number, y: number, tankId: string): boolean {
    const map = this.world.map;
    // Check all 4 corners of the tank
    const corners = [
      { col: Math.floor(x / TILE_SIZE), row: Math.floor(y / TILE_SIZE) },
      { col: Math.floor((x + TILE_SIZE - 1) / TILE_SIZE), row: Math.floor(y / TILE_SIZE) },
      { col: Math.floor(x / TILE_SIZE), row: Math.floor((y + TILE_SIZE - 1) / TILE_SIZE) },
      { col: Math.floor((x + TILE_SIZE - 1) / TILE_SIZE), row: Math.floor((y + TILE_SIZE - 1) / TILE_SIZE) },
    ];

    for (const c of corners) {
      if (c.col < 0 || c.col >= MAP_COLS || c.row < 0 || c.row >= MAP_ROWS) return true;
      const tile = map[c.row][c.col];
      if (tile === TileType.BRICK || tile === TileType.STEEL ||
          tile === TileType.WATER || tile === TileType.BASE) {
        return true;
      }
    }
    return false;
  }

  // ── Tank-to-tank collision ─────────────────────────────
  private checkTankCollision(x: number, y: number, tankId: string): boolean {
    for (const other of this.world.tanks) {
      if (other.id === tankId || !other.alive) continue;
      if (this.boxOverlap(x, y, TILE_SIZE, other.x, other.y, TILE_SIZE)) {
        return true;
      }
    }
    return false;
  }

  // ── Fire bullet ────────────────────────────────────────
  private fireBullet(tank: Tank): void {
    const now = Date.now();
    if (now - tank.lastFireTime < BULLET_COOLDOWN) return;

    const activeBullets = this.world.bullets.filter(b => b.ownerId === tank.id && b.active);
    if (activeBullets.length >= tank.maxBullets) return;

    tank.lastFireTime = now;

    let bx = tank.x, by = tank.y;
    const halfTank = TILE_SIZE / 2;
    const halfBullet = 2;
    switch (tank.direction) {
      case Direction.UP:
        bx = tank.x + halfTank - halfBullet;
        by = tank.y - 4;
        break;
      case Direction.DOWN:
        bx = tank.x + halfTank - halfBullet;
        by = tank.y + TILE_SIZE;
        break;
      case Direction.LEFT:
        bx = tank.x - 4;
        by = tank.y + halfTank - halfBullet;
        break;
      case Direction.RIGHT:
        bx = tank.x + TILE_SIZE;
        by = tank.y + halfTank - halfBullet;
        break;
    }

    const bullet: Bullet = {
      id: uid(),
      x: bx,
      y: by,
      direction: tank.direction,
      speed: tank.bulletSpeed,
      ownerId: tank.id,
      active: true,
      powerful: tank.hasStar,
    };

    this.world.bullets.push(bullet);
  }

  // ── Update bullets ─────────────────────────────────────
  private updateBullets(dt: number): void {
    for (const bullet of this.world.bullets) {
      if (!bullet.active) continue;

      let dx = 0, dy = 0;
      switch (bullet.direction) {
        case Direction.UP: dy = -bullet.speed; break;
        case Direction.DOWN: dy = bullet.speed; break;
        case Direction.LEFT: dx = -bullet.speed; break;
        case Direction.RIGHT: dx = bullet.speed; break;
      }

      bullet.x += dx;
      bullet.y += dy;

      // Boundary
      if (bullet.x < 0 || bullet.x >= MAP_WIDTH ||
          bullet.y < 0 || bullet.y >= MAP_HEIGHT) {
        bullet.active = false;
        this.spawnExplosion(bullet.x, bullet.y, false);
        continue;
      }

      // Tile collision
      const col = Math.floor(bullet.x / TILE_SIZE);
      const row = Math.floor(bullet.y / TILE_SIZE);
      if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
        const tile = this.world.map[row][col];

        if (tile === TileType.BRICK) {
          this.world.map[row][col] = TileType.EMPTY;
          bullet.active = false;
          this.spawnExplosion(bullet.x, bullet.y, false);
          continue;
        }

        if (tile === TileType.STEEL) {
          if (bullet.powerful) {
            this.world.map[row][col] = TileType.EMPTY;
          }
          bullet.active = false;
          this.spawnExplosion(bullet.x, bullet.y, false);
          continue;
        }

        if (tile === TileType.BASE) {
          this.world.map[row][col] = TileType.BASE_DESTROYED;
          bullet.active = false;
          this.spawnExplosion(bullet.x, bullet.y, true);
          // Determine which base was destroyed
          const { p1, p2 } = this.world.bases;
          if (row === p1.row && col === p1.col) {
            p1.destroyed = true;
          } else if (row === p2.row && col === p2.col) {
            p2.destroyed = true;
          }
          continue;
        }
      }

      // Tank collision
      for (const tank of this.world.tanks) {
        if (!tank.alive || tank.id === bullet.ownerId) continue;
        if (this.boxOverlap(bullet.x, bullet.y, 4, tank.x, tank.y, TILE_SIZE)) {
          bullet.active = false;
          if (tank.invincible) {
            this.spawnExplosion(bullet.x, bullet.y, false);
          } else {
            this.hitTank(tank, bullet.ownerId);
          }
          break;
        }
      }

      // Bullet-to-bullet collision
      for (const other of this.world.bullets) {
        if (other.id === bullet.id || !other.active) continue;
        if (this.boxOverlap(bullet.x, bullet.y, 4, other.x, other.y, 4)) {
          bullet.active = false;
          other.active = false;
          this.spawnExplosion(bullet.x, bullet.y, false);
        }
      }
    }

    // Cleanup inactive bullets
    this.world.bullets = this.world.bullets.filter(b => b.active);
  }

  // ── Tank hit ───────────────────────────────────────────
  private hitTank(tank: Tank, attackerId: string): void {
    tank.lives--;
    this.spawnExplosion(tank.x, tank.y, true);

    if (tank.playerIndex === 0) {
      this.world.scores.p2Kills++;
    } else {
      this.world.scores.p1Kills++;
    }

    if (tank.lives <= 0) {
      tank.alive = false;
    } else {
      // Respawn tank at base
      this.respawnTank(tank);
    }
  }

  private respawnTank(tank: Tank): void {
    const base = tank.playerIndex === 0 ? this.world.bases.p1 : this.world.bases.p2;
    tank.x = base.col * TILE_SIZE;
    tank.y = base.row * TILE_SIZE;
    tank.direction = tank.playerIndex === 0 ? Direction.UP : Direction.DOWN;
    tank.spawning = true;
    tank.spawnTimer = SPAWN_INVINCIBILITY;
    tank.invincible = true;
    tank.invincibleTimer = SPAWN_INVINCIBILITY;
    tank.hasStar = false;
    tank.hasHelmet = false;
    tank.maxBullets = MAX_BULLETS_DEFAULT;
    tank.bulletSpeed = BULLET_SPEED;
    tank.frozen = false;
  }

  // ── Explosions ─────────────────────────────────────────
  private spawnExplosion(x: number, y: number, big: boolean): void {
    this.world.explosions.push({
      id: uid(),
      x, y,
      frame: 0,
      maxFrames: big ? 5 : 3,
      timer: 0,
      big,
    });
  }

  private updateExplosions(dt: number): void {
    for (const exp of this.world.explosions) {
      exp.timer += dt;
      if (exp.timer > 80) {
        exp.timer = 0;
        exp.frame++;
      }
    }
    this.world.explosions = this.world.explosions.filter(e => e.frame < e.maxFrames);
  }

  // ── PowerUps ───────────────────────────────────────────
  private trySpawnPowerUp(dt: number): void {
    this.lastPowerUpSpawn += dt;
    if (this.lastPowerUpSpawn < POWERUP_SPAWN_INTERVAL) return;
    if (this.world.powerUps.length >= 2) return;

    this.lastPowerUpSpawn = 0;

    const types = Object.values(PowerUpType);
    const type = types[Math.floor(Math.random() * types.length)];

    // Random empty tile
    let col: number, row: number;
    let attempts = 0;
    do {
      col = Math.floor(Math.random() * MAP_COLS);
      row = 2 + Math.floor(Math.random() * (MAP_ROWS - 4)); // avoid bases
      attempts++;
    } while (this.world.map[row][col] !== TileType.EMPTY && attempts < 50);

    if (attempts >= 50) return;

    this.world.powerUps.push({
      id: uid(),
      x: col * TILE_SIZE,
      y: row * TILE_SIZE,
      type,
      active: true,
      blinkTimer: 0,
    });
  }

  private updatePowerUpTimers(dt: number): void {
    // Shovel timer
    if (this.world.shovelActive) {
      this.world.shovelTimer -= dt;
      if (this.world.shovelTimer <= 0) {
        this.world.shovelActive = false;
        this.removeShovelProtection();
      }
    }

    // Check tank-powerup collisions
    for (const tank of this.world.tanks) {
      if (!tank.alive) continue;
      for (const pu of this.world.powerUps) {
        if (!pu.active) continue;
        if (this.boxOverlap(tank.x, tank.y, TILE_SIZE, pu.x, pu.y, TILE_SIZE)) {
          this.collectPowerUp(tank, pu);
        }
      }
    }

    // Blink animation
    for (const pu of this.world.powerUps) {
      pu.blinkTimer += dt;
    }

    this.world.powerUps = this.world.powerUps.filter(p => p.active);
  }

  private collectPowerUp(tank: Tank, powerUp: PowerUp): void {
    powerUp.active = false;

    switch (powerUp.type) {
      case PowerUpType.STAR:
        tank.hasStar = true;
        tank.maxBullets = MAX_BULLETS_STAR;
        tank.bulletSpeed = BULLET_FAST_SPEED;
        break;
      case PowerUpType.HELMET:
        tank.hasHelmet = true;
        tank.invincible = true;
        tank.invincibleTimer = POWERUP_DURATION_HELMET;
        break;
      case PowerUpType.GRENADE:
        // Kill all enemy tanks (take 1 life from each)
        for (const other of this.world.tanks) {
          if (other.id !== tank.id && other.alive) {
            this.hitTank(other, tank.id);
          }
        }
        break;
      case PowerUpType.TIMER:
        // Freeze all enemies
        for (const other of this.world.tanks) {
          if (other.id !== tank.id && other.alive) {
            other.frozen = true;
            other.frozenTimer = POWERUP_DURATION_TIMER;
          }
        }
        break;
      case PowerUpType.SHOVEL:
        this.applyShovelProtection(tank.playerIndex);
        this.world.shovelActive = true;
        this.world.shovelTimer = POWERUP_DURATION_SHOVEL;
        this.world.shovelPlayerIndex = tank.playerIndex;
        break;
      case PowerUpType.TANK:
        tank.lives = Math.min(tank.lives + 1, MAX_LIVES + 2);
        break;
    }
  }

  private applyShovelProtection(playerIndex: number): void {
    const base = playerIndex === 0 ? this.world.bases.p1 : this.world.bases.p2;
    const { row, col } = base;
    // Surround base with steel
    const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (const [dr, dc] of offsets) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
        if (this.world.map[r][c] === TileType.EMPTY || this.world.map[r][c] === TileType.BRICK) {
          this.world.map[r][c] = TileType.STEEL;
        }
      }
    }
  }

  private removeShovelProtection(): void {
    const base = this.world.shovelPlayerIndex === 0
      ? this.world.bases.p1
      : this.world.bases.p2;
    const { row, col } = base;
    const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (const [dr, dc] of offsets) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
        if (this.world.map[r][c] === TileType.STEEL) {
          this.world.map[r][c] = TileType.BRICK;
        }
      }
    }
  }

  // ── Win conditions ─────────────────────────────────────
  private checkWinConditions(): void {
    const { p1, p2 } = this.world.bases;

    // Base destroyed
    if (p1.destroyed) {
      this.endGame('p2');
      return;
    }
    if (p2.destroyed) {
      this.endGame('p1');
      return;
    }

    // All lives lost
    const t1 = this.world.tanks[0];
    const t2 = this.world.tanks[1];
    if (!t1.alive && t1.lives <= 0) {
      this.endGame('p2');
      return;
    }
    if (!t2.alive && t2.lives <= 0) {
      this.endGame('p1');
      return;
    }
  }

  private endGame(winner: 'p1' | 'p2' | 'draw'): void {
    this.world.state = GameState.GAME_OVER;
    const payout = winner === 'draw'
      ? this.config.betAmount
      : this.config.betAmount * 2 * (1 - 0.05); // 95%

    const result: MatchResult = {
      winner,
      p1Kills: this.world.scores.p1Kills,
      p2Kills: this.world.scores.p2Kills,
      duration: MATCH_DURATION - this.world.timeRemaining,
      betAmount: this.config.betAmount,
      payout,
    };

    this.onGameOver?.(result);
  }

  // ── Mirror transform for P2 perspective ────────────────
  getMirroredWorld(): World {
    const w = this.world;
    return {
      ...w,
      tanks: w.tanks.map(t => ({
        ...t,
        x: t.x,
        y: MAP_HEIGHT - TILE_SIZE - t.y,
        direction: this.mirrorDirection(t.direction),
      })).reverse(),
      bullets: w.bullets.map(b => ({
        ...b,
        x: b.x,
        y: MAP_HEIGHT - b.y,
        direction: this.mirrorDirection(b.direction),
      })),
      powerUps: w.powerUps.map(p => ({
        ...p,
        y: MAP_HEIGHT - TILE_SIZE - p.y,
      })),
      explosions: w.explosions.map(e => ({
        ...e,
        y: MAP_HEIGHT - e.y,
      })),
      map: [...w.map].reverse(),
      bases: {
        p1: { ...w.bases.p2, row: MAP_ROWS - 1 - w.bases.p2.row },
        p2: { ...w.bases.p1, row: MAP_ROWS - 1 - w.bases.p1.row },
      },
      scores: {
        p1Kills: w.scores.p2Kills,
        p2Kills: w.scores.p1Kills,
      },
    };
  }

  private mirrorDirection(dir: Direction): Direction {
    switch (dir) {
      case Direction.UP: return Direction.DOWN;
      case Direction.DOWN: return Direction.UP;
      default: return dir;
    }
  }

  // ── Utility ────────────────────────────────────────────
  private boxOverlap(
    x1: number, y1: number, s1: number,
    x2: number, y2: number, s2: number,
  ): boolean {
    return x1 < x2 + s2 && x1 + s1 > x2 && y1 < y2 + s2 && y1 + s1 > y2;
  }

  // ── Input methods ──────────────────────────────────────
  setP1Input(input: InputState): void {
    this.p1Input = input;
  }

  setP2Input(input: InputState): void {
    this.p2Input = input;
  }

  getWorld(playerIndex: number): World {
    return playerIndex === 0 ? this.world : this.getMirroredWorld();
  }
}
