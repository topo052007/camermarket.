// Système de design : toutes les couleurs, tailles et espacements sont ici.
// Couleur principale : vert profond (croissance, confiance) + accent soleil.

export const couleurs = {
  primaire: '#1F6F5C',
  primaireFonce: '#155446',
  primaireClair: '#E8F3EF',
  accent: '#F2A93B',
  accentClair: '#FDF3E2',
  fond: '#F7F8F6',
  surface: '#FFFFFF',
  texte: '#17211D',
  texteSecondaire: '#5B6B64',
  texteInverse: '#FFFFFF',
  bordure: '#DDE4E0',
  succes: '#2E8B57',
  succesClair: '#E6F4EC',
  avertissement: '#B26A00',
  avertissementClair: '#FFF4E0',
  danger: '#B3261E',
  dangerClair: '#FCEBEA',
  desactive: '#A9B5AF',
} as const;

export const espace = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const rayon = { s: 8, m: 12, l: 16, rond: 999 } as const;

export const texte = {
  titre1: { fontSize: 26, fontWeight: '700' as const, lineHeight: 32 },
  titre2: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  titre3: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  corps: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  petit: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  libelle: { fontSize: 14, fontWeight: '600' as const, lineHeight: 19 },
};

/** Zone tactile minimale recommandée (accessibilité). */
export const TACTILE_MIN = 44;
