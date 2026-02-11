// ============================================================
// Battle Tanks: Seeker Edition — Core Types
// ============================================================

import { Direction, PowerUpType, GameState, TileType } from './constants';

// Position on the pixel grid
export interface Position {
  x: number;
  y: number;
}

// Position on the tile grid
export interface TilePosition {
  col: number;
  row: number;
}

// Tank entity
export interface Tank {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  moving: boolean;
  lives: number;
  alive: boolean;
  spawning: boolean;
  spawnTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  maxBullets: number;
  bulletSpeed: number;
  hasStar: boolean;
  hasHelmet: boolean;
  frozen: boolean;
  frozenTimer: number;
  isPlayer: boolean;
  playerIndex: number; // 0 = P1, 1 = P2
  lastFireTime: number;
  // Rendering
  animFrame: number;
  animTimer: number;
}

// Bullet entity
export interface Bullet {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  ownerId: string;
  active: boolean;
  powerful: boolean; // can destroy steel walls
}

// PowerUp entity
export interface PowerUp {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
  active: boolean;
  blinkTimer: number;
}

// Explosion effect
export interface Explosion {
  id: string;
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
  timer: number;
  big: boolean;
}

// Tile map
export type TileMap = TileType[][];

// Game world state
export interface World {
  state: GameState;
  map: TileMap;
  tanks: Tank[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  explosions: Explosion[];
  timeRemaining: number;
  matchStartTime: number;
  bases: {
    p1: { row: number; col: number; destroyed: boolean };
    p2: { row: number; col: number; destroyed: boolean };
  };
  scores: {
    p1Kills: number;
    p2Kills: number;
  };
  shovelActive: boolean;
  shovelTimer: number;
  shovelPlayerIndex: number;
}

// Input state
export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
}

// Match config
export interface MatchConfig {
  mode: 'pvp' | 'pve';
  betAmount: number;
  mapIndex: number;
  botDifficulty: 'easy' | 'medium' | 'hard';
  isHost: boolean;
  playerWallet?: string;
  opponentWallet?: string;
}

// Network message types
export interface NetworkMessage {
  type: 'input' | 'state_sync' | 'game_event';
  timestamp: number;
  playerId: string;
  data: any;
}

// Game event for sync
export interface GameEvent {
  type: 'tank_destroyed' | 'bullet_hit' | 'powerup_collected' |
        'base_destroyed' | 'game_over';
  payload: any;
}

// Match result
export interface MatchResult {
  winner: 'p1' | 'p2' | 'draw';
  p1Kills: number;
  p2Kills: number;
  duration: number;
  betAmount: number;
  payout: number;
}
