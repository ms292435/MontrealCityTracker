import type { LatLon } from '../../../src/domain/geo.ts';

const same = (a: LatLon, b: LatLon) => a.lat === b.lat && a.lon === b.lon;

// Assemble les membres « outer » d'une relation OSM (polylignes non ordonnées, parfois
// inversées) en anneaux fermés (research.md R5).
export function assembleRings(lines: LatLon[][]): LatLon[][] {
  const pool = lines.map((line) => [...line]);
  const rings: LatLon[][] = [];

  while (pool.length > 0) {
    const ring = pool.shift() as LatLon[];
    while (!same(ring[0], ring[ring.length - 1])) {
      const tail = ring[ring.length - 1];
      const index = pool.findIndex((l) => same(l[0], tail) || same(l[l.length - 1], tail));
      if (index === -1) {
        throw new Error(
          `Impossible de fermer un anneau : aucun membre ne part de (${tail.lat}, ${tail.lon}).`,
        );
      }
      const [line] = pool.splice(index, 1);
      const forward = same(line[0], tail) ? line : [...line].reverse();
      ring.push(...forward.slice(1));
    }
    rings.push(ring);
  }
  return rings;
}
