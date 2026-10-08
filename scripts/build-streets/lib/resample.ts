import { distanceMeters, type LatLon } from '../../../src/domain/geo.ts';

export function polylineLength(coords: LatLon[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += distanceMeters(coords[i - 1], coords[i]);
  return total;
}

// n = max(2, ceil(L / spacing) + 1) points à intervalles égaux le long de la polyligne,
// extrémités incluses (research.md R7).
export function resample(coords: LatLon[], spacingM = 20): LatLon[] {
  const length = polylineLength(coords);
  const n = Math.max(2, Math.ceil(length / spacingM) + 1);
  const step = length / (n - 1);

  const points: LatLon[] = [coords[0]];
  let segIndex = 1;
  let walkedBeforeSeg = 0; // distance parcourue jusqu'au début du segment courant
  for (let k = 1; k < n - 1; k++) {
    const target = k * step;
    let segLength = distanceMeters(coords[segIndex - 1], coords[segIndex]);
    while (walkedBeforeSeg + segLength < target && segIndex < coords.length - 1) {
      walkedBeforeSeg += segLength;
      segIndex++;
      segLength = distanceMeters(coords[segIndex - 1], coords[segIndex]);
    }
    const t = segLength === 0 ? 0 : (target - walkedBeforeSeg) / segLength;
    const a = coords[segIndex - 1];
    const b = coords[segIndex];
    points.push({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t });
  }
  points.push(coords[coords.length - 1]);
  return points;
}
