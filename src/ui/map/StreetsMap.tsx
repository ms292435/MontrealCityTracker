import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline, UrlTile, type Region } from 'react-native-maps';
import type { LatLon } from '../../domain/geo';
import type { SegmentState } from '../../domain/progress';
import type { QuartierLevel } from '../../domain/quartiers';
import {
  QUARTIER_FILLS,
  QUARTIER_SELECTED_STROKE,
  QUARTIER_STROKE,
  SELECTED_EXTRA_WIDTH,
  STATE_COLORS,
  STATE_WIDTHS,
  USER_POSITION_COLOR,
} from './stateColors';
import { useBlankTileUri } from './useBlankTileUri';

// Tout ce qui dépend de react-native-maps est isolé dans ce dossier (research.md R1).

export type MapSegment = { id: number; coords: LatLon[]; state: SegmentState };
type MapCoord = { latitude: number; longitude: number };
export type MapQuartier = { name: string; outer: MapCoord[][]; inner: MapCoord[][]; level: QuartierLevel };

type Props = {
  initialRegion: Region;
  segments: MapSegment[];
  quartiers: MapQuartier[];
  selectedId: number | null;
  selectedQuartier: string | null;
  userPosition: LatLon | null;
  onRegionChangeComplete: (region: Region) => void;
  onSegmentPress: (id: number) => void;
  onQuartierPress: (name: string) => void;
  onMapPress: () => void;
};

export const StreetsMap = forwardRef<MapView, Props>(function StreetsMap(
  {
    initialRegion,
    segments,
    quartiers,
    selectedId,
    selectedQuartier,
    userPosition,
    onRegionChangeComplete,
    onSegmentPress,
    onQuartierPress,
    onMapPress,
  },
  ref,
) {
  const tileUri = useBlankTileUri();

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      showsPointsOfInterests={false}
      showsBuildings={false}
      showsTraffic={false}
      showsUserLocation={false}
      pitchEnabled={false}
      rotateEnabled={false}
      onRegionChangeComplete={onRegionChangeComplete}
      onPress={onMapPress}
    >
      {tileUri && <UrlTile urlTemplate={tileUri} shouldReplaceMapContent tileSize={256} />}
      {quartiers.flatMap((quartier) =>
        // Les trous (rares : une enclave à Dorval) sont rattachés à chaque partie de la zone.
        quartier.outer.map((ring, index) => (
          <Polygon
            key={`${quartier.name}-${index}`}
            coordinates={ring}
            holes={quartier.inner}
            fillColor={QUARTIER_FILLS[quartier.level]}
            strokeColor={quartier.name === selectedQuartier ? QUARTIER_SELECTED_STROKE : QUARTIER_STROKE}
            strokeWidth={quartier.name === selectedQuartier ? 3 : 1}
            tappable
            onPress={() => onQuartierPress(quartier.name)}
          />
        )),
      )}
      {segments.map((segment) => (
        <Polyline
          key={segment.id}
          coordinates={segment.coords.map((p) => ({ latitude: p.lat, longitude: p.lon }))}
          strokeColor={STATE_COLORS[segment.state]}
          strokeWidth={STATE_WIDTHS[segment.state] + (segment.id === selectedId ? SELECTED_EXTRA_WIDTH : 0)}
          lineCap="round"
          tappable
          onPress={() => onSegmentPress(segment.id)}
        />
      ))}
      {userPosition && (
        <Marker
          coordinate={{ latitude: userPosition.lat, longitude: userPosition.lon }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.userDot} />
        </Marker>
      )}
    </MapView>
  );
});

const styles = StyleSheet.create({
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: 'white',
    backgroundColor: USER_POSITION_COLOR,
  },
});
