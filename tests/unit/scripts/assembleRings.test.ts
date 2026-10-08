import { assembleRings } from '../../../scripts/build-streets/lib/assembleRings';

const p = (lat: number, lon: number) => ({ lat, lon });

describe('assembleRings', () => {
  it('garde un membre déjà fermé', () => {
    const ring = [p(0, 0), p(0, 1), p(1, 1), p(0, 0)];
    expect(assembleRings([ring])).toEqual([ring]);
  });

  it('assemble des membres non ordonnés et parfois inversés', () => {
    const a = [p(0, 0), p(0, 1)];
    const b = [p(1, 1), p(1, 0)];
    const c = [p(1, 1), p(0, 1)]; // inversé par rapport au sens du parcours
    const d = [p(1, 0), p(0, 0)];
    const rings = assembleRings([a, b, c, d]);
    expect(rings).toHaveLength(1);
    const ring = rings[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring).toHaveLength(5);
  });

  it('assemble plusieurs anneaux distincts', () => {
    const r1 = [[p(0, 0), p(0, 1), p(1, 1)], [p(1, 1), p(0, 0)]];
    const r2 = [[p(5, 5), p(5, 6), p(6, 6), p(5, 5)]];
    expect(assembleRings([...r1, ...r2])).toHaveLength(2);
  });

  it('lève une erreur explicite si un anneau ne peut pas être fermé', () => {
    expect(() => assembleRings([[p(0, 0), p(0, 1)], [p(1, 1), p(1, 0)]])).toThrow(/anneau/);
  });
});
