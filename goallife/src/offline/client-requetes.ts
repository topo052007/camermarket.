import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MutationCache, QueryClient, onlineManager } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { changerStatutAction, type ChangementStatut } from '@/data/actions';
import { cles } from '@/data/cles';

// Stratégie hors connexion (voir docs/hors-connexion.md) :
// 1. Les données lues sont gardées sur le téléphone 7 jours et affichées sans réseau.
// 2. Valider / reporter / ignorer une action fonctionne hors connexion : la modification est
//    mise en file d'attente (persistée), affichée tout de suite, puis envoyée au retour du réseau,
//    même après fermeture de l'application.
// 3. Conflits : le serveur fait foi. Le changement de statut est idempotent (valider deux fois
//    = une seule contribution) ; si l'action a été supprimée entre-temps, la modification est abandonnée.
// 4. Créer ou supprimer un objectif demande une connexion (opérations atomiques côté serveur).

if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((etat) => setOnline(etat.isConnected !== false && etat.isInternetReachable !== false)),
  );
}

export const CLE_MUTATION_STATUT = ['action-statut'] as const;

export const clientRequetes = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7,
      staleTime: 1000 * 30,
      retry: (echecs, erreur) => echecs < 2 && !String((erreur as Error)?.message ?? '').includes('JWT'),
      networkMode: 'offlineFirst',
    },
    mutations: { networkMode: 'online' },
  },
  mutationCache: new MutationCache(),
});

// Valeurs par défaut de la mutation hors ligne : nécessaires pour la reprendre après redémarrage.
clientRequetes.setMutationDefaults(CLE_MUTATION_STATUT, {
  mutationFn: (c: ChangementStatut) => changerStatutAction(c),
  retry: 3,
  onSettled: () => {
    void clientRequetes.invalidateQueries({ queryKey: cles.actions });
    void clientRequetes.invalidateQueries({ queryKey: cles.objectifs });
    void clientRequetes.invalidateQueries({ queryKey: ['objectif'] });
    void clientRequetes.invalidateQueries({ queryKey: cles.historique });
  },
});

export const persisteur = createAsyncStoragePersister({
  storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
  key: 'goallife-cache-v1',
  throttleTime: 1000,
});

export async function viderCacheLocal(): Promise<void> {
  clientRequetes.clear();
  await persisteur.removeClient();
}
