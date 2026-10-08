import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { project, unproject, type Point } from '../domain/camera';
import type { LatLon } from '../domain/geo';
import { neighborhood } from '../domain/grid';
import { isQuartierView, MAX_SEGMENT_TAP_M, nearestPoint, TAP_TOLERANCE_PX } from '../domain/hitTest';
import { findContaining, type NamedPolygon } from '../domain/polygon';
import { quartierLevel } from '../domain/quartiers';
import { isUsableFix, visitedPointIds } from '../domain/visits';
import {
  getAllVisitedCounts,
  getCandidatePoints,
  getQuartierTotals,
  getQuartierVisited,
  getSegment,
  insertVisitedPoints,
  loadGeometry,
  resetHistory,
  type QuartierTotals,
  type SegmentRow,
} from '../data/streetsRepository';
import { useForegroundLocation } from '../location/useForegroundLocation';
import { fr } from '../strings/fr';
import quartiersData from '../../assets/quartiers.json';
import { MAP_BACKGROUND, QUARTIER_FILLS } from './map/stateColors';
import { StreetsCanvas, type QuartierFill, type StreetsCanvasHandle } from './map/StreetsCanvas';
import {
  buildNeutralPaths,
  buildQuartierPath,
  buildSegmentPath,
  buildStatePaths,
  projectGeometry,
  type ProjectedGeometry,
} from './map/streetPaths';
import { PermissionNotice } from './PermissionNotice';
import { QuartierInfoCard } from './QuartierInfoCard';
import { ResetHistoryButton } from './ResetHistoryButton';
import { SegmentInfoCard } from './SegmentInfoCard';

const DOWNTOWN = { lat: 45.5017, lon: -73.5673 };
const INITIAL_SCALE = 0.6; // px/m : environ 650 m de largeur sur un iPhone
const FOLLOW_SCALE = 1;

// Zones de quartier (assets/quartiers.json, research.md R15).
type QuartierShape = { name: string; outer: number[][][]; inner: number[][][] };
const toRing = (ring: number[][]): LatLon[] => ring.map(([lat, lon]) => ({ lat, lon }));
const QUARTIERS: NamedPolygon[] = (quartiersData as QuartierShape[]).map((q) => ({
  name: q.name,
  polygon: { outer: q.outer.map(toRing), inner: q.inner.map(toRing) },
}));

type Selection = { kind: 'segment'; segment: SegmentRow } | { kind: 'quartier'; name: string } | null;

export function MapScreen() {
  const db = useSQLiteContext();
  const { permission, lastFix, requestPermission } = useForegroundLocation();
  const canvasRef = useRef<StreetsCanvasHandle>(null);

  const [geometry, setGeometry] = useState<ProjectedGeometry | null>(null);
  const [visitedCounts, setVisitedCounts] = useState<Map<number, number>>(new Map());
  const [quartierTotals, setQuartierTotals] = useState<Map<string, QuartierTotals>>(new Map());
  const [quartierVisited, setQuartierVisited] = useState<Map<string, number>>(new Map());
  const [selection, setSelection] = useState<Selection>(null);

  // Écritures et rechargements sérialisés : une visite et un effacement ne se croisent pas.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const enqueue = useCallback((task: () => Promise<void>) => {
    queue.current = queue.current.then(task).catch((error: unknown) => console.error(error));
  }, []);

  // Chargement unique : toute la géométrie et la progression persistée (US2).
  useEffect(() => {
    enqueue(async () => {
      const [loaded, counts, totals, visited] = await Promise.all([
        loadGeometry(db),
        getAllVisitedCounts(db),
        getQuartierTotals(db),
        getQuartierVisited(db),
      ]);
      setVisitedCounts(counts);
      setQuartierTotals(totals);
      setQuartierVisited(visited);
      setGeometry(projectGeometry(loaded));
    });
  }, [db, enqueue]);

  const neutralPaths = useMemo(() => (geometry ? buildNeutralPaths(geometry) : []), [geometry]);
  const statePaths = useMemo(
    () => (geometry ? buildStatePaths(geometry, visitedCounts) : null),
    [geometry, visitedCounts],
  );
  const quartierPaths = useMemo(
    () => new Map(QUARTIERS.map((q) => [q.name, buildQuartierPath(q.polygon.outer, q.polygon.inner)])),
    [],
  );
  // Seules les zones qui contiennent des rues de l'île sont teintées (FR-017).
  const quartierFills = useMemo<QuartierFill[]>(
    () =>
      QUARTIERS.filter((q) => (quartierTotals.get(q.name)?.totalPoints ?? 0) > 0).map((q) => ({
        name: q.name,
        path: quartierPaths.get(q.name) ?? buildQuartierPath([], []),
        color: QUARTIER_FILLS[
          quartierLevel(quartierVisited.get(q.name) ?? 0, quartierTotals.get(q.name)?.totalPoints ?? 0)
        ],
      })),
    [quartierPaths, quartierTotals, quartierVisited],
  );

  // Caméra initiale : centre-ville, puis la première position reçue sur l'île.
  useEffect(() => {
    if (!geometry) return;
    const center = project(DOWNTOWN.lat, DOWNTOWN.lon);
    canvasRef.current?.setCamera({ ...center, scale: INITIAL_SCALE }, false);
  }, [geometry]);

  const centered = useRef(false);
  useEffect(() => {
    if (!geometry || !lastFix || centered.current || !isUsableFix(lastFix)) return;
    centered.current = true;
    const p = project(lastFix.lat, lastFix.lon);
    const b = geometry.bounds;
    if (p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY) {
      canvasRef.current?.setCamera({ ...p, scale: FOLLOW_SCALE }, true);
    }
  }, [geometry, lastFix]);

  // Chaque position utilisable visite les points proches ; rues et quartiers se mettent à jour.
  useEffect(() => {
    if (!lastFix || !isUsableFix(lastFix)) return;
    const fix = lastFix;
    enqueue(async () => {
      const candidates = await getCandidatePoints(db, neighborhood(fix.lat, fix.lon));
      const inserted = await insertVisitedPoints(db, visitedPointIds(fix, candidates));
      if (inserted.length === 0) return;
      const segmentOf = new Map(candidates.map((c) => [c.id, c.segmentId]));
      setVisitedCounts((current) => {
        const next = new Map(current);
        for (const id of inserted) {
          const segmentId = segmentOf.get(id);
          if (segmentId !== undefined) next.set(segmentId, (next.get(segmentId) ?? 0) + 1);
        }
        return next;
      });
      setQuartierVisited(await getQuartierVisited(db));
    });
  }, [db, enqueue, lastFix]);

  const onReset = useCallback(
    () =>
      enqueue(async () => {
        await resetHistory(db);
        setSelection(null);
        setVisitedCounts(new Map());
        setQuartierVisited(new Map());
      }),
    [db, enqueue],
  );

  // Toucher : un tronçon à l'échelle des rues, un quartier au dézoom (research.md R16).
  const onTap = useCallback(
    async (world: Point, scale: number) => {
      const target = unproject(world);
      if (isQuartierView(scale)) {
        const name = findContaining(target, QUARTIERS);
        setSelection(name && (quartierTotals.get(name)?.totalPoints ?? 0) > 0 ? { kind: 'quartier', name } : null);
        return;
      }
      const tolerance = Math.min(TAP_TOLERANCE_PX / scale, MAX_SEGMENT_TAP_M);
      const candidates = await getCandidatePoints(db, neighborhood(target.lat, target.lon));
      const hit = nearestPoint(target, candidates, tolerance);
      const segment = hit ? await getSegment(db, hit.segmentId) : null;
      setSelection(segment ? { kind: 'segment', segment } : null);
    },
    [db, quartierTotals],
  );

  const selectedSegmentPath = useMemo(
    () => (geometry && selection?.kind === 'segment' ? buildSegmentPath(geometry, selection.segment.id) : null),
    [geometry, selection],
  );
  const selectedQuartierPath =
    selection?.kind === 'quartier' ? (quartierPaths.get(selection.name) ?? null) : null;
  const userPosition = lastFix && isUsableFix(lastFix) ? project(lastFix.lat, lastFix.lon) : null;

  let card = <PermissionNotice permission={permission} onRequest={requestPermission} />;
  if (selection?.kind === 'segment') {
    card = (
      <SegmentInfoCard
        name={selection.segment.name}
        lengthM={selection.segment.lengthM}
        pointCount={selection.segment.pointCount}
        visitedCount={visitedCounts.get(selection.segment.id) ?? 0}
      />
    );
  } else if (selection?.kind === 'quartier') {
    const totals = quartierTotals.get(selection.name);
    if (totals) {
      card = (
        <QuartierInfoCard
          name={selection.name}
          visitedPoints={quartierVisited.get(selection.name) ?? 0}
          totalPoints={totals.totalPoints}
          totalLengthM={totals.totalLengthM}
        />
      );
    }
  }

  if (!geometry || !statePaths) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>{fr.map.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StreetsCanvas
        ref={canvasRef}
        bounds={geometry.bounds}
        neutralPaths={neutralPaths}
        partiellePath={statePaths.partielle}
        completeePath={statePaths.completee}
        quartierFills={quartierFills}
        selectedSegmentPath={selectedSegmentPath}
        selectedQuartierPath={selectedQuartierPath}
        userPosition={userPosition}
        onTap={onTap}
      />

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
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#333' },
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
