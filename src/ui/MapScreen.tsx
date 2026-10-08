import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type MapView from 'react-native-maps';
import { useSQLiteContext } from 'expo-sqlite';
import type { LatLon } from '../domain/geo';
import { neighborhood } from '../domain/grid';
import { segmentState } from '../domain/progress';
import { MAX_VISIBLE_SEGMENTS, queryBounds, shouldShowStreets, type Region } from '../domain/viewport';
import { isUsableFix, visitedPointIds } from '../domain/visits';
import {
  getCandidatePoints,
  getSegmentGeometries,
  getVisibleSegments,
  getVisitedCounts,
  insertVisitedPoints,
  resetHistory,
} from '../data/streetsRepository';
import { useForegroundLocation } from '../location/useForegroundLocation';
import { fr } from '../strings/fr';
import { MAP_BACKGROUND } from './map/stateColors';
import { StreetsMap, type MapSegment } from './map/StreetsMap';
import { PermissionNotice } from './PermissionNotice';
import { ResetHistoryButton } from './ResetHistoryButton';
import { SegmentInfoCard } from './SegmentInfoCard';

const DOWNTOWN: Region = { latitude: 45.5017, longitude: -73.5673, latitudeDelta: 0.008, longitudeDelta: 0.008 };
// Un toucher de tronçon déclenche aussi le toucher de la carte : on ignore ce dernier.
const SEGMENT_PRESS_GUARD_MS = 400;

type ShownSegment = {
  id: number;
  name: string;
  lengthM: number;
  pointCount: number;
  visitedCount: number;
  coords: LatLon[];
};

export function MapScreen() {
  const db = useSQLiteContext();
  const { permission, lastFix, requestPermission } = useForegroundLocation();
  const mapRef = useRef<MapView>(null);

  const [segments, setSegments] = useState<Map<number, ShownSegment>>(new Map());
  const [streetsVisible, setStreetsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Lectures et écritures sérialisées : évite qu'un rechargement de la zone et l'ajout de
  // points visités se croisent et comptent deux fois les mêmes points.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const enqueue = useCallback((task: () => Promise<void>) => {
    queue.current = queue.current.then(task).catch((error: unknown) => console.error(error));
  }, []);

  const loadRegion = useCallback(
    (region: Region) =>
      enqueue(async () => {
        if (!shouldShowStreets(region)) {
          setStreetsVisible(false);
          setSegments(new Map());
          setLoading(false);
          return;
        }
        const rows = await getVisibleSegments(db, queryBounds(region), region, MAX_VISIBLE_SEGMENTS);
        const ids = rows.map((r) => r.id);
        const [geometries, counts] = await Promise.all([
          getSegmentGeometries(db, ids),
          getVisitedCounts(db, ids),
        ]);
        const next = new Map<number, ShownSegment>();
        for (const row of rows) {
          next.set(row.id, {
            id: row.id,
            name: row.name,
            lengthM: row.lengthM,
            pointCount: row.pointCount,
            visitedCount: counts.get(row.id) ?? 0,
            coords: geometries.get(row.id) ?? [],
          });
        }
        setStreetsVisible(true);
        setSegments(next);
        setLoading(false);
      }),
    [db, enqueue],
  );

  // Premier affichage : progression persistée, même sans position GPS (US2).
  useEffect(() => {
    loadRegion(DOWNTOWN);
  }, [loadRegion]);

  // Centre la carte sur la première position reçue.
  const centered = useRef(false);
  useEffect(() => {
    if (!lastFix || centered.current || !isUsableFix(lastFix)) return;
    centered.current = true;
    mapRef.current?.animateToRegion({ ...DOWNTOWN, latitude: lastFix.lat, longitude: lastFix.lon });
  }, [lastFix]);

  // Chaque position utilisable visite les points proches et met à jour les tronçons affichés.
  useEffect(() => {
    if (!lastFix || !isUsableFix(lastFix)) return;
    const fix = lastFix;
    enqueue(async () => {
      const candidates = await getCandidatePoints(db, neighborhood(fix.lat, fix.lon));
      const inserted = await insertVisitedPoints(db, visitedPointIds(fix, candidates));
      if (inserted.length === 0) return;
      const segmentOf = new Map(candidates.map((c) => [c.id, c.segmentId]));
      const added = new Map<number, number>();
      for (const id of inserted) {
        const segmentId = segmentOf.get(id);
        if (segmentId !== undefined) added.set(segmentId, (added.get(segmentId) ?? 0) + 1);
      }
      setSegments((current) => {
        const next = new Map(current);
        for (const [segmentId, count] of added) {
          const shown = next.get(segmentId);
          if (shown) next.set(segmentId, { ...shown, visitedCount: shown.visitedCount + count });
        }
        return next;
      });
    });
  }, [db, enqueue, lastFix]);

  const onReset = useCallback(
    () =>
      enqueue(async () => {
        await resetHistory(db);
        setSelectedId(null);
        setSegments((current) => {
          const next = new Map<number, ShownSegment>();
          for (const [id, shown] of current) next.set(id, { ...shown, visitedCount: 0 });
          return next;
        });
      }),
    [db, enqueue],
  );

  const lastSegmentPress = useRef(0);
  const onSegmentPress = useCallback((id: number) => {
    lastSegmentPress.current = Date.now();
    setSelectedId(id);
  }, []);
  const onMapPress = useCallback(() => {
    if (Date.now() - lastSegmentPress.current > SEGMENT_PRESS_GUARD_MS) setSelectedId(null);
  }, []);

  const mapSegments = useMemo<MapSegment[]>(
    () =>
      [...segments.values()].map((s) => ({
        id: s.id,
        coords: s.coords,
        state: segmentState(s.visitedCount, s.pointCount),
      })),
    [segments],
  );

  const selected = selectedId !== null ? segments.get(selectedId) : undefined;
  const userPosition = lastFix && isUsableFix(lastFix) ? { lat: lastFix.lat, lon: lastFix.lon } : null;

  return (
    <View style={styles.container}>
      <StreetsMap
        ref={mapRef}
        initialRegion={DOWNTOWN}
        segments={mapSegments}
        selectedId={selectedId}
        userPosition={userPosition}
        onRegionChangeComplete={loadRegion}
        onSegmentPress={onSegmentPress}
        onMapPress={onMapPress}
      />

      {!streetsVisible && (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintText}>{fr.map.zoomIn}</Text>
        </View>
      )}

      {loading && (
        <View style={styles.hint} pointerEvents="none">
          <ActivityIndicator />
          <Text style={styles.hintText}>{fr.map.loading}</Text>
        </View>
      )}

      <ResetHistoryButton onConfirm={onReset} />

      {selected ? (
        <SegmentInfoCard
          name={selected.name}
          lengthM={selected.lengthM}
          pointCount={selected.pointCount}
          visitedCount={selected.visitedCount}
        />
      ) : (
        <PermissionNotice permission={permission} onRequest={requestPermission} />
      )}

      <Text style={styles.attribution} pointerEvents="none">
        {fr.map.attribution}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MAP_BACKGROUND },
  hint: {
    position: 'absolute',
    top: 60,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  hintText: { fontSize: 13, color: '#333' },
  attribution: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 24,
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
});
