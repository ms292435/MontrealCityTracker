import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Circle, Fill, Group, Path, type SkPath } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  clampCamera,
  panBy,
  screenToWorld,
  zoomAround,
  type Camera,
  type Point,
  type Viewport,
  type WorldBounds,
} from '../../domain/camera';
import { isQuartierView } from '../../domain/hitTest';
import { ScaleBar } from './ScaleBar';
import {
  MAP_BACKGROUND,
  neutralStrokePx,
  QUARTIER_SELECTED_STROKE,
  SELECTED_COLOR,
  STATE_COLORS,
  stateStrokePx,
  USER_POSITION_COLOR,
} from './stateColors';

export type QuartierFill = { name: string; path: SkPath; color: string };

export type StreetsCanvasHandle = {
  setCamera: (camera: Camera, animated: boolean) => void;
};

type Props = {
  bounds: WorldBounds;
  neutralPaths: SkPath[];
  partiellePath: SkPath;
  completeePath: SkPath;
  quartierFills: QuartierFill[];
  selectedSegmentPath: SkPath | null;
  selectedQuartierPath: SkPath | null;
  userPosition: Point | null;
  onTap: (world: Point, scale: number) => void;
};

// Carte dessinée par l'app (research.md R16) : aucun fond, nom ni service extérieur.
export const StreetsCanvas = forwardRef<StreetsCanvasHandle, Props>(function StreetsCanvas(
  {
    bounds,
    neutralPaths,
    partiellePath,
    completeePath,
    quartierFills,
    selectedSegmentPath,
    selectedQuartierPath,
    userPosition,
    onTap,
  },
  ref,
) {
  const camX = useSharedValue(0);
  const camY = useSharedValue(0);
  const camScale = useSharedValue(0.6);
  const viewport = useSharedValue<Viewport>({ width: 1, height: 1 });
  const worldBounds = useSharedValue<WorldBounds>(bounds);

  const apply = useCallback(
    (camera: Camera) => {
      'worklet';
      const c = clampCamera(camera, worldBounds.value, viewport.value);
      camX.value = c.x;
      camY.value = c.y;
      camScale.value = c.scale;
    },
    [camX, camY, camScale, viewport, worldBounds],
  );

  useEffect(() => {
    worldBounds.value = bounds;
    apply({ x: camX.value, y: camY.value, scale: camScale.value });
  }, [bounds, apply, worldBounds, camX, camY, camScale]);

  useImperativeHandle(ref, () => ({
    setCamera(camera, animated) {
      const c = clampCamera(camera, worldBounds.value, viewport.value);
      const duration = animated ? 600 : 0;
      camX.value = withTiming(c.x, { duration });
      camY.value = withTiming(c.y, { duration });
      camScale.value = withTiming(c.scale, { duration });
    },
  }));

  const handleTap = useCallback(
    (x: number, y: number) => {
      const camera = { x: camX.value, y: camY.value, scale: camScale.value };
      onTap(screenToWorld(camera, { x, y }, viewport.value), camera.scale);
    },
    [camX, camY, camScale, viewport, onTap],
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .averageTouches(true)
      .onChange((e) => {
        apply(panBy({ x: camX.value, y: camY.value, scale: camScale.value }, e.changeX, e.changeY));
      });
    const pinch = Gesture.Pinch().onChange((e) => {
      apply(
        zoomAround(
          { x: camX.value, y: camY.value, scale: camScale.value },
          e.scaleChange,
          { x: e.focalX, y: e.focalY },
          viewport.value,
        ),
      );
    });
    const tap = Gesture.Tap()
      .maxDuration(300)
      .onEnd((e, success) => {
        if (success) scheduleOnRN(handleTap, e.x, e.y);
      });
    return Gesture.Simultaneous(pan, pinch, tap);
  }, [apply, camX, camY, camScale, viewport, handleTap]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewport.value = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
      apply({ x: camX.value, y: camY.value, scale: camScale.value });
    },
    [apply, camX, camY, camScale, viewport],
  );

  // Monde (mètres) → écran (pixels).
  const transform = useDerivedValue(() => [
    { translateX: viewport.value.width / 2 - camX.value * camScale.value },
    { translateY: viewport.value.height / 2 - camY.value * camScale.value },
    { scale: camScale.value },
  ]);
  // Épaisseurs constantes à l'écran : largeur dans le monde = pixels ÷ échelle.
  const neutralWidth = useDerivedValue(() => neutralStrokePx(camScale.value) / camScale.value);
  const stateWidth = useDerivedValue(() => stateStrokePx(camScale.value) / camScale.value);
  const selectedWidth = useDerivedValue(() => (stateStrokePx(camScale.value) + 3) / camScale.value);
  const outlineWidth = useDerivedValue(() => 2 / camScale.value);
  const userRadius = useDerivedValue(() => 7 / camScale.value);
  const userRing = useDerivedValue(() => 10 / camScale.value);
  const quartierOpacity = useDerivedValue(() => (isQuartierView(camScale.value) ? 1 : 0));

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill color={MAP_BACKGROUND} />
          <Group transform={transform}>
            <Group opacity={quartierOpacity}>
              {quartierFills.map((q) => (
                <Path key={q.name} path={q.path} color={q.color} />
              ))}
              {selectedQuartierPath && (
                <Path
                  path={selectedQuartierPath}
                  style="stroke"
                  strokeWidth={outlineWidth}
                  color={QUARTIER_SELECTED_STROKE}
                />
              )}
            </Group>
            {neutralPaths.map((path, i) => (
              <Path
                key={i}
                path={path}
                style="stroke"
                strokeWidth={neutralWidth}
                strokeCap="round"
                strokeJoin="round"
                color={STATE_COLORS.non_parcourue}
              />
            ))}
            <Path
              path={partiellePath}
              style="stroke"
              strokeWidth={stateWidth}
              strokeCap="round"
              strokeJoin="round"
              color={STATE_COLORS.partielle}
            />
            <Path
              path={completeePath}
              style="stroke"
              strokeWidth={stateWidth}
              strokeCap="round"
              strokeJoin="round"
              color={STATE_COLORS.completee}
            />
            {selectedSegmentPath && (
              <Path
                path={selectedSegmentPath}
                style="stroke"
                strokeWidth={selectedWidth}
                strokeCap="round"
                strokeJoin="round"
                color={SELECTED_COLOR}
                opacity={0.6}
              />
            )}
            {userPosition && (
              <>
                <Circle cx={userPosition.x} cy={userPosition.y} r={userRing} color="white" />
                <Circle cx={userPosition.x} cy={userPosition.y} r={userRadius} color={USER_POSITION_COLOR} />
              </>
            )}
          </Group>
        </Canvas>
      </GestureDetector>
      <ScaleBar scale={camScale} />
    </View>
  );
});
