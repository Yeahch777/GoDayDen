// ============================================================
// Battle Tanks: Seeker Edition — Bot AI
// 3 difficulty levels: easy, medium, hard
// ============================================================

import {
  Direction, TileType, TILE_SIZE, MAP_COLS, MAP_ROWS,
  BOT_THINK_INTERVAL,
  BOT_FIRE_CHANCE_EASY, BOT_FIRE_CHANCE_MEDIUM, BOT_FIRE_CHANCE_HARD,
  BOT_DIRECTION_CHANGE_EASY, BOT_DIRECTION_CHANGE_MEDIUM, BOT_DIRECTION_CHANGE_HARD,
} from './constants';
import { World, Tank, InputState } from './types';

export class BotAI {
  difficulty: 'easy' | 'medium' | 'hard';
  thinkTimer: number = 0;
  currentInput: InputState = { up: false, down: false, left: false, right: false, fire: false };
  targetDirection: Direction = Direction.UP;
  private fireChance: number;
  private dirChangeChance: number;

  constructor(difficulty: 'easy' | 'medium' | 'hard') {
    this.difficulty = difficulty;

    switch (difficulty) {
      case 'easy':
        this.fireChance = BOT_FIRE_CHANCE_EASY;
        this.dirChangeChance = BOT_DIRECTION_CHANGE_EASY;
        break;
      case 'medium':
        this.fireChance = BOT_FIRE_CHANCE_MEDIUM;
        this.dirChangeChance = BOT_DIRECTION_CHANGE_MEDIUM;
        break;
      case 'hard':
        this.fireChance = BOT_FIRE_CHANCE_HARD;
        this.dirChangeChance = BOT_DIRECTION_CHANGE_HARD;
        break;
    }
  }

  think(world: World, me: Tank, enemy: Tank, dt: number): InputState {
    if (!me.alive || me.frozen) {
      return { up: false, down: false, left: false, right: false, fire: false };
    }

    this.thinkTimer += dt;
    if (this.thinkTimer < BOT_THINK_INTERVAL) {
      return this.currentInput;
    }
    this.thinkTimer = 0;

    // Reset input
    const input: InputState = { up: false, down: false, left: false, right: false, fire: false };

    if (this.difficulty === 'hard') {
      // Hard AI: actively pursues enemy and base
      this.hardBehavior(world, me, enemy, input);
    } else if (this.difficulty === 'medium') {
      // Medium AI: somewhat aware of enemy position
      this.mediumBehavior(world, me, enemy, input);
    } else {
      // Easy AI: mostly random movement
      this.easyBehavior(world, me, enemy, input);
    }

    this.currentInput = input;
    return input;
  }

  private easyBehavior(world: World, me: Tank, enemy: Tank, input: InputState): void {
    // Random direction changes
    if (Math.random() < this.dirChangeChance || this.isBlocked(world, me)) {
      this.targetDirection = this.randomDirection();
    }

    this.applyDirection(input, this.targetDirection);

    // Random firing
    if (Math.random() < this.fireChance) {
      input.fire = true;
    }
  }

  private mediumBehavior(world: World, me: Tank, enemy: Tank, input: InputState): void {
    // 50% chance to move toward enemy, 50% random
    if (Math.random() < 0.5) {
      this.targetDirection = this.directionToward(me, enemy);
    } else if (Math.random() < this.dirChangeChance || this.isBlocked(world, me)) {
      this.targetDirection = this.randomDirection();
    }

    this.applyDirection(input, this.targetDirection);

    // Fire when roughly aligned with enemy
    if (this.isAligned(me, enemy) || Math.random() < this.fireChance) {
      input.fire = true;
    }
  }

  private hardBehavior(world: World, me: Tank, enemy: Tank, input: InputState): void {
    // 70% pursue enemy/base, 30% tactical movement
    const enemyBase = world.bases.p1; // Bot is player 2, enemy base is p1

    if (Math.random() < 0.7) {
      // Alternate between targeting enemy tank and enemy base
      if (Math.random() < 0.6) {
        this.targetDirection = this.directionToward(me, enemy);
      } else {
        this.targetDirection = this.directionTowardPoint(
          me.x, me.y,
          enemyBase.col * TILE_SIZE, enemyBase.row * TILE_SIZE,
        );
      }
    } else if (this.isBlocked(world, me)) {
      // Try perpendicular directions
      const perpDirs = this.perpendicularDirections(this.targetDirection);
      this.targetDirection = perpDirs[Math.floor(Math.random() * perpDirs.length)];
    }

    this.applyDirection(input, this.targetDirection);

    // Aggressive firing
    if (this.isAligned(me, enemy) || Math.random() < this.fireChance) {
      input.fire = true;
    }
  }

  // ── Helpers ────────────────────────────────────────────
  private isBlocked(world: World, tank: Tank): boolean {
    let checkX = tank.x, checkY = tank.y;
    const step = TILE_SIZE;

    switch (tank.direction) {
      case Direction.UP: checkY -= step; break;
      case Direction.DOWN: checkY += step; break;
      case Direction.LEFT: checkX -= step; break;
      case Direction.RIGHT: checkX += step; break;
    }

    const col = Math.floor(checkX / TILE_SIZE);
    const row = Math.floor(checkY / TILE_SIZE);

    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return true;

    const tile = world.map[row][col];
    return tile === TileType.BRICK || tile === TileType.STEEL ||
           tile === TileType.WATER || tile === TileType.BASE;
  }

  private directionToward(from: Tank, to: Tank): Direction {
    return this.directionTowardPoint(from.x, from.y, to.x, to.y);
  }

  private directionTowardPoint(fromX: number, fromY: number, toX: number, toY: number): Direction {
    const dx = toX - fromX;
    const dy = toY - fromY;

    // Prefer the axis with larger difference (NES style: 4-way only)
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      return dy > 0 ? Direction.DOWN : Direction.UP;
    }
  }

  private isAligned(me: Tank, enemy: Tank): boolean {
    const tolerance = TILE_SIZE;
    const sameCol = Math.abs(me.x - enemy.x) < tolerance;
    const sameRow = Math.abs(me.y - enemy.y) < tolerance;

    if (sameCol) {
      if (enemy.y < me.y && me.direction === Direction.UP) return true;
      if (enemy.y > me.y && me.direction === Direction.DOWN) return true;
    }
    if (sameRow) {
      if (enemy.x < me.x && me.direction === Direction.LEFT) return true;
      if (enemy.x > me.x && me.direction === Direction.RIGHT) return true;
    }
    return false;
  }

  private randomDirection(): Direction {
    return Math.floor(Math.random() * 4) as Direction;
  }

  private perpendicularDirections(dir: Direction): Direction[] {
    if (dir === Direction.UP || dir === Direction.DOWN) {
      return [Direction.LEFT, Direction.RIGHT];
    }
    return [Direction.UP, Direction.DOWN];
  }

  private applyDirection(input: InputState, dir: Direction): void {
    switch (dir) {
      case Direction.UP: input.up = true; break;
      case Direction.DOWN: input.down = true; break;
      case Direction.LEFT: input.left = true; break;
      case Direction.RIGHT: input.right = true; break;
    }
  }
}
