// ============================================================
// Battle Tanks: Seeker Edition — Game Screen
// Main gameplay screen with canvas + controls
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, SafeAreaView, BackHandler, Alert } from 'react-native';
import { GameCanvas } from '../components/GameCanvas';
import { DPad } from '../components/DPad';
import { InputState, MatchConfig, MatchResult } from '../game/types';
import { NES_COLORS, GameState } from '../game/constants';

interface GameScreenProps {
  config: MatchConfig;
  onGameOver: (result: MatchResult) => void;
  onExit: () => void;
}

export function GameScreen({ config, onGameOver, onExit }: GameScreenProps): React.JSX.Element {
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(true);
  const setInputRef = useRef<((input: InputState) => void) | null>(null);

  // Countdown timer
  useEffect(() => {
    if (!showCountdown) return;

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setShowCountdown(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showCountdown]);

  // Back button handler
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Leave Match',
        'If you leave, you forfeit the match and your bet.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: onExit },
        ],
      );
      return true;
    });
    return () => handler.remove();
  }, [onExit]);

  const handleInputChange = useCallback((input: InputState) => {
    setInputRef.current?.(input);
  }, []);

  const handleInputRef = useCallback((setter: (input: InputState) => void) => {
    setInputRef.current = setter;
  }, []);

  const handleGameOver = useCallback((result: MatchResult) => {
    onGameOver(result);
  }, [onGameOver]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        {/* Game info header */}
        <View style={styles.header}>
          <Text style={styles.headerMode}>
            {config.mode === 'pvp' ? 'PVP' : config.botDifficulty.toUpperCase()}
          </Text>
          <Text style={styles.headerBet}>{config.betAmount} SOL</Text>
        </View>

        {/* Canvas */}
        <View style={styles.canvasWrapper}>
          <GameCanvas
            config={config}
            onGameOver={handleGameOver}
            onInputRef={handleInputRef}
            playerIndex={config.isHost ? 0 : 1}
          />

          {/* Countdown overlay */}
          {showCountdown && (
            <View style={styles.countdownOverlay}>
              <Text style={styles.countdownText}>
                {countdown > 0 ? countdown.toString() : 'GO!'}
              </Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <DPad onInputChange={handleInputChange} />
      </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: NES_COLORS.HUD_BG,
  },
  headerMode: {
    color: NES_COLORS.GREEN,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerBet: {
    color: NES_COLORS.YELLOW,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
  },
  canvasWrapper: {
    flex: 1,
    position: 'relative',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  countdownText: {
    color: NES_COLORS.YELLOW,
    fontSize: 72,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});
