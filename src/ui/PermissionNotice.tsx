import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PermissionStatus } from '../location/useForegroundLocation';
import { fr } from '../strings/fr';

type Props = { permission: PermissionStatus; onRequest: () => void };

// Explique l'usage de la position avant la demande système, et comment l'activer après un
// refus (FR-015). La carte reste consultable dans tous les cas.
export function PermissionNotice({ permission, onRequest }: Props) {
  if (permission === 'granted' || permission === 'unknown') return null;
  const denied = permission === 'denied';

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{denied ? fr.permission.denied : fr.permission.explanation}</Text>
      <Pressable
        style={styles.button}
        onPress={denied ? () => Linking.openSettings() : onRequest}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{denied ? fr.permission.openSettings : fr.permission.allow}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 48,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    gap: 12,
  },
  text: { fontSize: 15, lineHeight: 21, color: '#222' },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1D7A6E',
  },
  buttonText: { color: 'white', fontWeight: '600' },
});
