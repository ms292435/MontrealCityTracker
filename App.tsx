import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from './src/data/streetsRepository';
import { MapScreen } from './src/ui/MapScreen';
import { fr } from './src/strings/fr';

export default function App() {
  const [dbError, setDbError] = useState(false);

  if (dbError) {
    return (
      <View style={styles.center}>
        <Text>{fr.errors.database}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SQLiteProvider
        databaseName="streets.db"
        assetSource={{ assetId: require('./assets/streets.db'), forceOverwrite: false }}
        onInit={initDatabase}
        onError={(error) => {
          console.error(error);
          setDbError(true);
        }}
      >
        <MapScreen />
        <StatusBar style="dark" />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
