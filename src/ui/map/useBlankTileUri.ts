import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';

// Tuile unie locale (file://) qui remplace le fond de carte Apple (research.md R1, R2).
export function useBlankTileUri(): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const asset = Asset.fromModule(require('../../../assets/blank-tile.png'));
    asset.downloadAsync().then((loaded) => {
      if (!cancelled) setUri(loaded.localUri);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return uri;
}
