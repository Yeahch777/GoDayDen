// ============================================================
// Battle Tanks: Seeker Edition — Solana Wallet Provider
// Mobile Wallet Adapter (MWA) 2.0 integration
// ============================================================

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PublicKey, Transaction, Connection, clusterApiUrl } from '@solana/web3.js';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

const DEVNET_ENDPOINT = clusterApiUrl('devnet');
const MAINNET_ENDPOINT = clusterApiUrl('mainnet-beta');

interface WalletContextType {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  balance: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSendTransaction: (transaction: Transaction) => Promise<string>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  connection: Connection;
  isSeeker: boolean;
  hasGenesisToken: boolean;
}

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

export function useWallet(): WalletContextType {
  return useContext(WalletContext);
}

// Detect Seeker device
async function detectSeeker(): Promise<boolean> {
  try {
    // Check for Seeker-specific user agent or native module
    // In production, use @solana-mobile/seeker-utils
    return false; // Will be implemented with actual Seeker detection
  } catch {
    return false;
  }
}

// Check for Solana Genesis Token (SGT)
async function checkGenesisToken(connection: Connection, wallet: PublicKey): Promise<boolean> {
  try {
    // SGT mint address (placeholder — replace with actual mint in production)
    const SGT_MINT = 'SeekerGenesisTokenMintAddress11111111111';
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      mint: new PublicKey(SGT_MINT),
    });
    return tokenAccounts.value.length > 0;
  } catch {
    return false;
  }
}

interface WalletProviderProps {
  children: ReactNode;
  network?: 'devnet' | 'mainnet-beta';
}

export function WalletProvider({ children, network = 'devnet' }: WalletProviderProps): React.JSX.Element {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isSeeker, setIsSeeker] = useState(false);
  const [hasGenesisToken, setHasGenesisToken] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const endpoint = network === 'mainnet-beta' ? MAINNET_ENDPOINT : DEVNET_ENDPOINT;
  const connection = new Connection(endpoint, 'confirmed');

  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);

    try {
      await transact(async (wallet: Web3MobileWallet) => {
        // Authorize with the wallet
        const authResult = await wallet.authorize({
          identity: {
            name: 'Battle Tanks: Seeker Edition',
            uri: 'https://battletanks.gg',
            icon: 'favicon.ico',
          },
          cluster: network,
        });

        const pubKey = new PublicKey(authResult.accounts[0].address);
        setPublicKey(pubKey);
        setAuthToken(authResult.auth_token);
        setConnected(true);

        // Fetch balance
        const bal = await connection.getBalance(pubKey);
        setBalance(bal / 1e9); // Convert lamports to SOL

        // Check Seeker & Genesis Token
        const seekerDetected = await detectSeeker();
        setIsSeeker(seekerDetected);

        const hasToken = await checkGenesisToken(connection, pubKey);
        setHasGenesisToken(hasToken);
      });
    } catch (error) {
      console.error('Wallet connect error:', error);
    } finally {
      setConnecting(false);
    }
  }, [connecting, network, connection]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setConnected(false);
    setBalance(0);
    setAuthToken(null);
  }, []);

  const signAndSendTransaction = useCallback(async (transaction: Transaction): Promise<string> => {
    if (!publicKey) throw new Error('Wallet not connected');

    return await transact(async (wallet: Web3MobileWallet) => {
      // Reauthorize if needed
      if (authToken) {
        await wallet.reauthorize({
          auth_token: authToken,
          identity: { name: 'Battle Tanks: Seeker Edition', uri: 'https://battletanks.gg', icon: 'favicon.ico' },
        });
      }

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign and send
      const signatures = await wallet.signAndSendTransactions({
        transactions: [transaction],
      });

      return signatures[0] as unknown as string;
    });
  }, [publicKey, authToken, connection]);

  const signTransaction = useCallback(async (transaction: Transaction): Promise<Transaction> => {
    if (!publicKey) throw new Error('Wallet not connected');

    return await transact(async (wallet: Web3MobileWallet) => {
      if (authToken) {
        await wallet.reauthorize({
          auth_token: authToken,
          identity: { name: 'Battle Tanks: Seeker Edition', uri: 'https://battletanks.gg', icon: 'favicon.ico' },
        });
      }

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signed = await wallet.signTransactions({
        transactions: [transaction],
      });

      return signed[0];
    });
  }, [publicKey, authToken, connection]);

  const value: WalletContextType = {
    publicKey,
    connected,
    connecting,
    balance,
    connect,
    disconnect,
    signAndSendTransaction,
    signTransaction,
    connection,
    isSeeker,
    hasGenesisToken,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
