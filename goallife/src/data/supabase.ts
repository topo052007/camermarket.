import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL, configurationComplete } from '@/config/env';

// Client Supabase avec la clé PUBLIQUE uniquement : la sécurité repose sur la RLS côté serveur.
// La session est conservée dans AsyncStorage (recommandation Supabase pour Expo).
export const supabase = createClient(
  configurationComplete ? SUPABASE_URL : 'http://localhost:54321',
  SUPABASE_CLE_PUBLIQUE || 'cle-absente',
  {
    auth: {
      storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);

// Rafraîchit le jeton seulement quand l'application est au premier plan (économise batterie et données).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (etat) => {
    if (etat === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
