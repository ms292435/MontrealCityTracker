import type { SegmentState } from '../../domain/progress';
import type { QuartierLevel } from '../../domain/quartiers';

export const MAP_BACKGROUND = '#F2F0EA';

export const STATE_COLORS: Record<SegmentState, string> = {
  non_parcourue: '#B3AEA2',
  partielle: '#F2A541',
  completee: '#1D7A6E',
};

export const SELECTED_COLOR = '#2B2B2B';
export const USER_POSITION_COLOR = '#2B6CB0';

// Teinte légère des quartiers au dézoom (FR-017), sous les rues.
export const QUARTIER_FILLS: Record<QuartierLevel, string> = {
  0: 'rgba(179, 174, 162, 0.10)',
  1: 'rgba(242, 165, 65, 0.15)',
  2: 'rgba(242, 165, 65, 0.28)',
  3: 'rgba(29, 122, 110, 0.18)',
  4: 'rgba(29, 122, 110, 0.30)',
  5: 'rgba(29, 122, 110, 0.45)',
};
export const QUARTIER_SELECTED_STROKE = '#2B2B2B';

// Épaisseurs en pixels à l'écran selon l'échelle (px/m) ; 0 = filet d'un pixel (rapide).
export function neutralStrokePx(scale: number): number {
  'worklet';
  if (scale >= 0.6) return 2.5;
  if (scale >= 0.2) return 1.5;
  return 0;
}

export function stateStrokePx(scale: number): number {
  'worklet';
  if (scale >= 0.6) return 5;
  if (scale >= 0.2) return 3.5;
  return 2.5;
}
