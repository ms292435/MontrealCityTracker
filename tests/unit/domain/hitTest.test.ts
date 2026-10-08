import { isQuartierView, nearestPoint } from '../../../src/domain/hitTest';

const M_PER_DEG_LAT = 111_194.93;
const BASE = { lat: 45.5, lon: -73.6 };
const north = (m: number) => ({ lat: BASE.lat + m / M_PER_DEG_LAT, lon: BASE.lon });

describe('isQuartierView', () => {
  it('reste en vue des rues quand 20 px représentent au plus 50 m', () => {
    expect(isQuartierView(0.5)).toBe(false);
    expect(isQuartierView(0.4)).toBe(false);
  });

  it('passe en vue des quartiers au-delà', () => {
    expect(isQuartierView(0.3)).toBe(true);
  });
});

describe('nearestPoint', () => {
  const candidates = [
    { id: 1, ...north(30) },
    { id: 2, ...north(10) },
  ];

  it('renvoie le point le plus proche sous la tolérance', () => {
    expect(nearestPoint(BASE, candidates, 20)?.id).toBe(2);
  });

  it('renvoie null si aucun point n’est sous la tolérance', () => {
    expect(nearestPoint(BASE, candidates, 5)).toBeNull();
    expect(nearestPoint(BASE, [], 50)).toBeNull();
  });
});
