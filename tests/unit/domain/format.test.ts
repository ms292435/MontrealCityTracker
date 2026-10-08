import { formatLength } from '../../../src/domain/format';

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
