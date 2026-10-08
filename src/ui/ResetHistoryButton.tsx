import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { fr } from '../strings/fr';

type Props = { onConfirm: () => void };

// Effacement de l'historique, toujours précédé d'une confirmation explicite (FR-013).
export function ResetHistoryButton({ onConfirm }: Props) {
  const confirm = () =>
    Alert.alert(fr.reset.title, fr.reset.message, [
      { text: fr.reset.cancel, style: 'cancel' },
      { text: fr.reset.confirm, style: 'destructive', onPress: onConfirm },
    ]);

  return (
    <Pressable style={styles.button} onPress={confirm} accessibilityRole="button">
      <Text style={styles.text}>{fr.reset.button}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 60,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  text: { fontSize: 13, color: '#9B2C2C', fontWeight: '600' },
});
