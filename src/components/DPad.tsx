// ============================================================
// Battle Tanks: Seeker Edition — Virtual D-Pad Controller
// NES-style 4-direction pad + fire button
// ============================================================

import React, { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  GestureResponderEvent,
  Dimensions,
  Text,
} from 'react-native';
import { InputState } from '../game/types';
import { NES_COLORS } from '../game/constants';

interface DPadProps {
  onInputChange: (input: InputState) => void;
}

const DPAD_SIZE = 140;
const BTN_SIZE = 44;
const FIRE_SIZE = 70;

export function DPad({ onInputChange }: DPadProps): React.JSX.Element {
  const inputRef = useRef<InputState>({
    up: false, down: false, left: false, right: false, fire: false,
  });

  const setDir = useCallback((dir: keyof InputState, pressed: boolean) => {
    // For directional keys, clear other directions (4-way only, no diagonal)
    if (['up', 'down', 'left', 'right'].includes(dir)) {
      if (pressed) {
        inputRef.current.up = false;
        inputRef.current.down = false;
        inputRef.current.left = false;
        inputRef.current.right = false;
      }
    }
    inputRef.current[dir] = pressed;
    onInputChange({ ...inputRef.current });
  }, [onInputChange]);

  return (
    <View style={styles.container}>
      {/* D-Pad */}
      <View style={styles.dpadContainer}>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity
            style={[styles.dpadBtn, styles.dpadUp]}
            onPressIn={() => setDir('up', true)}
            onPressOut={() => setDir('up', false)}
            activeOpacity={0.6}
          >
            <Text style={styles.dpadArrow}>▲</Text>
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
        </View>
        <View style={styles.dpadRow}>
          <TouchableOpacity
            style={[styles.dpadBtn, styles.dpadLeft]}
            onPressIn={() => setDir('left', true)}
            onPressOut={() => setDir('left', false)}
            activeOpacity={0.6}
          >
            <Text style={styles.dpadArrow}>◀</Text>
          </TouchableOpacity>
          <View style={styles.dpadCenter} />
          <TouchableOpacity
            style={[styles.dpadBtn, styles.dpadRight]}
            onPressIn={() => setDir('right', true)}
            onPressOut={() => setDir('right', false)}
            activeOpacity={0.6}
          >
            <Text style={styles.dpadArrow}>▶</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity
            style={[styles.dpadBtn, styles.dpadDown]}
            onPressIn={() => setDir('down', true)}
            onPressOut={() => setDir('down', false)}
            activeOpacity={0.6}
          >
            <Text style={styles.dpadArrow}>▼</Text>
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
        </View>
      </View>

      {/* Fire Button */}
      <TouchableOpacity
        style={styles.fireBtn}
        onPressIn={() => setDir('fire', true)}
        onPressOut={() => setDir('fire', false)}
        activeOpacity={0.7}
      >
        <Text style={styles.fireText}>FIRE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 10,
    backgroundColor: NES_COLORS.HUD_BG,
  },
  dpadContainer: {
    width: DPAD_SIZE,
    height: DPAD_SIZE,
  },
  dpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpadSpacer: {
    width: BTN_SIZE,
    height: BTN_SIZE,
  },
  dpadBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555555',
  },
  dpadUp: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    marginBottom: 2,
  },
  dpadDown: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    marginTop: 2,
  },
  dpadLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    marginRight: 2,
  },
  dpadRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    marginLeft: 2,
  },
  dpadCenter: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    backgroundColor: '#222222',
  },
  dpadArrow: {
    color: NES_COLORS.WHITE,
    fontSize: 18,
  },
  fireBtn: {
    width: FIRE_SIZE,
    height: FIRE_SIZE,
    borderRadius: FIRE_SIZE / 2,
    backgroundColor: NES_COLORS.RED,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#CC0000',
    elevation: 4,
    shadowColor: NES_COLORS.RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  fireText: {
    color: NES_COLORS.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});
