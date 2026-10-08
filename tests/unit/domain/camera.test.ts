import {
  clampCamera,
  MAX_SCALE,
  minScale,
  panBy,
  project,
  screenToWorld,
  unproject,
  worldToScreen,
  zoomAround,
  type WorldBounds,
} from '../../../src/domain/camera';

const VIEWPORT = { width: 400, height: 800 };
// Île fictive de 40 km × 30 km.
const BOUNDS: WorldBounds = { minX: -20_000, minY: -15_000, maxX: 20_000, maxY: 15_000 };

describe('project / unproject', () => {
  it('fait un aller-retour', () => {
    for (const [lat, lon] of [
      [45.5017, -73.5673],
      [45.7, -73.95],
      [45.41, -73.48],
    ]) {
      const back = unproject(project(lat, lon));
      expect(back.lat).toBeCloseTo(lat, 9);
      expect(back.lon).toBeCloseTo(lon, 9);
    }
  });

  it('compte environ 111 195 m par degré de latitude, y vers le sud', () => {
    const a = project(45.5, -73.6);
    const b = project(46.5, -73.6);
    expect(a.y - b.y).toBeCloseTo(111_195, -1);
    expect(b.x).toBeCloseTo(a.x, 6);
  });

  it('place l’est vers les x croissants', () => {
    expect(project(45.5, -73.5).x).toBeGreaterThan(project(45.5, -73.6).x);
  });
});

describe('worldToScreen / screenToWorld', () => {
  const camera = { x: 1000, y: -500, scale: 0.5 };

  it('place le centre de la caméra au centre de l’écran', () => {
    expect(worldToScreen(camera, { x: 1000, y: -500 }, VIEWPORT)).toEqual({ x: 200, y: 400 });
  });

  it('fait un aller-retour', () => {
    const p = { x: 1234.5, y: -987.25 };
    const back = screenToWorld(camera, worldToScreen(camera, p, VIEWPORT), VIEWPORT);
    expect(back.x).toBeCloseTo(p.x, 9);
    expect(back.y).toBeCloseTo(p.y, 9);
  });
});

describe('minScale', () => {
  it('fait tenir l’île entière à l’écran', () => {
    // largeur : 400 / 40 000 = 0,01 ; hauteur : 800 / 30 000 ≈ 0,0267 → 0,01
    expect(minScale(BOUNDS, VIEWPORT)).toBeCloseTo(0.01, 9);
  });
});

describe('clampCamera', () => {
  it('ramène une échelle trop petite à minScale', () => {
    expect(clampCamera({ x: 0, y: 0, scale: 0.001 }, BOUNDS, VIEWPORT).scale).toBeCloseTo(0.01, 9);
  });

  it('ramène une échelle trop grande à MAX_SCALE', () => {
    expect(clampCamera({ x: 0, y: 0, scale: 50 }, BOUNDS, VIEWPORT).scale).toBe(MAX_SCALE);
  });

  it('ramène un centre hors de l’île dans ses bornes', () => {
    const c = clampCamera({ x: 90_000, y: -40_000, scale: 1 }, BOUNDS, VIEWPORT);
    expect(c.x).toBe(20_000);
    expect(c.y).toBe(-15_000);
  });

  it('ne change pas une caméra valide', () => {
    const camera = { x: 100, y: 200, scale: 1 };
    expect(clampCamera(camera, BOUNDS, VIEWPORT)).toEqual(camera);
  });
});

describe('panBy', () => {
  it('déplace le contenu dans le sens du doigt', () => {
    const c = panBy({ x: 0, y: 0, scale: 2 }, 100, -50);
    expect(c).toEqual({ x: -50, y: 25, scale: 2 });
  });
});

describe('zoomAround', () => {
  it('garde fixe le point du monde situé sous le doigt', () => {
    const camera = { x: 500, y: 300, scale: 0.5 };
    const focal = { x: 320, y: 100 };
    const before = screenToWorld(camera, focal, VIEWPORT);
    const zoomed = zoomAround(camera, 2, focal, VIEWPORT);
    expect(zoomed.scale).toBe(1);
    const after = screenToWorld(zoomed, focal, VIEWPORT);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });
});
