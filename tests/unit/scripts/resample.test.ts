import { distanceMeters } from '../../../src/domain/geo';
import { polylineLength, resample } from '../../../scripts/build-streets/lib/resample';

const M_PER_DEG_LAT = 111_194.93;
const north = (m: number) => ({ lat: 45.5 + m / M_PER_DEG_LAT, lon: -73.6 });

describe('resample', () => {
  it('donne 2 points pour un tronçon de 5 m', () => {
    const points = resample([north(0), north(5)]);
    expect(points).toHaveLength(2);
  });

  it('donne 6 points pour un tronçon de 100 m', () => {
    const points = resample([north(0), north(100)]);
    expect(points).toHaveLength(6);
  });

  it('inclut les extrémités', () => {
    const line = [north(0), north(37), north(93)];
    const points = resample(line);
    expect(distanceMeters(points[0], line[0])).toBeLessThan(0.01);
    expect(distanceMeters(points[points.length - 1], line[2])).toBeLessThan(0.01);
  });

  it('respecte n = max(2, ceil(L / 20) + 1) et un espacement égal ≤ 20 m', () => {
    for (const length of [1, 19.9, 20, 20.1, 55, 333]) {
      const points = resample([north(0), north(length)]);
      expect(points).toHaveLength(Math.max(2, Math.ceil(length / 20) + 1));
      const gaps = points.slice(1).map((p, i) => distanceMeters(points[i], p));
      for (const gap of gaps) {
        expect(gap).toBeLessThanOrEqual(20.001);
        expect(Math.abs(gap - gaps[0])).toBeLessThan(0.01);
      }
    }
  });

  it('suit une polyligne coudée', () => {
    const corner = north(30);
    const east = { lat: corner.lat, lon: corner.lon + 30 / (M_PER_DEG_LAT * Math.cos((45.5 * Math.PI) / 180)) };
    const line = [north(0), corner, east];
    expect(polylineLength(line)).toBeCloseTo(60, 0);
    const points = resample(line);
    expect(points).toHaveLength(4);
    // Le point à 40 m le long de la ligne est 10 m après le coude, sur la branche est.
    expect(points[2].lat).toBeCloseTo(corner.lat, 6);
    expect(distanceMeters(points[2], corner)).toBeCloseTo(10, 0);
  });
});
