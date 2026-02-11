// ============================================================
// Battle Tanks: Seeker Edition — Escrow Program Client
// Interacts with the on-chain Anchor escrow for match bets
// ============================================================

import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
} from '@solana/web3.js';
import { PLATFORM_FEE, GENESIS_FEE, BET_TIERS } from '../game/constants';

// Program ID — deployed Anchor program (placeholder — deploy and replace)
const PROGRAM_ID = new PublicKey('BattLeTank1111111111111111111111111111111');

// PDA seeds
const ESCROW_SEED = 'escrow';
const VAULT_SEED = 'vault';

interface EscrowAccount {
  player1: PublicKey;
  player2: PublicKey | null;
  betAmount: number;
  state: 'waiting' | 'active' | 'settled';
  roomId: string;
}

export class EscrowProgram {
  connection: Connection;
  programId: PublicKey;

  constructor(connection: Connection) {
    this.connection = connection;
    this.programId = PROGRAM_ID;
  }

  // ── Create escrow (host creates, deposits bet) ─────────
  async createEscrow(
    playerWallet: PublicKey,
    betAmount: number,
    roomId: string,
  ): Promise<Transaction> {
    const lamports = Math.floor(betAmount * LAMPORTS_PER_SOL);

    // Derive PDA for escrow account
    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), Buffer.from(roomId)],
      this.programId,
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_SEED), escrowPDA.toBuffer()],
      this.programId,
    );

    const tx = new Transaction();

    // Instruction: create_escrow
    // In production, this would use Anchor's instruction builder
    // For now, using a simple SOL transfer to vault PDA as placeholder
    tx.add(
      SystemProgram.transfer({
        fromPubkey: playerWallet,
        toPubkey: vaultPDA,
        lamports,
      }),
    );

    return tx;
  }

  // ── Join escrow (opponent joins, deposits matching bet) ─
  async joinEscrow(
    playerWallet: PublicKey,
    betAmount: number,
    roomId: string,
  ): Promise<Transaction> {
    const lamports = Math.floor(betAmount * LAMPORTS_PER_SOL);

    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), Buffer.from(roomId)],
      this.programId,
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_SEED), escrowPDA.toBuffer()],
      this.programId,
    );

    const tx = new Transaction();

    tx.add(
      SystemProgram.transfer({
        fromPubkey: playerWallet,
        toPubkey: vaultPDA,
        lamports,
      }),
    );

    return tx;
  }

  // ── Settle escrow (server calls after game ends) ───────
  async settleEscrow(
    roomId: string,
    winnerWallet: PublicKey,
    hasGenesisToken: boolean,
  ): Promise<Transaction> {
    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), Buffer.from(roomId)],
      this.programId,
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_SEED), escrowPDA.toBuffer()],
      this.programId,
    );

    // Fee calculation
    const fee = hasGenesisToken ? GENESIS_FEE : PLATFORM_FEE;

    const tx = new Transaction();

    // In production, this would be an Anchor instruction:
    // settle_escrow { winner, fee_rate }
    // The program would:
    // 1. Transfer (1 - fee) * total_pot to winner
    // 2. Transfer fee to platform treasury
    // 3. Close escrow account

    return tx;
  }

  // ── Refund (draw or timeout) ───────────────────────────
  async refundEscrow(
    roomId: string,
    player1: PublicKey,
    player2: PublicKey,
  ): Promise<Transaction> {
    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), Buffer.from(roomId)],
      this.programId,
    );

    const tx = new Transaction();

    // In production: refund_escrow instruction
    // Returns equal amounts to both players

    return tx;
  }

  // ── Get escrow account info ────────────────────────────
  async getEscrow(roomId: string): Promise<EscrowAccount | null> {
    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), Buffer.from(roomId)],
      this.programId,
    );

    try {
      const accountInfo = await this.connection.getAccountInfo(escrowPDA);
      if (!accountInfo) return null;

      // In production: deserialize with Anchor
      return null;
    } catch {
      return null;
    }
  }

  // ── Validate bet amount ────────────────────────────────
  static validateBet(amount: number): boolean {
    return amount >= BET_TIERS.BRONZE;
  }

  static getBetTierName(amount: number): string {
    if (amount >= BET_TIERS.DIAMOND) return 'Diamond';
    if (amount >= BET_TIERS.GOLD) return 'Gold';
    if (amount >= BET_TIERS.SILVER) return 'Silver';
    return 'Bronze';
  }

  static calculatePayout(betAmount: number, hasGenesisToken: boolean): number {
    const totalPot = betAmount * 2;
    const fee = hasGenesisToken ? GENESIS_FEE : PLATFORM_FEE;
    return totalPot * (1 - fee);
  }
}
