import { percentVisited, segmentState } from '../../../src/domain/progress';

describe('segmentState', () => {
  it.each([
    [0, 10, 'non_parcourue'],
    [1, 10, 'partielle'],
    [8, 10, 'partielle'],
    [9, 10, 'completee'],
    [10, 10, 'completee'],
    [1, 2, 'partielle'],
    [2, 2, 'completee'],
  ] as const)('%i / %i → %s', (visited, total, expected) => {
    expect(segmentState(visited, total)).toBe(expected);
  });
});

describe('percentVisited', () => {
  it('arrondit à l’entier inférieur (jamais 100 % avant 100 %)', () => {
    expect(percentVisited(199, 200)).toBe(99);
  });

  it('vaut 0 et 100 aux extrêmes', () => {
    expect(percentVisited(0, 7)).toBe(0);
    expect(percentVisited(7, 7)).toBe(100);
  });

  it('donne 33 pour 1 / 3', () => {
    expect(percentVisited(1, 3)).toBe(33);
  });
});
