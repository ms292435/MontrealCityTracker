import type { SegmentState } from '../../domain/progress';

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
export const USER_POSITION_COLOR = '#2B6CB0';
