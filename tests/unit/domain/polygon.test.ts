import {
  findContaining,
  pointInPolygon,
  type Polygon,
} from '../../../src/domain/polygon';

const p = (lat: number, lon: number) => ({ lat, lon });
const square = (lat0: number, lon0: number, size: number) => [
  p(lat0, lon0),
  p(lat0, lon0 + size),
  p(lat0 + size, lon0 + size),
  p(lat0 + size, lon0),
  p(lat0, lon0),
];

const withHole: Polygon = { outer: [square(0, 0, 10)], inner: [square(4, 4, 2)] };
const twoParts: Polygon = { outer: [square(0, 0, 1), square(5, 5, 1)], inner: [] };

describe('pointInPolygon', () => {
  it('détecte un point intérieur', () => {
    expect(pointInPolygon(p(1, 1), withHole)).toBe(true);
  });

  it('détecte un point extérieur', () => {
    expect(pointInPolygon(p(11, 1), withHole)).toBe(false);
    expect(pointInPolygon(p(-1, 5), withHole)).toBe(false);
  });

  it('exclut un point dans un trou', () => {
    expect(pointInPolygon(p(5, 5), withHole)).toBe(false);
  });

  it('gère un multipolygone en plusieurs parties', () => {
    expect(pointInPolygon(p(0.5, 0.5), twoParts)).toBe(true);
    expect(pointInPolygon(p(5.5, 5.5), twoParts)).toBe(true);
    expect(pointInPolygon(p(3, 3), twoParts)).toBe(false);
  });
});

describe('findContaining', () => {
  const polys = [
    { name: 'Le Plateau-Mont-Royal', polygon: { outer: [square(0, 0, 1)], inner: [] } },
    { name: 'Westmount', polygon: { outer: [square(2, 2, 1)], inner: [] } },
  ];

  it('renvoie le nom du polygone contenant le point', () => {
    expect(findContaining(p(2.5, 2.5), polys)).toBe('Westmount');
  });

  it('renvoie null si aucun polygone ne contient le point', () => {
    expect(findContaining(p(9, 9), polys)).toBeNull();
  });
});
