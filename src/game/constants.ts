// ============================================================
// Battle Tanks: Seeker Edition — Game Constants
// NES Battle City faithful recreation
// ============================================================

// Grid & Map
export const TILE_SIZE = 16; // NES standard tile
export const MAP_COLS = 13;
export const MAP_ROWS = 13;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE; // 208
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE; // 208

// Rendering scale — we upscale the 208px NES field to fit phone screen
export const RENDER_SCALE = 3; // 208 * 3 = 624px
export const SCREEN_MAP_SIZE = MAP_WIDTH * RENDER_SCALE;

// Timing
export const TARGET_FPS = 60;
export const FRAME_TIME = 1000 / TARGET_FPS; // ~16.67ms
export const MATCH_DURATION = 5 * 60 * 1000; // 5 minutes

// Tank
export const TANK_SIZE = TILE_SIZE; // 16px
export const TANK_SPEED = 1; // pixels per frame (NES authentic)
export const TANK_FAST_SPEED = 2;
export const SPAWN_INVINCIBILITY = 3000; // 3 seconds after spawn
export const MAX_LIVES = 3;

// Bullet
export const BULLET_SIZE = 4;
export const BULLET_SPEED = 3; // ~2x tank speed
export const BULLET_FAST_SPEED = 5;
export const MAX_BULLETS_DEFAULT = 1;
export const MAX_BULLETS_STAR = 2;
export const BULLET_COOLDOWN = 500; // ms

// PowerUp
export const POWERUP_DURATION_HELMET = 10000; // 10s
export const POWERUP_DURATION_TIMER = 5000; // 5s
export const POWERUP_DURATION_SHOVEL = 15000; // 15s
export const POWERUP_SPAWN_INTERVAL = 15000; // every 15s a random powerup appears

// Bot AI
export const BOT_THINK_INTERVAL = 500; // ms between AI decisions
export const BOT_FIRE_CHANCE_EASY = 0.3;
export const BOT_FIRE_CHANCE_MEDIUM = 0.5;
export const BOT_FIRE_CHANCE_HARD = 0.8;
export const BOT_DIRECTION_CHANGE_EASY = 0.15;
export const BOT_DIRECTION_CHANGE_MEDIUM = 0.1;
export const BOT_DIRECTION_CHANGE_HARD = 0.05;

// Directions (NES: 4-way only)
export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

// Tile Types
export enum TileType {
  EMPTY = 0,
  BRICK = 1,
  STEEL = 2,
  FOREST = 3,
  WATER = 4,
  BASE = 5,
  BASE_DESTROYED = 6,
}

// Entity types
export enum EntityType {
  PLAYER = 'player',
  BOT = 'bot',
  BULLET = 'bullet',
  POWERUP = 'powerup',
}

// PowerUp types
export enum PowerUpType {
  STAR = 'star',
  HELMET = 'helmet',
  GRENADE = 'grenade',
  TIMER = 'timer',
  SHOVEL = 'shovel',
  TANK = 'tank',
}

// Game states
export enum GameState {
  WAITING = 'waiting',
  COUNTDOWN = 'countdown',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
}

// NES Color Palette
export const NES_COLORS = {
  // Background
  BLACK: '#000000',
  WHITE: '#FCFCFC',

  // Player 1 — yellow tank
  P1_BODY: '#FCE83A',
  P1_TRACKS: '#A46422',
  P1_GUN: '#7C7C7C',

  // Player 2 / Enemy — green tank
  P2_BODY: '#3CBF3C',
  P2_TRACKS: '#0C8020',
  P2_GUN: '#7C7C7C',

  // Bot tanks
  BOT_BODY: '#BCBCBC',
  BOT_TRACKS: '#7C7C7C',
  BOT_GUN: '#505050',

  // Terrain
  BRICK: '#BC4430',
  BRICK_DARK: '#8C2020',
  STEEL: '#C0C0C0',
  STEEL_DARK: '#808080',
  WATER: '#3CBCFC',
  WATER_DARK: '#0078F8',
  FOREST: '#00A800',
  FOREST_DARK: '#006800',
  BASE: '#FC9838',
  BASE_DARK: '#A45000',

  // UI
  HUD_BG: '#1C1C1C',
  HUD_TEXT: '#FCFCFC',
  RED: '#FC0000',
  BLUE: '#0058F8',
  YELLOW: '#FCE83A',
  GREEN: '#00A800',

  // PowerUp glow
  POWERUP_GLOW: '#FC0000',
};

// Betting tiers
export const BET_TIERS = {
  BRONZE: 0.005,   // ~$1
  SILVER: 0.05,    // ~$10
  GOLD: 0.5,       // ~$100
  DIAMOND: 5.0,    // ~$1000
} as const;

export const PLATFORM_FEE = 0.05; // 5%
export const GENESIS_FEE = 0.03;  // 3% for Genesis Token holders
