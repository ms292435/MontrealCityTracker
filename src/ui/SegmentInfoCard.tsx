import { StyleSheet, Text, View } from 'react-native';
import { formatLength } from '../domain/format';
import { percentVisited, segmentState } from '../domain/progress';
import { fr } from '../strings/fr';
import { STATE_COLORS } from './map/stateColors';

type Props = { name: string; lengthM: number; pointCount: number; visitedCount: number };

// Fiche affichée au toucher d'un tronçon (FR-008a).
export function SegmentInfoCard({ name, lengthM, pointCount, visitedCount }: Props) {
  const state = segmentState(visitedCount, pointCount);

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{name}</Text>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: STATE_COLORS[state] }]} />
        <Text style={styles.state}>{fr.segmentState[state]}</Text>
      </View>
      <Text style={styles.detail}>
        {fr.segmentInfo.details(percentVisited(visitedCount, pointCount), formatLength(lengthM))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 80,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    gap: 6,
  },
  name: { fontSize: 18, fontWeight: '600', color: '#222' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  state: { fontSize: 15, color: '#333' },
  detail: { fontSize: 14, color: '#555' },
});
