// Échelle graphique (FR-020) : la plus grande distance « ronde » (1, 2 ou 5 × 10ⁿ m) dont la
// longueur à l'écran tient dans maxWidthPx.
export function scaleBar(pxPerMeter: number, maxWidthPx = 100): { meters: number; widthPx: number } {
  'worklet';
  const maxMeters = maxWidthPx / pxPerMeter;
  const power = 10 ** Math.floor(Math.log10(maxMeters));
  let meters = power;
  if (5 * power <= maxMeters) meters = 5 * power;
  else if (2 * power <= maxMeters) meters = 2 * power;
  return { meters, widthPx: meters * pxPerMeter };
}
