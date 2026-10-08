import type { LatLon } from '../../../src/domain/geo.ts';

export type OsmWay = { id: number; name: string; nodes: number[]; coords: LatLon[] };
export type Segment = { name: string; coords: LatLon[] };

type Piece = { name: string; nodes: number[]; coords: LatLon[] };
type PieceEnd = { piece: number; atStart: boolean };

// Découpe les voies en tronçons entre intersections (research.md R6).
// Un nœud est une coupure si son degré (nombre d'arêtes incidentes) n'est pas 2, ou si les
// voies qui s'y rejoignent ont des noms différents. Les voies OSM de même nom reliées par un
// nœud de degré 2 sont chaînées en un seul tronçon.
export function buildSegments(ways: OsmWay[]): Segment[] {
  const degree = new Map<number, number>();
  const names = new Map<number, Set<string>>();
  for (const way of ways) {
    const last = way.nodes.length - 1;
    way.nodes.forEach((node, i) => {
      degree.set(node, (degree.get(node) ?? 0) + (i === 0 || i === last ? 1 : 2));
      const set = names.get(node) ?? new Set<string>();
      set.add(way.name);
      names.set(node, set);
    });
  }
  const isCut = (node: number) => degree.get(node) !== 2 || (names.get(node)?.size ?? 0) > 1;

  // 1. Morceaux : chaque voie coupée à ses nœuds coupants intérieurs.
  const pieces: Piece[] = [];
  for (const way of ways) {
    let start = 0;
    for (let i = 1; i < way.nodes.length; i++) {
      if (i === way.nodes.length - 1 || isCut(way.nodes[i])) {
        pieces.push({
          name: way.name,
          nodes: way.nodes.slice(start, i + 1),
          coords: way.coords.slice(start, i + 1),
        });
        start = i;
      }
    }
  }

  // 2. Extrémités de morceaux posées sur un nœud non coupant (deux par nœud).
  const ends = new Map<number, PieceEnd[]>();
  pieces.forEach((piece, index) => {
    addEnd(ends, isCut, piece.nodes[0], { piece: index, atStart: true });
    addEnd(ends, isCut, piece.nodes[piece.nodes.length - 1], { piece: index, atStart: false });
  });

  // 3. Chaînage des morceaux à travers les nœuds non coupants.
  const used = new Array<boolean>(pieces.length).fill(false);

  const extend = (startIndex: number, enterAtStart: boolean): Segment => {
    used[startIndex] = true;
    let current = oriented(pieces[startIndex], enterAtStart);
    const coords = [...current.coords];
    let endNode = current.nodes[current.nodes.length - 1];
    while (!isCut(endNode)) {
      const next = (ends.get(endNode) ?? []).find((e) => !used[e.piece]);
      if (!next) break; // boucle refermée
      used[next.piece] = true;
      current = oriented(pieces[next.piece], next.atStart);
      coords.push(...current.coords.slice(1));
      endNode = current.nodes[current.nodes.length - 1];
    }
    return { name: pieces[startIndex].name, coords };
  };

  const segments: Segment[] = [];
  pieces.forEach((piece, index) => {
    if (used[index]) return;
    if (isCut(piece.nodes[0])) segments.push(extend(index, true));
    else if (isCut(piece.nodes[piece.nodes.length - 1])) segments.push(extend(index, false));
  });
  // Morceaux restants : boucles sans aucune coupure.
  pieces.forEach((_, index) => {
    if (!used[index]) segments.push(extend(index, true));
  });
  return segments;
}

function addEnd(
  ends: Map<number, PieceEnd[]>,
  isCut: (node: number) => boolean,
  node: number,
  end: PieceEnd,
): void {
  if (isCut(node)) return;
  const list = ends.get(node) ?? [];
  list.push(end);
  ends.set(node, list);
}

// Parcourt le morceau depuis l'extrémité par laquelle on y entre.
function oriented(piece: Piece, enterAtStart: boolean): Piece {
  if (enterAtStart) return piece;
  return { name: piece.name, nodes: [...piece.nodes].reverse(), coords: [...piece.coords].reverse() };
}
