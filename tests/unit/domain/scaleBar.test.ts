import { scaleBar } from '../../../src/domain/scaleBar';

describe('scaleBar', () => {
  it('donne 100 m sur 100 px à 1 px/m', () => {
    expect(scaleBar(1)).toEqual({ meters: 100, widthPx: 100 });
  });

  it('donne 2 km sur 60 px à 0,03 px/m', () => {
    const bar = scaleBar(0.03);
    expect(bar.meters).toBe(2000);
    expect(bar.widthPx).toBeCloseTo(60, 9);
  });

  it('choisit toujours 1, 2 ou 5 × 10ⁿ mètres sans dépasser la largeur maximale', () => {
    for (const pxPerMeter of [0.009, 0.013, 0.05, 0.11, 0.4, 0.77, 1.6, 3.9]) {
      const { meters, widthPx } = scaleBar(pxPerMeter);
      const mantissa = meters / 10 ** Math.floor(Math.log10(meters));
      expect([1, 2, 5]).toContain(Math.round(mantissa));
      expect(widthPx).toBeLessThanOrEqual(100);
      expect(widthPx).toBeGreaterThan(20);
    }
  });

  it('respecte une largeur maximale personnalisée', () => {
    expect(scaleBar(1, 60).meters).toBe(50);
  });
});
