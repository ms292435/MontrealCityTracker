import { simplify } from '../../../scripts/build-streets/lib/simplify';

const M_PER_DEG_LAT = 111_194.93;
const LAT0 = 45.5;
const LON0 = -73.6;
const at = (northM: number, eastM: number) => ({
  lat: LAT0 + northM / M_PER_DEG_LAT,
  lon: LON0 + eastM / (M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180)),
});

describe('simplify', () => {
  it('ne garde que les extrémités d’une ligne droite', () => {
    const line = [at(0, 0), at(10, 0), at(20, 0), at(30, 0), at(100, 0)];
    expect(simplify(line, 15)).toEqual([line[0], line[4]]);
  });

  it('supprime un écart inférieur à la tolérance', () => {
    const line = [at(0, 0), at(50, 10), at(100, 0)];
    expect(simplify(line, 15)).toHaveLength(2);
  });

  it('conserve un coude de 30 m', () => {
    const line = [at(0, 0), at(50, 30), at(100, 0)];
    expect(simplify(line, 15)).toEqual(line);
  });

  it('garde un anneau fermé fermé', () => {
    const ring = [at(0, 0), at(0, 500), at(500, 500), at(500, 0), at(0, 0)];
    const result = simplify(ring, 15);
    expect(result[0]).toEqual(result[result.length - 1]);
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it('renvoie une ligne de 2 points telle quelle', () => {
    const line = [at(0, 0), at(1, 1)];
    expect(simplify(line, 15)).toEqual(line);
  });
});
