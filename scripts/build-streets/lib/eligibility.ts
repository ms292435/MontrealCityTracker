import { fr } from '../../../src/strings/fr.ts';

// Voies retenues (research.md R4). Les autoroutes et voies rapides (motorway, trunk et leurs
// bretelles) ne figurent pas dans cette liste, donc sont exclues.
export const ACCEPTED_HIGHWAYS = [
  'primary',
  'primary_link',
  'secondary',
  'secondary_link',
  'tertiary',
  'tertiary_link',
  'unclassified',
  'residential',
  'living_street',
  'pedestrian',
  'footway',
  'path',
  'cycleway',
  'steps',
  'track',
  'service',
];
const ACCEPTED = new Set(ACCEPTED_HIGHWAYS);

const EXCLUDED_ACCESS = new Set(['private', 'no']);
const EXCLUDED_FOOTWAY = new Set(['sidewalk', 'crossing']);

export type Tags = Record<string, string | undefined>;

function isAlley(tags: Tags): boolean {
  return tags.highway === 'service' && tags.service === 'alley';
}

export function isEligible(tags: Tags): boolean {
  const { highway } = tags;
  if (highway === undefined || !ACCEPTED.has(highway)) return false;
  if (highway === 'service' && !isAlley(tags)) return false;
  if (tags.tunnel !== undefined && tags.tunnel !== 'no') return false;
  if (tags.access !== undefined && EXCLUDED_ACCESS.has(tags.access)) return false;
  if (tags.footway !== undefined && EXCLUDED_FOOTWAY.has(tags.footway)) return false;
  if (tags.area === 'yes') return false;
  if (!tags.name && !isAlley(tags)) return false;
  return true;
}

export function displayName(tags: Tags): string {
  return tags.name || fr.streetNames.alley;
}
