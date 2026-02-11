// ============================================================
// Battle Tanks: Seeker Edition — Game Canvas Component
// React Native canvas bridge using react-native-canvas or WebView
// ============================================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Engine } from '../game/Engine';
import { InputState, MatchConfig, MatchResult } from '../game/types';
import {
  RENDER_SCALE, MAP_WIDTH, MAP_HEIGHT, FRAME_TIME,
  NES_COLORS, GameState,
} from '../game/constants';

// The game runs inside a WebView with an HTML5 Canvas for best performance
// on React Native. The engine logic runs in JS, rendering in the WebView canvas.

interface GameCanvasProps {
  config: MatchConfig;
  onGameOver: (result: MatchResult) => void;
  onInputRef?: (setInput: (input: InputState) => void) => void;
  playerIndex: number;
}

export function GameCanvas({ config, onGameOver, onInputRef, playerIndex }: GameCanvasProps): React.JSX.Element {
  const engineRef = useRef<Engine | null>(null);
  const webViewRef = useRef<WebView>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const engine = new Engine(config);
    engineRef.current = engine;

    engine.onGameOver = (result) => {
      onGameOver(result);
    };

    // Expose input setter
    onInputRef?.((input: InputState) => {
      engine.setP1Input(input);
    });

    // Game loop
    let lastTime = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;

      engine.update(dt);

      // Send world state to WebView for rendering
      const world = engine.getWorld(playerIndex);
      const msg = JSON.stringify({ type: 'render', world });
      webViewRef.current?.injectJavaScript(`
        window.renderWorld && window.renderWorld(${msg});
        true;
      `);

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [config, playerIndex]);

  // HTML for the canvas WebView
  const canvasHTML = generateCanvasHTML();

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: canvasHTML }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        originWhitelist={['*']}
      />
    </View>
  );
}

function generateCanvasHTML(): string {
  const width = MAP_WIDTH * RENDER_SCALE;
  const height = MAP_HEIGHT * RENDER_SCALE;

  return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; }
  body { background: ${NES_COLORS.BLACK}; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
  canvas { image-rendering: pixelated; image-rendering: crisp-edges; }
</style>
</head>
<body>
<canvas id="game" width="${width}" height="${height}"></canvas>
<script>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const TILE = 16;
const SCALE = ${RENDER_SCALE};
const COLS = 13;
const ROWS = 13;
const W = ${MAP_WIDTH};
const H = ${MAP_HEIGHT};

const C = ${JSON.stringify(NES_COLORS)};

ctx.imageSmoothingEnabled = false;

window.renderWorld = function(msg) {
  const { world } = typeof msg === 'string' ? JSON.parse(msg) : msg;
  if (!world) return;

  ctx.save();
  ctx.scale(SCALE, SCALE);

  // Clear
  ctx.fillStyle = C.BLACK;
  ctx.fillRect(0, 0, W, H);

  // Map
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = world.map[r][c];
      const x = c * TILE, y = r * TILE;
      if (t === 1) drawBrick(x, y);
      else if (t === 2) drawSteel(x, y);
      else if (t === 4) drawWater(x, y);
      else if (t === 5) drawBase(x, y, false);
      else if (t === 6) drawBase(x, y, true);
    }
  }

  // PowerUps
  if (world.powerUps) {
    for (const pu of world.powerUps) {
      if (Math.floor(pu.blinkTimer / 200) % 2 !== 0) {
        ctx.fillStyle = C.WHITE;
        ctx.fillRect(pu.x, pu.y, TILE, TILE);
        ctx.fillStyle = C.RED;
        ctx.fillRect(pu.x + 3, pu.y + 3, TILE - 6, TILE - 6);
      }
    }
  }

  // Tanks
  if (world.tanks) {
    for (const tank of world.tanks) {
      if (!tank.alive) continue;
      if (tank.spawning && Math.floor(Date.now() / 100) % 2 === 0) continue;
      drawTank(tank);
    }
  }

  // Bullets
  if (world.bullets) {
    for (const b of world.bullets) {
      ctx.fillStyle = C.WHITE;
      ctx.fillRect(b.x, b.y, 4, 4);
      ctx.fillStyle = C.YELLOW;
      ctx.fillRect(b.x + 1, b.y + 1, 2, 2);
    }
  }

  // Forest overlay
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (world.map[r][c] === 3) drawForest(c * TILE, r * TILE);
    }
  }

  // Explosions
  if (world.explosions) {
    for (const e of world.explosions) {
      const sizes = e.big ? [4,8,12,16,12,8] : [4,8,12,8];
      const sz = sizes[Math.min(e.frame, sizes.length - 1)];
      ctx.fillStyle = C.RED;
      ctx.fillRect(e.x - sz/2, e.y - sz/2, sz, sz);
      const inner = Math.floor(sz * 0.6);
      ctx.fillStyle = C.YELLOW;
      ctx.fillRect(e.x - inner/2, e.y - inner/2, inner, inner);
    }
  }

  ctx.restore();

  // HUD
  ctx.fillStyle = C.HUD_BG;
  ctx.fillRect(0, 0, canvas.width, 24);
  ctx.fillStyle = C.HUD_TEXT;
  ctx.font = (10 * SCALE) + 'px monospace';
  const mins = Math.floor(world.timeRemaining / 60000);
  const secs = Math.floor((world.timeRemaining % 60000) / 1000);
  ctx.fillText(mins + ':' + String(secs).padStart(2, '0'), canvas.width/2 - 15, 18);

  if (world.tanks && world.tanks[0]) {
    ctx.fillStyle = C.P1_BODY;
    for (let i = 0; i < world.tanks[0].lives; i++) ctx.fillRect(8 + i * 14, 6, 10, 10);
  }
  if (world.tanks && world.tanks[1]) {
    ctx.fillStyle = C.P2_BODY;
    for (let i = 0; i < world.tanks[1].lives; i++) ctx.fillRect(canvas.width - 18 - i * 14, 6, 10, 10);
  }
};

function drawBrick(x, y) {
  ctx.fillStyle = C.BRICK;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = C.BRICK_DARK;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillRect(x + c*4 + (r%2===0?0:2), y + r*4, 1, 4);
    }
  }
}

function drawSteel(x, y) {
  ctx.fillStyle = C.STEEL;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = C.STEEL_DARK;
  ctx.fillRect(x, y, TILE, 1);
  ctx.fillRect(x, y, 1, TILE);
  ctx.fillRect(x+TILE-1, y, 1, TILE);
  ctx.fillRect(x, y+TILE-1, TILE, 1);
}

function drawWater(x, y) {
  ctx.fillStyle = C.WATER;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = C.WATER_DARK;
  const t = Date.now() / 300;
  for (let i = 0; i < TILE; i += 4) {
    ctx.fillRect(x+i, y + Math.floor(Math.sin(t+i/4)*2) + TILE/2, 3, 1);
  }
}

function drawForest(x, y) {
  ctx.fillStyle = C.FOREST;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = C.FOREST_DARK;
  ctx.fillRect(x+2,y+2,4,4);
  ctx.fillRect(x+10,y+2,4,4);
  ctx.fillRect(x+6,y+8,4,4);
}

function drawBase(x, y, destroyed) {
  if (destroyed) {
    ctx.fillStyle = C.BRICK_DARK;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = C.RED;
    ctx.fillRect(x+3,y+3,2,2);
    ctx.fillRect(x+11,y+3,2,2);
    ctx.fillRect(x+7,y+7,2,2);
    ctx.fillRect(x+3,y+11,2,2);
    ctx.fillRect(x+11,y+11,2,2);
  } else {
    ctx.fillStyle = C.BASE;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = C.BASE_DARK;
    ctx.fillRect(x+4,y+2,8,2);
    ctx.fillRect(x+6,y+4,4,8);
    ctx.fillRect(x+4,y+12,8,2);
  }
}

function drawTank(tank) {
  ctx.save();
  const cx = tank.x + TILE/2, cy = tank.y + TILE/2;
  ctx.translate(cx, cy);
  const angles = [0, Math.PI/2, Math.PI, -Math.PI/2];
  ctx.rotate(angles[tank.direction]);
  ctx.translate(-TILE/2, -TILE/2);

  const isP1 = tank.playerIndex === 0;
  const body = isP1 ? C.P1_BODY : C.P2_BODY;
  const tracks = isP1 ? C.P1_TRACKS : C.P2_TRACKS;
  const gun = isP1 ? C.P1_GUN : C.P2_GUN;
  const f = tank.animFrame || 0;

  // Tracks
  ctx.fillStyle = tracks;
  ctx.fillRect(0, 1, 3, TILE-2);
  ctx.fillRect(TILE-3, 1, 3, TILE-2);
  for (let i = f; i < TILE-2; i += 4) {
    ctx.fillRect(0, 1+i, 3, 2);
    ctx.fillRect(TILE-3, 1+i, 3, 2);
  }

  // Body
  ctx.fillStyle = body;
  ctx.fillRect(3, 3, TILE-6, TILE-4);

  // Gun
  ctx.fillStyle = gun;
  ctx.fillRect(TILE/2-1, 0, 2, TILE/2);

  // Shield
  if (tank.invincible && !tank.spawning) {
    ctx.strokeStyle = C.WHITE;
    ctx.lineWidth = 1;
    ctx.strokeRect(-1, -1, TILE+2, TILE+2);
  }

  ctx.restore();
}
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NES_COLORS.BLACK,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
