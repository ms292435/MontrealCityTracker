import { buildSegments, type OsmWay } from '../../../scripts/build-streets/lib/segmentation';

// Nœud n → coordonnée fictive déterministe.
const c = (n: number) => ({ lat: 45.5 + n * 0.0001, lon: -73.6 + n * 0.0001 });
const way = (id: number, name: string, nodes: number[]): OsmWay => ({
  id,
  name,
  nodes,
  coords: nodes.map(c),
});

const nodesOf = (coords: { lat: number; lon: number }[]) =>
  coords.map((p) => Math.round((p.lat - 45.5) / 0.0001));

function sortedNodeLists(segments: ReturnType<typeof buildSegments>) {
  return segments
    .map((s) => {
      const nodes = nodesOf(s.coords);
      return nodes[0] <= nodes[nodes.length - 1] ? nodes : [...nodes].reverse();
    })
    .sort((a, b) => {
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
      }
      return a.length - b.length;
    });
}

describe('buildSegments', () => {
  it('garde une voie isolée en un seul tronçon', () => {
    const segments = buildSegments([way(1, 'Rue A', [1, 2, 3])]);
    expect(segments).toHaveLength(1);
    expect(segments[0].name).toBe('Rue A');
    expect(nodesOf(segments[0].coords)).toEqual([1, 2, 3]);
  });

  it('coupe une voie traversée par une autre (intersection)', () => {
    const segments = buildSegments([way(1, 'Rue A', [1, 2, 3]), way(2, 'Rue B', [10, 2, 11])]);
    expect(sortedNodeLists(segments)).toEqual([
      [1, 2],
      [2, 3],
      [2, 10],
      [2, 11],
    ]);
  });

  it('chaîne deux voies OSM de même nom reliées par un nœud de degré 2', () => {
    const segments = buildSegments([way(1, 'Rue A', [1, 2, 3]), way(2, 'Rue A', [3, 4, 5])]);
    expect(segments).toHaveLength(1);
    expect(sortedNodeLists(segments)).toEqual([[1, 2, 3, 4, 5]]);
  });

  it('chaîne même si une des voies est orientée à l’envers', () => {
    const segments = buildSegments([way(1, 'Rue A', [1, 2, 3]), way(2, 'Rue A', [5, 4, 3])]);
    expect(sortedNodeLists(segments)).toEqual([[1, 2, 3, 4, 5]]);
  });

  it('coupe au changement de nom', () => {
    const segments = buildSegments([way(1, 'Rue A', [1, 2, 3]), way(2, 'Rue B', [3, 4, 5])]);
    expect(sortedNodeLists(segments)).toEqual([
      [1, 2, 3],
      [3, 4, 5],
    ]);
  });

  it('garde une boucle fermée sans intersection en un seul tronçon', () => {
    const segments = buildSegments([way(1, 'Croissant A', [1, 2, 3, 4, 1])]);
    expect(segments).toHaveLength(1);
    expect(segments[0].coords).toHaveLength(5);
  });

  it('chaîne une boucle formée de deux voies de même nom', () => {
    const segments = buildSegments([way(1, 'Croissant A', [1, 2, 3]), way(2, 'Croissant A', [3, 4, 1])]);
    expect(segments).toHaveLength(1);
    expect(segments[0].coords).toHaveLength(5);
  });

  it('coupe une boucle rattachée à une rue au point de jonction', () => {
    const segments = buildSegments([way(1, 'Croissant A', [1, 2, 3, 1]), way(2, 'Rue B', [1, 9])]);
    expect(segments).toHaveLength(2);
  });
});
