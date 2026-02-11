// ============================================================
// Battle Tanks: Seeker Edition — Result Screen
// Post-match results with payout info
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated,
} from 'react-native';
import { MatchResult } from '../game/types';
import { NES_COLORS, PLATFORM_FEE, GENESIS_FEE } from '../game/constants';
import { useWallet } from '../solana/WalletProvider';

interface ResultScreenProps {
  result: MatchResult;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export function ResultScreen({ result, onPlayAgain, onMenu }: ResultScreenProps): React.JSX.Element {
  const { hasGenesisToken } = useWallet();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isWin = result.winner === 'p1';
  const isDraw = result.winner === 'draw';
  const fee = hasGenesisToken ? GENESIS_FEE : PLATFORM_FEE;

  const durationMin = Math.floor(result.duration / 60000);
  const durationSec = Math.floor((result.duration % 60000) / 1000);

  return (
    <SafeAreaView style={styles.root}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Result Banner */}
        <View style={[styles.banner, isWin ? styles.bannerWin : isDraw ? styles.bannerDraw : styles.bannerLose]}>
          <Text style={styles.bannerText}>
            {isWin ? 'VICTORY!' : isDraw ? 'DRAW' : 'DEFEAT'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsBlock}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{durationMin}:{String(durationSec).padStart(2, '0')}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Your Kills</Text>
            <Text style={styles.statValue}>{result.p1Kills}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Enemy Kills</Text>
            <Text style={styles.statValue}>{result.p2Kills}</Text>
          </View>
        </View>

        {/* Payout */}
        <View style={styles.payoutBlock}>
          <Text style={styles.payoutTitle}>
            {isWin ? 'PAYOUT' : isDraw ? 'REFUND' : 'BET LOST'}
          </Text>
          <Text style={[styles.payoutAmount, isWin && styles.payoutWin, !isWin && !isDraw && styles.payoutLose]}>
            {isWin ? '+' : isDraw ? '' : '-'}{isWin ? result.payout.toFixed(4) : isDraw ? result.betAmount.toFixed(4) : result.betAmount.toFixed(4)} SOL
          </Text>
          {isWin && (
            <Text style={styles.feeNote}>
              Fee: {(fee * 100).toFixed(0)}% {hasGenesisToken ? '(Genesis discount)' : ''}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.playAgainBtn} onPress={onPlayAgain}>
            <Text style={styles.playAgainText}>PLAY AGAIN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={onMenu}>
            <Text style={styles.menuText}>MENU</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NES_COLORS.BLACK,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  banner: {
    width: '100%',
    paddingVertical: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  bannerWin: {
    backgroundColor: '#003300',
    borderWidth: 2,
    borderColor: NES_COLORS.GREEN,
  },
  bannerDraw: {
    backgroundColor: '#1a1a00',
    borderWidth: 2,
    borderColor: NES_COLORS.YELLOW,
  },
  bannerLose: {
    backgroundColor: '#330000',
    borderWidth: 2,
    borderColor: NES_COLORS.RED,
  },
  bannerText: {
    fontSize: 40,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: NES_COLORS.WHITE,
    letterSpacing: 6,
  },
  statsBlock: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  statLabel: {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 14,
  },
  statValue: {
    color: NES_COLORS.WHITE,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
  },
  payoutBlock: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111',
    borderRadius: 8,
    marginBottom: 30,
  },
  payoutTitle: {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 8,
  },
  payoutAmount: {
    fontFamily: 'monospace',
    fontSize: 28,
    fontWeight: 'bold',
    color: NES_COLORS.WHITE,
  },
  payoutWin: {
    color: NES_COLORS.GREEN,
  },
  payoutLose: {
    color: NES_COLORS.RED,
  },
  feeNote: {
    color: '#666',
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 6,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  playAgainBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: NES_COLORS.GREEN,
    alignItems: 'center',
  },
  playAgainText: {
    color: NES_COLORS.WHITE,
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  menuBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
  },
  menuText: {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
