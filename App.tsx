// ============================================================
// Battle Tanks: Seeker Edition
// Main App — Navigation between screens
// ============================================================

import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { WalletProvider } from './src/solana/WalletProvider';
import { MenuScreen } from './src/screens/MenuScreen';
import { GameScreen } from './src/screens/GameScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { MatchConfig, MatchResult } from './src/game/types';
import { NES_COLORS } from './src/game/constants';

type Screen = 'menu' | 'game' | 'result';

export default function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameConfig, setGameConfig] = useState<MatchConfig | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const handleStartGame = useCallback((config: MatchConfig) => {
    setGameConfig(config);
    setScreen('game');
  }, []);

  const handleGameOver = useCallback((result: MatchResult) => {
    setMatchResult(result);
    setScreen('result');
  }, []);

  const handlePlayAgain = useCallback(() => {
    if (gameConfig) {
      setScreen('game');
    }
  }, [gameConfig]);

  const handleMenu = useCallback(() => {
    setScreen('menu');
    setGameConfig(null);
    setMatchResult(null);
  }, []);

  return (
    <WalletProvider network="devnet">
      <View style={styles.root}>
        <StatusBar style="light" />

        {screen === 'menu' && (
          <MenuScreen onStartGame={handleStartGame} />
        )}

        {screen === 'game' && gameConfig && (
          <GameScreen
            config={gameConfig}
            onGameOver={handleGameOver}
            onExit={handleMenu}
          />
        )}

        {screen === 'result' && matchResult && (
          <ResultScreen
            result={matchResult}
            onPlayAgain={handlePlayAgain}
            onMenu={handleMenu}
          />
        )}
      </View>
    </WalletProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NES_COLORS.BLACK,
  },
});
