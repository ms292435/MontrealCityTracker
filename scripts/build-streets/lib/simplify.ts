import type { LatLon } from '../../../src/domain/geo.ts';

const M_PER_DEG_LAT = 111_194.93;

// Douglas-Peucker en mètres (projection locale équirectangulaire), pour alléger les contours
// des quartiers affichés au dézoom (research.md R15).
export function simplify(line: LatLon[], toleranceM: number): LatLon[] {
  if (line.length <= 2) return line;
  const cosLat = Math.cos((line[0].lat * Math.PI) / 180);
  const xy = line.map((p) => ({ x: p.lon * M_PER_DEG_LAT * cosLat, y: p.lat * M_PER_DEG_LAT }));

  const keep = new Array<boolean>(line.length).fill(false);
  keep[0] = true;
  keep[line.length - 1] = true;

  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    let maxDistance = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = distanceToSegment(xy[i], xy[first], xy[last]);
      if (d > maxDistance) {
        maxDistance = d;
        index = i;
      }
    }
    if (index !== -1 && maxDistance > toleranceM) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

type XY = { x: number; y: number };

function distanceToSegment(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
