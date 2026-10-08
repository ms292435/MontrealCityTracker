import { distanceMeters, fromE6, toE6 } from '../../../src/domain/geo';

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

describe('distanceMeters', () => {
  it('vaut 0 pour deux points identiques', () => {
    expect(distanceMeters({ lat: 45.5, lon: -73.6 }, { lat: 45.5, lon: -73.6 })).toBe(0);
  });

  it('vaut environ 111 195 m pour 1° de latitude', () => {
    const d = distanceMeters({ lat: 45, lon: -73.6 }, { lat: 46, lon: -73.6 });
    expect(d).toBeGreaterThan(111_190);
    expect(d).toBeLessThan(111_200);
  });

  it('reste à moins de 0,5 % de haversine à 25 m près de 45,5° N', () => {
    const a = { lat: 45.5, lon: -73.6 };
    for (const b of [
      { lat: 45.500225, lon: -73.6 },
      { lat: 45.5, lon: -73.59968 },
      { lat: 45.50016, lon: -73.59977 },
    ]) {
      const expected = haversine(a, b);
      expect(Math.abs(distanceMeters(a, b) - expected) / expected).toBeLessThan(0.005);
    }
  });
});

describe('toE6 / fromE6', () => {
  it('fait un aller-retour à 1e-6 près', () => {
    for (const v of [45.501689, -73.567256, 0, 45.7]) {
      expect(Number.isInteger(toE6(v))).toBe(true);
      expect(Math.abs(fromE6(toE6(v)) - v)).toBeLessThanOrEqual(1e-6);
    }
  });
});
