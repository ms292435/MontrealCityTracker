// Tous les textes visibles par l'utilisateur (principe VI de la constitution).
export const fr = {
  permission: {
    explanation:
      "Montréal à pied utilise votre position pour colorer les rues que vous parcourez. Elle reste sur votre téléphone et n'est jamais envoyée.",
    allow: 'Autoriser la localisation',
    denied:
      'Localisation refusée : vos rues ne peuvent pas se colorer. Pour l’activer, ouvrez Réglages, puis la localisation de cette app, et choisissez « Pendant l’utilisation ».',
    openSettings: 'Ouvrir les Réglages',
  },
  map: {
    zoomIn: 'Zoomez pour voir les rues',
    loading: 'Chargement de votre progression…',
    attribution: '© contributeurs OpenStreetMap · Ville de Montréal (CC BY 4.0)',
  },
  segmentState: {
    non_parcourue: 'Non parcourue',
    partielle: 'Partiellement parcourue',
    completee: 'Complétée',
  },
  segmentInfo: {
    details: (percent: number, length: string) => `${percent} % parcourue · Longueur ${length}`,
  },
  streetNames: {
    alley: 'Ruelle',
    unknownQuartier: 'Inconnu',
  },
  reset: {
    button: 'Effacer l’historique',
    title: 'Effacer tout l’historique ?',
    message:
      'Toutes les rues redeviendront non parcourues. Cette action est définitive.',
    cancel: 'Annuler',
    confirm: 'Effacer',
  },
  errors: {
    database: 'Impossible d’ouvrir les données des rues.',
  },
} as const;
