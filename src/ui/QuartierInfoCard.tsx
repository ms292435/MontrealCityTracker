import { StyleSheet, Text, View } from 'react-native';
import { formatLength, formatPercent } from '../domain/format';
import { quartierLevel, quartierPercent } from '../domain/quartiers';
import { fr } from '../strings/fr';
import { QUARTIER_FILLS } from './map/stateColors';

type Props = { name: string; visitedPoints: number; totalPoints: number; totalLengthM: number };

// Fiche affichée au toucher d'une zone de la vue par quartier (FR-018).
export function QuartierInfoCard({ name, visitedPoints, totalPoints, totalLengthM }: Props) {
  const level = quartierLevel(visitedPoints, totalPoints);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.swatch, { backgroundColor: QUARTIER_FILLS[level] }]} />
        <Text style={styles.name}>{name}</Text>
      </View>
      <Text style={styles.detail}>
        {fr.quartierInfo.details(
          formatPercent(quartierPercent(visitedPoints, totalPoints)),
          formatLength(totalLengthM),
        )}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 14, height: 14, borderRadius: 3, borderWidth: 1, borderColor: '#999' },
  name: { fontSize: 18, fontWeight: '600', color: '#222', flexShrink: 1 },
  detail: { fontSize: 14, color: '#555' },
});
