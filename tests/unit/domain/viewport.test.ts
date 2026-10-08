import { queryBounds, shouldShowStreets } from '../../../src/domain/viewport';

const region = (latitudeDelta: number) => ({
  latitude: 45.5,
  longitude: -73.6,
  latitudeDelta,
  longitudeDelta: latitudeDelta,
});

describe('shouldShowStreets', () => {
  it('affiche les rues jusqu’à latitudeDelta = 0,015', () => {
    expect(shouldShowStreets(region(0.01))).toBe(true);
    expect(shouldShowStreets(region(0.015))).toBe(true);
  });

  it('masque les rues au-delà', () => {
    expect(shouldShowStreets(region(0.0151))).toBe(false);
  });
});

describe('queryBounds', () => {
  it('élargit la région de 20 %', () => {
    const b = queryBounds({ latitude: 45.5, longitude: -73.6, latitudeDelta: 0.01, longitudeDelta: 0.02 });
    expect(b.north).toBeCloseTo(45.5 + 0.006, 9);
    expect(b.south).toBeCloseTo(45.5 - 0.006, 9);
    expect(b.east).toBeCloseTo(-73.6 + 0.012, 9);
    expect(b.west).toBeCloseTo(-73.6 - 0.012, 9);
  });
});
