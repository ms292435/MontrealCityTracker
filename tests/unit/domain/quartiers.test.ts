import { quartierLevel, quartierPercent } from '../../../src/domain/quartiers';

describe('quartierLevel', () => {
  it.each([
    [0, 1000, 0],
    [1, 1000, 1],
    [9, 1000, 1],
    [10, 1000, 2],
    [49, 1000, 2],
    [50, 1000, 3],
    [150, 1000, 4],
    [399, 1000, 4],
    [400, 1000, 5],
    [1000, 1000, 5],
  ] as const)('%i / %i → palier %i', (visited, total, expected) => {
    expect(quartierLevel(visited, total)).toBe(expected);
  });

  it('renvoie 0 pour une zone sans point', () => {
    expect(quartierLevel(0, 0)).toBe(0);
  });
});

describe('quartierPercent', () => {
  it('arrondit au dixième inférieur', () => {
    expect(quartierPercent(7, 1000)).toBe(0.7);
    expect(quartierPercent(1999, 2000)).toBe(99.9);
    expect(quartierPercent(1, 3)).toBe(33.3);
  });

  it('vaut 0 pour une zone sans point', () => {
    expect(quartierPercent(0, 0)).toBe(0);
  });
});
