// ============================================================
// Battle Tanks: Seeker Edition — Main Menu Screen
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { NES_COLORS, BET_TIERS } from '../game/constants';
import { useWallet } from '../solana/WalletProvider';
import { MatchConfig } from '../game/types';
import { MAP_NAMES } from '../game/Maps';

interface MenuScreenProps {
  onStartGame: (config: MatchConfig) => void;
}

export function MenuScreen({ onStartGame }: MenuScreenProps): React.JSX.Element {
  const { connected, connecting, connect, balance, publicKey, isSeeker, hasGenesisToken } = useWallet();
  const [mode, setMode] = useState<'pvp' | 'pve'>('pve');
  const [betAmount, setBetAmount] = useState<number>(BET_TIERS.BRONZE);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [mapIndex, setMapIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const walletShort = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  const handlePlay = () => {
    onStartGame({
      mode,
      betAmount,
      mapIndex,
      botDifficulty: difficulty,
      isHost: true,
      playerWallet: publicKey?.toBase58(),
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleTop}>BATTLE TANKS</Text>
          <Text style={styles.titleSub}>SEEKER EDITION</Text>
          <View style={styles.titleLine} />
        </View>

        {/* Wallet */}
        <View style={styles.section}>
          {connected ? (
            <View style={styles.walletInfo}>
              <Text style={styles.walletAddr}>{walletShort}</Text>
              <Text style={styles.walletBal}>{balance.toFixed(4)} SOL</Text>
              {isSeeker && <Text style={styles.badge}>SEEKER</Text>}
              {hasGenesisToken && <Text style={[styles.badge, styles.genesisBadge]}>GENESIS</Text>}
            </View>
          ) : (
            <TouchableOpacity style={styles.connectBtn} onPress={connect} disabled={connecting}>
              {connecting ? (
                <ActivityIndicator color={NES_COLORS.BLACK} />
              ) : (
                <Text style={styles.connectText}>CONNECT WALLET</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Mode Select */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MODE</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'pve' && styles.modeBtnActive]}
              onPress={() => setMode('pve')}
            >
              <Text style={[styles.modeBtnText, mode === 'pve' && styles.modeBtnTextActive]}>
                VS BOT
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'pvp' && styles.modeBtnActive]}
              onPress={() => setMode('pvp')}
            >
              <Text style={[styles.modeBtnText, mode === 'pvp' && styles.modeBtnTextActive]}>
                PVP ONLINE
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bot Difficulty (only for PvE) */}
        {mode === 'pve' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DIFFICULTY</Text>
            <View style={styles.row}>
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.diffBtn, difficulty === d && styles.diffBtnActive]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[styles.diffText, difficulty === d && styles.diffTextActive]}>
                    {d.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Bet Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BET AMOUNT</Text>
          <View style={styles.row}>
            {Object.entries(BET_TIERS).map(([name, amount]) => (
              <TouchableOpacity
                key={name}
                style={[styles.betBtn, betAmount === amount && styles.betBtnActive]}
                onPress={() => setBetAmount(amount)}
              >
                <Text style={[styles.betName, betAmount === amount && styles.betNameActive]}>
                  {name}
                </Text>
                <Text style={[styles.betAmt, betAmount === amount && styles.betAmtActive]}>
                  {amount} SOL
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {hasGenesisToken && (
            <Text style={styles.feeNote}>Genesis holder: 3% fee (vs 5%)</Text>
          )}
        </View>

        {/* Map Select */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MAP</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.row}>
              {MAP_NAMES.map((name, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.mapBtn, mapIndex === i && styles.mapBtnActive]}
                  onPress={() => setMapIndex(i)}
                >
                  <Text style={[styles.mapText, mapIndex === i && styles.mapTextActive]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Play Button */}
        <TouchableOpacity
          style={[styles.playBtn, !connected && styles.playBtnDisabled]}
          onPress={handlePlay}
          disabled={!connected}
        >
          <Text style={styles.playText}>
            {mode === 'pvp' ? 'FIND MATCH' : 'PLAY'}
          </Text>
          <Text style={styles.playBet}>{betAmount} SOL</Text>
        </TouchableOpacity>

        {!connected && (
          <Text style={styles.connectHint}>Connect wallet to play</Text>
        )}

        {/* Version */}
        <Text style={styles.version}>v0.1.0 - Solana Seeker</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NES_COLORS.BLACK,
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  titleBlock: {
    alignItems: 'center',
    marginVertical: 24,
  },
  titleTop: {
    fontSize: 32,
    fontWeight: 'bold',
    color: NES_COLORS.YELLOW,
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  titleSub: {
    fontSize: 14,
    color: NES_COLORS.GREEN,
    fontFamily: 'monospace',
    letterSpacing: 6,
    marginTop: 4,
  },
  titleLine: {
    width: 200,
    height: 2,
    backgroundColor: NES_COLORS.YELLOW,
    marginTop: 12,
  },
  section: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    color: NES_COLORS.WHITE,
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  walletAddr: {
    color: NES_COLORS.WHITE,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  walletBal: {
    color: NES_COLORS.YELLOW,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: NES_COLORS.BLUE,
    color: NES_COLORS.WHITE,
    fontSize: 10,
    fontFamily: 'monospace',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  genesisBadge: {
    backgroundColor: NES_COLORS.YELLOW,
    color: NES_COLORS.BLACK,
  },
  connectBtn: {
    backgroundColor: NES_COLORS.YELLOW,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectText: {
    color: NES_COLORS.BLACK,
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
  },
  modeBtnActive: {
    borderColor: NES_COLORS.YELLOW,
    backgroundColor: '#2a2000',
  },
  modeBtnText: {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modeBtnTextActive: {
    color: NES_COLORS.YELLOW,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
  diffBtnActive: {
    borderColor: NES_COLORS.GREEN,
    backgroundColor: '#002a00',
  },
  diffText: {
    color: '#666',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
  },
  diffTextActive: {
    color: NES_COLORS.GREEN,
  },
  betBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    minWidth: 70,
  },
  betBtnActive: {
    borderColor: NES_COLORS.YELLOW,
    backgroundColor: '#2a2000',
  },
  betName: {
    color: '#666',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  betNameActive: {
    color: NES_COLORS.YELLOW,
  },
  betAmt: {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  betAmtActive: {
    color: NES_COLORS.WHITE,
  },
  feeNote: {
    color: NES_COLORS.YELLOW,
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 6,
  },
  mapBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 8,
  },
  mapBtnActive: {
    borderColor: NES_COLORS.BLUE,
    backgroundColor: '#000a2a',
  },
  mapText: {
    color: '#666',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  mapTextActive: {
    color: NES_COLORS.BLUE,
  },
  playBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 10,
    backgroundColor: NES_COLORS.GREEN,
    alignItems: 'center',
    marginTop: 10,
  },
  playBtnDisabled: {
    backgroundColor: '#333',
  },
  playText: {
    color: NES_COLORS.WHITE,
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  playBet: {
    color: NES_COLORS.YELLOW,
    fontFamily: 'monospace',
    fontSize: 14,
    marginTop: 4,
  },
  connectHint: {
    color: '#666',
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 8,
  },
  version: {
    color: '#333',
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 30,
  },
});
