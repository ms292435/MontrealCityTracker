import { displayName, isEligible } from '../../../scripts/build-streets/lib/eligibility';

const ACCEPTED = [
  'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link',
  'unclassified', 'residential', 'living_street', 'pedestrian', 'footway', 'path',
  'cycleway', 'steps', 'track', 'service',
];
const REFUSED = [
  'motorway', 'motorway_link', 'trunk', 'trunk_link', 'construction', 'proposed', 'raceway',
  'bus_guideway',
];

describe('isEligible', () => {
  it.each(ACCEPTED.filter((h) => h !== 'service'))('accepte highway=%s avec un nom', (highway) => {
    expect(isEligible({ highway, name: 'Rue Test' })).toBe(true);
  });

  it.each(REFUSED)('refuse highway=%s, même nommée', (highway) => {
    expect(isEligible({ highway, name: 'Autoroute Test' })).toBe(false);
  });

  it('refuse une voie sans highway', () => {
    expect(isEligible({ name: 'Rue Test' })).toBe(false);
  });

  it('accepte une ruelle (service=alley) même sans nom', () => {
    expect(isEligible({ highway: 'service', service: 'alley' })).toBe(true);
    expect(isEligible({ highway: 'service', service: 'alley', name: 'Ruelle verte' })).toBe(true);
  });

  it('refuse highway=service sans service=alley', () => {
    expect(isEligible({ highway: 'service', name: 'Accès' })).toBe(false);
  });

  it.each(['driveway', 'parking_aisle', 'drive-through'])('refuse service=%s', (service) => {
    expect(isEligible({ highway: 'service', service, name: 'X' })).toBe(false);
  });

  it('refuse une voie non-ruelle sans nom', () => {
    expect(isEligible({ highway: 'residential' })).toBe(false);
    expect(isEligible({ highway: 'path' })).toBe(false);
  });

  it.each(['yes', 'building_passage', 'culvert'])('refuse tunnel=%s', (tunnel) => {
    expect(isEligible({ highway: 'residential', name: 'X', tunnel })).toBe(false);
  });

  it('accepte tunnel=no', () => {
    expect(isEligible({ highway: 'residential', name: 'X', tunnel: 'no' })).toBe(true);
  });

  it.each(['private', 'no'])('refuse access=%s', (access) => {
    expect(isEligible({ highway: 'residential', name: 'X', access })).toBe(false);
  });

  it.each(['sidewalk', 'crossing'])('refuse footway=%s', (footway) => {
    expect(isEligible({ highway: 'footway', name: 'X', footway })).toBe(false);
  });

  it('refuse area=yes', () => {
    expect(isEligible({ highway: 'pedestrian', name: 'Place X', area: 'yes' })).toBe(false);
  });
});

describe('displayName', () => {
  it('renvoie le nom OSM', () => {
    expect(displayName({ highway: 'residential', name: 'Rue Rachel Est' })).toBe('Rue Rachel Est');
  });

  it('renvoie « Ruelle » pour une ruelle sans nom', () => {
    expect(displayName({ highway: 'service', service: 'alley' })).toBe('Ruelle');
  });
});
