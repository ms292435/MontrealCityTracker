export function formatPercent(percent: number): string {
  return `${percent.toFixed(1).replace('.', ',')} %`;
}

export function formatLength(meters: number): string {
  const rounded = Math.round(meters);
  if (rounded < 1000) return `${rounded} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
