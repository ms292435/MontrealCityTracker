import { isUsableFix, visitedPointIds, type CandidatePoint } from '../../../src/domain/visits';

const M_PER_DEG_LAT = 111_194.93;
const BASE = { lat: 45.5, lon: -73.6 };
const north = (m: number) => BASE.lat + m / M_PER_DEG_LAT;
const east = (m: number) => BASE.lon + m / (M_PER_DEG_LAT * Math.cos((BASE.lat * Math.PI) / 180));

const fix = (accuracy: number | null) => ({ ...BASE, accuracy });

describe('isUsableFix', () => {
  it('accepte une précision de 25 m', () => {
    expect(isUsableFix(fix(25))).toBe(true);
  });

  it('refuse une précision de 25,1 m', () => {
    expect(isUsableFix(fix(25.1))).toBe(false);
  });

  it('refuse une précision inconnue', () => {
    expect(isUsableFix(fix(null))).toBe(false);
  });
});

describe('visitedPointIds', () => {
  it('visite un point à 24,9 m mais pas au-delà de 25 m', () => {
    const candidates: CandidatePoint[] = [
      { id: 1, segmentId: 10, lat: north(24.9), lon: BASE.lon },
      { id: 2, segmentId: 10, lat: north(25.01), lon: BASE.lon },
    ];
    expect(visitedPointIds(fix(5), candidates)).toEqual([1]);
  });

  it('ne visite rien si la position est trop imprécise', () => {
    const candidates: CandidatePoint[] = [{ id: 1, segmentId: 10, ...BASE }];
    expect(visitedPointIds(fix(40), candidates)).toEqual([]);
    expect(visitedPointIds(fix(null), candidates)).toEqual([]);
  });

  it('visite les points de deux tronçons qui se croisent, sans filtre de direction', () => {
    const candidates: CandidatePoint[] = [
      { id: 1, segmentId: 10, lat: north(10), lon: BASE.lon },
      { id: 2, segmentId: 20, lat: BASE.lat, lon: east(15) },
      { id: 3, segmentId: 20, lat: BASE.lat, lon: east(60) },
    ];
    expect(visitedPointIds(fix(5), candidates).sort()).toEqual([1, 2]);
  });

  it('ne déduit aucun point entre deux positions éloignées (saut de position)', () => {
    const between: CandidatePoint[] = [{ id: 1, segmentId: 10, lat: north(100), lon: BASE.lon }];
    expect(visitedPointIds(fix(5), between)).toEqual([]);
    expect(visitedPointIds({ lat: north(200), lon: BASE.lon, accuracy: 5 }, between)).toEqual([]);
  });
});
