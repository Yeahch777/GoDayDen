// ============================================================
// Battle Tanks: Seeker Edition — WebSocket Client
// Handles matchmaking & game state sync
// ============================================================

import { InputState, NetworkMessage, MatchConfig } from '../game/types';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'matchmaking' | 'in_game';

export interface MatchFoundEvent {
  roomId: string;
  opponentWallet: string;
  opponentName: string;
  isHost: boolean;
  mapIndex: number;
}

export interface SocketCallbacks {
  onConnectionChange?: (state: ConnectionState) => void;
  onMatchFound?: (event: MatchFoundEvent) => void;
  onOpponentInput?: (input: InputState) => void;
  onOpponentDisconnected?: () => void;
  onError?: (error: string) => void;
}

export class SocketClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private callbacks: SocketCallbacks;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private state: ConnectionState = 'disconnected';
  private playerId: string = '';
  private roomId: string = '';

  constructor(serverUrl: string, callbacks: SocketCallbacks) {
    this.serverUrl = serverUrl;
    this.callbacks = callbacks;
  }

  connect(walletAddress: string): void {
    if (this.ws) {
      this.ws.close();
    }

    this.playerId = walletAddress;
    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        this.setState('connected');
        // Authenticate
        this.send({
          type: 'auth',
          payload: { walletAddress },
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        this.callbacks.onError?.('Connection error');
      };

      this.ws.onclose = () => {
        this.setState('disconnected');
        this.scheduleReconnect();
      };
    } catch (e) {
      console.error('[WS] Connect error:', e);
      this.setState('disconnected');
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }

  // ── Matchmaking ────────────────────────────────────────
  findMatch(betAmount: number): void {
    this.setState('matchmaking');
    this.send({
      type: 'find_match',
      payload: {
        walletAddress: this.playerId,
        betAmount,
      },
    });
  }

  cancelMatchmaking(): void {
    this.send({ type: 'cancel_match', payload: {} });
    this.setState('connected');
  }

  // ── Game sync ──────────────────────────────────────────
  sendInput(input: InputState): void {
    if (this.state !== 'in_game') return;
    this.send({
      type: 'input',
      payload: {
        roomId: this.roomId,
        input,
        timestamp: Date.now(),
      },
    });
  }

  sendGameEvent(eventType: string, data: any): void {
    this.send({
      type: 'game_event',
      payload: {
        roomId: this.roomId,
        eventType,
        data,
        timestamp: Date.now(),
      },
    });
  }

  // ── Internal ───────────────────────────────────────────
  private handleMessage(msg: any): void {
    switch (msg.type) {
      case 'match_found':
        this.roomId = msg.payload.roomId;
        this.setState('in_game');
        this.callbacks.onMatchFound?.({
          roomId: msg.payload.roomId,
          opponentWallet: msg.payload.opponentWallet,
          opponentName: msg.payload.opponentName || 'Player',
          isHost: msg.payload.isHost,
          mapIndex: msg.payload.mapIndex,
        });
        break;

      case 'opponent_input':
        this.callbacks.onOpponentInput?.(msg.payload.input);
        break;

      case 'opponent_disconnected':
        this.callbacks.onOpponentDisconnected?.();
        break;

      case 'error':
        this.callbacks.onError?.(msg.payload.message);
        break;
    }
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.callbacks.onConnectionChange?.(state);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.state === 'disconnected' && this.playerId) {
        this.connect(this.playerId);
      }
    }, 3000);
  }

  getState(): ConnectionState {
    return this.state;
  }
}
