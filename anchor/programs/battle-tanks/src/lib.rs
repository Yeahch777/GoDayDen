// ============================================================
// Battle Tanks: Seeker Edition — On-chain Escrow Program
// Anchor framework — Solana smart contract for match betting
// ============================================================

use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("BattLeTank1111111111111111111111111111111");

// Platform fee: 5% (500 basis points)
const PLATFORM_FEE_BPS: u64 = 500;
// Genesis token holders fee: 3% (300 basis points)
const GENESIS_FEE_BPS: u64 = 300;
// Minimum bet: 0.005 SOL = 5_000_000 lamports
const MIN_BET_LAMPORTS: u64 = 5_000_000;

#[program]
pub mod battle_tanks {
    use super::*;

    /// Create a new match escrow. Player 1 deposits their bet.
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        room_id: String,
        bet_amount: u64,
    ) -> Result<()> {
        require!(bet_amount >= MIN_BET_LAMPORTS, ErrorCode::BetTooSmall);
        require!(room_id.len() <= 64, ErrorCode::RoomIdTooLong);

        let escrow = &mut ctx.accounts.escrow;
        escrow.player1 = ctx.accounts.player1.key();
        escrow.player2 = Pubkey::default();
        escrow.bet_amount = bet_amount;
        escrow.room_id = room_id;
        escrow.state = EscrowState::WaitingForPlayer2;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.bump = ctx.bumps.escrow;

        // Transfer bet from player1 to vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player1.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            bet_amount,
        )?;

        emit!(EscrowCreated {
            room_id: escrow.room_id.clone(),
            player1: escrow.player1,
            bet_amount,
        });

        Ok(())
    }

    /// Player 2 joins the match and deposits matching bet.
    pub fn join_escrow(ctx: Context<JoinEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(
            escrow.state == EscrowState::WaitingForPlayer2,
            ErrorCode::InvalidEscrowState
        );
        require!(
            ctx.accounts.player2.key() != escrow.player1,
            ErrorCode::CannotPlayYourself
        );

        escrow.player2 = ctx.accounts.player2.key();
        escrow.state = EscrowState::Active;

        // Transfer matching bet to vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player2.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            escrow.bet_amount,
        )?;

        emit!(PlayerJoined {
            room_id: escrow.room_id.clone(),
            player2: escrow.player2,
        });

        Ok(())
    }

    /// Settle the match — server authority calls with winner.
    pub fn settle_escrow(
        ctx: Context<SettleEscrow>,
        winner: Pubkey,
        has_genesis_token: bool,
    ) -> Result<()> {
        let escrow = &ctx.accounts.escrow;

        require!(
            escrow.state == EscrowState::Active,
            ErrorCode::InvalidEscrowState
        );
        require!(
            winner == escrow.player1 || winner == escrow.player2,
            ErrorCode::InvalidWinner
        );

        let total_pot = escrow.bet_amount * 2;
        let fee_bps = if has_genesis_token { GENESIS_FEE_BPS } else { PLATFORM_FEE_BPS };
        let fee = total_pot * fee_bps / 10_000;
        let payout = total_pot - fee;

        // Pay winner from vault (PDA signer)
        let room_id = escrow.room_id.as_bytes();
        let bump = escrow.bump;
        let seeds = &[b"escrow", room_id, &[bump]];
        let signer_seeds = &[&seeds[..]];

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += payout;

        // Pay platform fee
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= fee;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += fee;

        emit!(MatchSettled {
            room_id: escrow.room_id.clone(),
            winner,
            payout,
            fee,
        });

        Ok(())
    }

    /// Refund both players (draw or timeout).
    pub fn refund_escrow(ctx: Context<RefundEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;

        require!(
            escrow.state == EscrowState::Active || escrow.state == EscrowState::WaitingForPlayer2,
            ErrorCode::InvalidEscrowState
        );

        let refund_amount = escrow.bet_amount;
        let bump = escrow.bump;
        let room_id = escrow.room_id.as_bytes();
        let seeds = &[b"escrow", room_id, &[bump]];
        let _signer_seeds = &[&seeds[..]];

        // Refund player 1
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
        **ctx.accounts.player1.to_account_info().try_borrow_mut_lamports()? += refund_amount;

        // Refund player 2 (if they joined)
        if escrow.state == EscrowState::Active {
            **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
            **ctx.accounts.player2.to_account_info().try_borrow_mut_lamports()? += refund_amount;
        }

        emit!(MatchRefunded {
            room_id: escrow.room_id.clone(),
        });

        Ok(())
    }
}

// ── Accounts ─────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(room_id: String, bet_amount: u64)]
pub struct CreateEscrow<'info> {
    #[account(
        init,
        payer = player1,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", room_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    /// CHECK: Vault PDA holds the bet funds
    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub player1: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinEscrow<'info> {
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,

    /// CHECK: Vault PDA
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub player2: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleEscrow<'info> {
    #[account(mut, close = authority)]
    pub escrow: Account<'info, Escrow>,

    /// CHECK: Vault PDA
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    /// CHECK: Winner account
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,

    /// CHECK: Platform treasury
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    /// Game server authority (controls match outcomes)
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundEscrow<'info> {
    #[account(mut, close = authority)]
    pub escrow: Account<'info, Escrow>,

    /// CHECK: Vault PDA
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    /// CHECK: Player 1
    #[account(mut)]
    pub player1: UncheckedAccount<'info>,

    /// CHECK: Player 2
    #[account(mut)]
    pub player2: UncheckedAccount<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ── State ────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub bet_amount: u64,
    #[max_len(64)]
    pub room_id: String,
    pub state: EscrowState,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum EscrowState {
    WaitingForPlayer2,
    Active,
    Settled,
    Refunded,
}

// ── Events ───────────────────────────────────────────────

#[event]
pub struct EscrowCreated {
    pub room_id: String,
    pub player1: Pubkey,
    pub bet_amount: u64,
}

#[event]
pub struct PlayerJoined {
    pub room_id: String,
    pub player2: Pubkey,
}

#[event]
pub struct MatchSettled {
    pub room_id: String,
    pub winner: Pubkey,
    pub payout: u64,
    pub fee: u64,
}

#[event]
pub struct MatchRefunded {
    pub room_id: String,
}

// ── Errors ───────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Bet amount must be at least 0.005 SOL")]
    BetTooSmall,
    #[msg("Room ID too long (max 64 chars)")]
    RoomIdTooLong,
    #[msg("Invalid escrow state for this operation")]
    InvalidEscrowState,
    #[msg("Cannot play against yourself")]
    CannotPlayYourself,
    #[msg("Invalid winner address")]
    InvalidWinner,
}
