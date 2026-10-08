import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { formatScale } from '../../domain/format';
import { scaleBar } from '../../domain/scaleBar';

type Props = { scale: SharedValue<number> };

// Échelle graphique en bas à droite (FR-020) : la barre suit le zoom image par image, le texte
// change quand la distance « ronde » change.
export function ScaleBar({ scale }: Props) {
  const [meters, setMeters] = useState(() => scaleBar(scale.value).meters);

  useAnimatedReaction(
    () => scaleBar(scale.value).meters,
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setMeters, current);
    },
  );
  const barStyle = useAnimatedStyle(() => ({ width: scaleBar(scale.value).widthPx }));

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.label}>{formatScale(meters)}</Text>
      <Animated.View style={[styles.bar, barStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', right: 16, bottom: 44, alignItems: 'flex-end' },
  label: { fontSize: 11, color: '#333', marginBottom: 2 },
  bar: {
    height: 6,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: '#333',
  },
});
