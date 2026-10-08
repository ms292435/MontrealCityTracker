import type { LatLon } from './geo';

// Multipolygone simplifié : dans un anneau extérieur et hors de tout trou.
export type Polygon = { outer: LatLon[][]; inner: LatLon[][] };
export type NamedPolygon = { name: string; polygon: Polygon };

// Lancer de rayon (research.md R5).
export function pointInRing(p: LatLon, ring: LatLon[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.lat > p.lat !== b.lat > p.lat) {
      const lonAtLat = a.lon + ((p.lat - a.lat) * (b.lon - a.lon)) / (b.lat - a.lat);
      if (p.lon < lonAtLat) inside = !inside;
    }
  }
  return inside;
}

export function pointInPolygon(p: LatLon, polygon: Polygon): boolean {
  return (
    polygon.outer.some((ring) => pointInRing(p, ring)) &&
    !polygon.inner.some((ring) => pointInRing(p, ring))
  );
}

export function findContaining(p: LatLon, polygons: NamedPolygon[]): string | null {
  return polygons.find((named) => pointInPolygon(p, named.polygon))?.name ?? null;
}
