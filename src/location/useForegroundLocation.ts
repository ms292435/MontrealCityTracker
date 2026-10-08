import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import type { Fix } from '../domain/visits';

export type PermissionStatus = 'unknown' | 'undetermined' | 'granted' | 'denied';

// Réglages GPS (research.md R11) : « High » (~10 m) est le minimum utile pour un rayon de
// visite de 25 m ; une mise à jour tous les 10 m, sous l'espacement de 20 m entre points.
const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 10,
};

function toStatus(response: Location.LocationPermissionResponse): PermissionStatus {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

// Localisation au premier plan uniquement : l'abonnement est coupé dès que l'app quitte le
// premier plan (FR-014) et recréé à son retour.
export function useForegroundLocation() {
  const [permission, setPermission] = useState<PermissionStatus>('unknown');
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [lastFix, setLastFix] = useState<Fix | null>(null);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((r) => setPermission(toStatus(r)));
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);

  const requestPermission = useCallback(async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    setPermission(response.granted ? 'granted' : 'denied');
  }, []);

  useEffect(() => {
    if (permission !== 'granted' || appState !== 'active') return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.watchPositionAsync(WATCH_OPTIONS, (location) => {
      setLastFix({
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
    }).then((sub) => {
      if (cancelled) sub.remove();
      else subscription = sub;
    });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [permission, appState]);

  return { permission, lastFix, requestPermission };
}
