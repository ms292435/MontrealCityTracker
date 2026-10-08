import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type MapView from 'react-native-maps';
import { useSQLiteContext } from 'expo-sqlite';
import type { LatLon } from '../domain/geo';
import { neighborhood } from '../domain/grid';
import { segmentState } from '../domain/progress';
import { quartierLevel } from '../domain/quartiers';
import { MAX_VISIBLE_SEGMENTS, queryBounds, shouldShowStreets, type Region } from '../domain/viewport';
import { isUsableFix, visitedPointIds } from '../domain/visits';
import {
  getCandidatePoints,
  getQuartierTotals,
  getQuartierVisited,
  getSegmentGeometries,
  getVisibleSegments,
  getVisitedCounts,
  insertVisitedPoints,
  resetHistory,
  type QuartierTotals,
} from '../data/streetsRepository';
import { useForegroundLocation } from '../location/useForegroundLocation';
import { fr } from '../strings/fr';
import quartiersData from '../../assets/quartiers.json';
import { MAP_BACKGROUND } from './map/stateColors';
import { StreetsMap, type MapQuartier, type MapSegment } from './map/StreetsMap';
import { PermissionNotice } from './PermissionNotice';
import { QuartierInfoCard } from './QuartierInfoCard';
import { ResetHistoryButton } from './ResetHistoryButton';
import { SegmentInfoCard } from './SegmentInfoCard';

const DOWNTOWN: Region = { latitude: 45.5017, longitude: -73.5673, latitudeDelta: 0.008, longitudeDelta: 0.008 };
// Un toucher de tronçon ou de zone déclenche aussi le toucher de la carte : on ignore ce dernier.
const SHAPE_PRESS_GUARD_MS = 400;

// Zones de quartier (assets/quartiers.json, research.md R15), converties une seule fois.
type QuartierShape = { name: string; outer: number[][][]; inner: number[][][] };
const toCoords = (ring: number[][]) => ring.map(([latitude, longitude]) => ({ latitude, longitude }));
const QUARTIER_SHAPES = (quartiersData as QuartierShape[]).map((q) => ({
  name: q.name,
  outer: q.outer.map(toCoords),
  inner: q.inner.map(toCoords),
}));

type ShownSegment = {
  id: number;
  name: string;
  lengthM: number;
  pointCount: number;
  visitedCount: number;
  coords: LatLon[];
};
type Selection = { kind: 'segment'; id: number } | { kind: 'quartier'; name: string } | null;
type Mode = 'streets' | 'quartiers';

export function MapScreen() {
  const db = useSQLiteContext();
  const { permission, lastFix, requestPermission } = useForegroundLocation();
  const mapRef = useRef<MapView>(null);

  const [mode, setMode] = useState<Mode>('streets');
  const modeRef = useRef<Mode>('streets');
  const [segments, setSegments] = useState<Map<number, ShownSegment>>(new Map());
  const [quartierTotals, setQuartierTotals] = useState<Map<string, QuartierTotals>>(new Map());
  const [quartierVisited, setQuartierVisited] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection>(null);

  // Lectures et écritures sérialisées : évite qu'un rechargement de la zone et l'ajout de
  // points visités se croisent et comptent deux fois les mêmes points.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const enqueue = useCallback((task: () => Promise<void>) => {
    queue.current = queue.current.then(task).catch((error: unknown) => console.error(error));
  }, []);

  const quartierTotalsLoaded = useRef(false);
  const switchMode = useCallback((next: Mode) => {
    if (modeRef.current !== next) setSelection(null);
    modeRef.current = next;
    setMode(next);
  }, []);

  const loadRegion = useCallback(
    (region: Region) =>
      enqueue(async () => {
        if (!shouldShowStreets(region)) {
          // Vue par quartier (US4) : totaux chargés une fois, visités rechargés à chaque entrée.
          if (!quartierTotalsLoaded.current) {
            setQuartierTotals(await getQuartierTotals(db));
            quartierTotalsLoaded.current = true;
          }
          setQuartierVisited(await getQuartierVisited(db));
          setSegments(new Map());
          switchMode('quartiers');
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
        switchMode('streets');
        setSegments(next);
        setLoading(false);
      }),
    [db, enqueue, switchMode],
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

  // Chaque position utilisable visite les points proches et met à jour l'affichage courant.
  useEffect(() => {
    if (!lastFix || !isUsableFix(lastFix)) return;
    const fix = lastFix;
    enqueue(async () => {
      const candidates = await getCandidatePoints(db, neighborhood(fix.lat, fix.lon));
      const inserted = await insertVisitedPoints(db, visitedPointIds(fix, candidates));
      if (inserted.length === 0) return;
      if (modeRef.current === 'quartiers') {
        setQuartierVisited(await getQuartierVisited(db));
        return;
      }
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
        setSelection(null);
        setQuartierVisited(new Map());
        setSegments((current) => {
          const next = new Map<number, ShownSegment>();
          for (const [id, shown] of current) next.set(id, { ...shown, visitedCount: 0 });
          return next;
        });
      }),
    [db, enqueue],
  );

  const lastShapePress = useRef(0);
  const onSegmentPress = useCallback((id: number) => {
    lastShapePress.current = Date.now();
    setSelection({ kind: 'segment', id });
  }, []);
  const onQuartierPress = useCallback((name: string) => {
    lastShapePress.current = Date.now();
    setSelection({ kind: 'quartier', name });
  }, []);
  const onMapPress = useCallback(() => {
    if (Date.now() - lastShapePress.current > SHAPE_PRESS_GUARD_MS) setSelection(null);
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

  // Seules les zones qui contiennent des rues de l'île sont affichées (FR-017).
  const mapQuartiers = useMemo<MapQuartier[]>(() => {
    if (mode !== 'quartiers') return [];
    return QUARTIER_SHAPES.filter((q) => (quartierTotals.get(q.name)?.totalPoints ?? 0) > 0).map((q) => ({
      ...q,
      level: quartierLevel(quartierVisited.get(q.name) ?? 0, quartierTotals.get(q.name)?.totalPoints ?? 0),
    }));
  }, [mode, quartierTotals, quartierVisited]);

  const selectedSegment = selection?.kind === 'segment' ? segments.get(selection.id) : undefined;
  const selectedQuartier = selection?.kind === 'quartier' ? selection.name : null;
  const selectedQuartierTotals = selectedQuartier !== null ? quartierTotals.get(selectedQuartier) : undefined;
  const userPosition = lastFix && isUsableFix(lastFix) ? { lat: lastFix.lat, lon: lastFix.lon } : null;

  let card = <PermissionNotice permission={permission} onRequest={requestPermission} />;
  if (selectedSegment) {
    card = (
      <SegmentInfoCard
        name={selectedSegment.name}
        lengthM={selectedSegment.lengthM}
        pointCount={selectedSegment.pointCount}
        visitedCount={selectedSegment.visitedCount}
      />
    );
  } else if (selectedQuartier !== null && selectedQuartierTotals) {
    card = (
      <QuartierInfoCard
        name={selectedQuartier}
        visitedPoints={quartierVisited.get(selectedQuartier) ?? 0}
        totalPoints={selectedQuartierTotals.totalPoints}
        totalLengthM={selectedQuartierTotals.totalLengthM}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StreetsMap
        ref={mapRef}
        initialRegion={DOWNTOWN}
        segments={mapSegments}
        quartiers={mapQuartiers}
        selectedId={selectedSegment?.id ?? null}
        selectedQuartier={selectedQuartier}
        userPosition={userPosition}
        onRegionChangeComplete={loadRegion}
        onSegmentPress={onSegmentPress}
        onQuartierPress={onQuartierPress}
        onMapPress={onMapPress}
      />

      {mode === 'quartiers' && !loading && (
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

      {card}

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
