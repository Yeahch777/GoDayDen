// ============================================================
// Battle Tanks: Seeker Edition — Matchmaking Server
// WebSocket server for real-time PvP multiplayer
// Can be deployed as Node.js server or Cloudflare Worker
// ============================================================

import { WebSocketServer, WebSocket } from 'ws';

// ── Types ────────────────────────────────────────────────

interface Player {
  ws: WebSocket;
  walletAddress: string;
  roomId: string | null;
  betAmount: number;
}

interface Room {
  id: string;
  player1: Player;
  player2: Player | null;
  betAmount: number;
  mapIndex: number;
  state: 'waiting' | 'active' | 'finished';
  createdAt: number;
}

// ── Server State ─────────────────────────────────────────

const players = new Map<WebSocket, Player>();
const rooms = new Map<string, Room>();
const matchmakingQueue = new Map<number, Player[]>(); // betAmount -> waiting players

const PORT = parseInt(process.env.PORT || '8080', 10);

// ── WebSocket Server ─────────────────────────────────────

const wss = new WebSocketServer({ port: PORT });

console.log(`Battle Tanks server running on port ${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  console.log('New connection');

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(ws, msg);
    } catch (e) {
      console.error('Parse error:', e);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

// ── Message Handler ──────────────────────────────────────

function handleMessage(ws: WebSocket, msg: any): void {
  switch (msg.type) {
    case 'auth':
      handleAuth(ws, msg.payload);
      break;
    case 'find_match':
      handleFindMatch(ws, msg.payload);
      break;
    case 'cancel_match':
      handleCancelMatch(ws);
      break;
    case 'input':
      handleInput(ws, msg.payload);
      break;
    case 'game_event':
      handleGameEvent(ws, msg.payload);
      break;
  }
}

// ── Auth ─────────────────────────────────────────────────

function handleAuth(ws: WebSocket, payload: { walletAddress: string }): void {
  const player: Player = {
    ws,
    walletAddress: payload.walletAddress,
    roomId: null,
    betAmount: 0,
  };
  players.set(ws, player);
  send(ws, { type: 'auth_ok', payload: { walletAddress: payload.walletAddress } });
}

// ── Matchmaking ──────────────────────────────────────────

function handleFindMatch(ws: WebSocket, payload: { walletAddress: string; betAmount: number }): void {
  const player = players.get(ws);
  if (!player) return;

  player.betAmount = payload.betAmount;

  // Check for waiting players with same bet
  const queue = matchmakingQueue.get(payload.betAmount) || [];

  // Find an opponent (not self)
  const opponentIdx = queue.findIndex(p => p.walletAddress !== player.walletAddress && p.ws.readyState === WebSocket.OPEN);

  if (opponentIdx !== -1) {
    const opponent = queue.splice(opponentIdx, 1)[0];
    matchmakingQueue.set(payload.betAmount, queue);

    // Create room
    const roomId = generateRoomId();
    const mapIndex = Math.floor(Math.random() * 5);

    const room: Room = {
      id: roomId,
      player1: opponent,
      player2: player,
      betAmount: payload.betAmount,
      mapIndex,
      state: 'active',
      createdAt: Date.now(),
    };

    rooms.set(roomId, room);
    opponent.roomId = roomId;
    player.roomId = roomId;

    // Notify both players
    send(opponent.ws, {
      type: 'match_found',
      payload: {
        roomId,
        opponentWallet: player.walletAddress,
        opponentName: shortenAddress(player.walletAddress),
        isHost: true,
        mapIndex,
      },
    });

    send(player.ws, {
      type: 'match_found',
      payload: {
        roomId,
        opponentWallet: opponent.walletAddress,
        opponentName: shortenAddress(opponent.walletAddress),
        isHost: false,
        mapIndex,
      },
    });

    console.log(`Match created: ${roomId} (${shortenAddress(opponent.walletAddress)} vs ${shortenAddress(player.walletAddress)})`);
  } else {
    // Add to queue
    queue.push(player);
    matchmakingQueue.set(payload.betAmount, queue);
    send(ws, { type: 'matchmaking', payload: { status: 'searching', queueSize: queue.length } });
  }
}

function handleCancelMatch(ws: WebSocket): void {
  const player = players.get(ws);
  if (!player) return;

  // Remove from all queues
  for (const [betAmount, queue] of matchmakingQueue.entries()) {
    const idx = queue.indexOf(player);
    if (idx !== -1) {
      queue.splice(idx, 1);
      matchmakingQueue.set(betAmount, queue);
    }
  }
}

// ── Game Input Relay ─────────────────────────────────────

function handleInput(ws: WebSocket, payload: { roomId: string; input: any; timestamp: number }): void {
  const room = rooms.get(payload.roomId);
  if (!room || room.state !== 'active') return;

  // Relay input to opponent
  const opponent = room.player1.ws === ws ? room.player2 : room.player1;
  if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
    send(opponent.ws, {
      type: 'opponent_input',
      payload: { input: payload.input, timestamp: payload.timestamp },
    });
  }
}

// ── Game Events ──────────────────────────────────────────

function handleGameEvent(ws: WebSocket, payload: { roomId: string; eventType: string; data: any }): void {
  const room = rooms.get(payload.roomId);
  if (!room) return;

  // Relay event to opponent
  const opponent = room.player1.ws === ws ? room.player2 : room.player1;
  if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
    send(opponent.ws, {
      type: 'game_event',
      payload: { eventType: payload.eventType, data: payload.data },
    });
  }

  // Handle match end
  if (payload.eventType === 'game_over') {
    room.state = 'finished';
    console.log(`Match ${room.id} ended. Winner: ${payload.data.winner}`);
    // Trigger escrow settlement (would call Solana program via server keypair)
  }
}

// ── Disconnect ───────────────────────────────────────────

function handleDisconnect(ws: WebSocket): void {
  const player = players.get(ws);
  if (!player) return;

  // Remove from matchmaking
  handleCancelMatch(ws);

  // Notify opponent if in room
  if (player.roomId) {
    const room = rooms.get(player.roomId);
    if (room && room.state === 'active') {
      const opponent = room.player1.ws === ws ? room.player2 : room.player1;
      if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
        send(opponent.ws, { type: 'opponent_disconnected', payload: {} });
      }
      room.state = 'finished';
    }
  }

  players.delete(ws);
  console.log(`Player disconnected: ${shortenAddress(player.walletAddress)}`);
}

// ── Utilities ────────────────────────────────────────────

function send(ws: WebSocket, data: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function generateRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 8) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

// ── Room Cleanup (every 10 min) ──────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    // Remove rooms older than 30 minutes
    if (now - room.createdAt > 30 * 60 * 1000) {
      rooms.delete(id);
    }
  }
}, 10 * 60 * 1000);
