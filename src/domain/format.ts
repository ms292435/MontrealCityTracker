// Distances de l'échelle, toujours « rondes » (scaleBar).
export function formatScale(meters: number): string {
  'worklet';
  return meters < 1000 ? `${meters} m` : `${meters / 1000} km`;
}

export function formatPercent(percent: number): string {
  return `${percent.toFixed(1).replace('.', ',')} %`;
}

export function formatLength(meters: number): string {
  const rounded = Math.round(meters);
  if (rounded < 1000) return `${rounded} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
