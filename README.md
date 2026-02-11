# Battle Tanks: Seeker Edition

Classic NES-style tank game (Battle City) built as a dApp for Solana Seeker / dApp Store with crypto betting.

## Features

- **NES Authentic Gameplay**: 4-direction grid-based movement, 1 bullet per player, tile-based maps
- **PvP Online**: WebSocket-based real-time multiplayer with matchmaking
- **PvE**: Bot AI with 3 difficulty levels (Easy, Medium, Hard)
- **Crypto Betting**: Escrow smart contract on Solana, minimum 0.005 SOL
- **Seeker Integration**: MWA 2.0, Genesis Token detection, Seed Vault biometrics
- **Mirror Perspective**: Each player always sees themselves at the bottom

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native + Expo (bare workflow) |
| Game Engine | Custom NES-like engine with grid physics |
| Rendering | HTML5 Canvas via WebView |
| Blockchain | Solana web3.js + MWA 2.0 |
| Smart Contract | Anchor (Rust) — Escrow program |
| Multiplayer | WebSocket server (Node.js) |
| Graphics | NES palette, 16x16 pixel sprites |

## Project Structure

```
├── App.tsx                        # Main app entry
├── src/
│   ├── game/
│   │   ├── constants.ts           # Game constants, NES palette
│   │   ├── types.ts               # TypeScript types
│   │   ├── Engine.ts              # Core game loop & physics
│   │   ├── Renderer.ts            # Canvas 2D rendering
│   │   ├── Maps.ts                # 5 NES-style maps
│   │   └── BotAI.ts               # 3-level bot AI
│   ├── components/
│   │   ├── GameCanvas.tsx          # Canvas WebView bridge
│   │   └── DPad.tsx                # Virtual NES controller
│   ├── screens/
│   │   ├── MenuScreen.tsx          # Main menu + wallet
│   │   ├── GameScreen.tsx          # Gameplay screen
│   │   └── ResultScreen.tsx        # Match results + payout
│   ├── solana/
│   │   ├── WalletProvider.tsx      # MWA 2.0 integration
│   │   └── EscrowProgram.ts       # Anchor client
│   └── multiplayer/
│       └── SocketClient.ts        # WebSocket client
├── anchor/
│   └── programs/battle-tanks/     # Solana escrow program (Rust)
└── server/
    └── src/index.ts               # Matchmaking WebSocket server
```

## Quick Start

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Start multiplayer server (separate terminal)
cd server && npm install && npm run dev
```

## Game Mechanics

- **Map**: 13x13 tile grid (16px per tile)
- **Tiles**: Brick (destructible), Steel, Forest (cover), Water (impassable), Base
- **Win**: Destroy enemy base OR eliminate all enemy tanks
- **Match**: 5 min timer, 3 lives per player
- **PowerUps**: Star, Helmet, Grenade, Timer, Shovel, Extra Tank

## Betting Economy

| Tier | Amount | Fee | Genesis Fee |
|------|--------|-----|-------------|
| Bronze | 0.005 SOL | 5% | 3% |
| Silver | 0.05 SOL | 5% | 3% |
| Gold | 0.5 SOL | 5% | 3% |
| Diamond | 5.0 SOL | 5% | 3% |

95% of the pot goes to the winner. Genesis Token holders pay only 3% fee.
