import Constants from 'expo-constants';

// Variables publiques (préfixe EXPO_PUBLIC_) : elles finissent dans l'application.
// N'y mettre JAMAIS de clé secrète (service role, clé IA…) : celles-ci restent côté serveur.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_CLE_PUBLIQUE = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

export const configurationComplete = SUPABASE_URL.startsWith('https://') || SUPABASE_URL.startsWith('http://');

export const NOM_APP = Constants.expoConfig?.name ?? 'GoalLife';

/** Nombre de jours d'actions créés à l'avance pour les récurrences. */
export const HORIZON_JOURS = 14;
