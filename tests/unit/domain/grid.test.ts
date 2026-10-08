import { cellOf, GRID, neighborhood } from '../../../src/domain/grid';

const M_PER_DEG_LAT = 111_195;

function offset(lat: number, lon: number, dxM: number, dyM: number) {
  return {
    lat: lat + dyM / M_PER_DEG_LAT,
    lon: lon + dxM / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)),
  };
}

describe('cellOf', () => {
  it('calcule row * 10000 + col', () => {
    const lat = 45.5017;
    const lon = -73.5673;
    const row = Math.floor((lat - 45.38) / 0.0005);
    const col = Math.floor((lon - -74.0) / 0.0007);
    expect(cellOf(lat, lon)).toBe(row * 10000 + col);
  });

  it('expose les constantes de la grille', () => {
    expect(GRID).toEqual({ lat0: 45.38, lon0: -74.0, dlat: 0.0005, dlon: 0.0007 });
  });
});

describe('neighborhood', () => {
  it('renvoie 9 cellules distinctes', () => {
    const cells = neighborhood(45.5, -73.6);
    expect(cells).toHaveLength(9);
    expect(new Set(cells).size).toBe(9);
  });

  it('inclut toute cellule contenant un point à moins de 25 m (coins, bords, centre)', () => {
    const lat0 = GRID.lat0 + 300 * GRID.dlat;
    const lon0 = GRID.lon0 + 400 * GRID.dlon;
    const eps = 1e-9;
    const positions = [
      { lat: lat0 + eps, lon: lon0 + eps },
      { lat: lat0 + GRID.dlat - eps, lon: lon0 + GRID.dlon - eps },
      { lat: lat0 + eps, lon: lon0 + GRID.dlon - eps },
      { lat: lat0 + GRID.dlat / 2, lon: lon0 + eps },
      { lat: lat0 + GRID.dlat / 2, lon: lon0 + GRID.dlon / 2 },
    ];
    for (const p of positions) {
      const cells = new Set(neighborhood(p.lat, p.lon));
      for (let angle = 0; angle < 360; angle += 15) {
        const a = (angle * Math.PI) / 180;
        const q = offset(p.lat, p.lon, 24.9 * Math.cos(a), 24.9 * Math.sin(a));
        expect(cells.has(cellOf(q.lat, q.lon))).toBe(true);
      }
    }
  });
});
