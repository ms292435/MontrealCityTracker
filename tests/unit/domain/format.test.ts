import { formatLength, formatPercent, formatScale } from '../../../src/domain/format';

describe('formatScale', () => {
  it('affiche des distances rondes, sans décimale', () => {
    expect(formatScale(500)).toBe('500 m');
    expect(formatScale(2000)).toBe('2 km');
    expect(formatScale(10000)).toBe('10 km');
  });
});

describe('formatPercent', () => {
  it('affiche une décimale avec une virgule', () => {
    expect(formatPercent(0.7)).toBe('0,7 %');
    expect(formatPercent(12)).toBe('12,0 %');
  });
});

describe('formatLength', () => {
  it('affiche les mètres sous 1 km', () => {
    expect(formatLength(85)).toBe('85 m');
    expect(formatLength(85.4)).toBe('85 m');
  });

  it('affiche les kilomètres avec une décimale et une virgule', () => {
    expect(formatLength(1234)).toBe('1,2 km');
    expect(formatLength(1000)).toBe('1,0 km');
  });

  it('bascule en km quand l’arrondi atteint 1 000 m', () => {
    expect(formatLength(999.6)).toBe('1,0 km');
  });
});
