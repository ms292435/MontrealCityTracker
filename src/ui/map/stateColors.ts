import type { SegmentState } from '../../domain/progress';
import type { QuartierLevel } from '../../domain/quartiers';

export const MAP_BACKGROUND = '#F2F0EA'; // couleur de assets/blank-tile.png

export const STATE_COLORS: Record<SegmentState, string> = {
  non_parcourue: '#B3AEA2',
  partielle: '#F2A541',
  completee: '#1D7A6E',
};

export const STATE_WIDTHS: Record<SegmentState, number> = {
  non_parcourue: 3,
  partielle: 4,
  completee: 5,
};

export const SELECTED_EXTRA_WIDTH = 3;

// Vue par quartier (FR-017) : du neutre au vert des rues complétées, par paliers.
export const QUARTIER_FILLS: Record<QuartierLevel, string> = {
  0: 'rgba(179, 174, 162, 0.25)',
  1: 'rgba(242, 165, 65, 0.30)',
  2: 'rgba(242, 165, 65, 0.55)',
  3: 'rgba(29, 122, 110, 0.35)',
  4: 'rgba(29, 122, 110, 0.60)',
  5: 'rgba(29, 122, 110, 0.85)',
};
export const QUARTIER_STROKE = 'rgba(80, 76, 68, 0.6)';
export const QUARTIER_SELECTED_STROKE = '#222222';
export const USER_POSITION_COLOR = '#2B6CB0';
