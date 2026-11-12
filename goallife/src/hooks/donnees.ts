import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { actionsEntre, chargerAction, type ActionAvecObjectif, type ChangementStatut } from '@/data/actions';
import { chargerCandidature, listerCandidatures } from '@/data/candidatures';
import { cles } from '@/data/cles';
import { chargerHistorique } from '@/data/historique';
import { chargerObjectif, listerObjectifs } from '@/data/objectifs';
import { chargerAbonnement, chargerPrefsNotifications, chargerProfil } from '@/data/profil';
import { offreEffective } from '@/domain/offres';
import { CLE_MUTATION_STATUT } from '@/offline/client-requetes';
import { useSession } from '@/providers/Session';

// Hooks de lecture/écriture : l'interface ne parle jamais directement à Supabase.

function useConnecte() {
  return Boolean(useSession().session);
}

export function useProfil() {
  const connecte = useConnecte();
  return useQuery({ queryKey: cles.profil, queryFn: chargerProfil, enabled: connecte });
}

export function usePrefsNotifications() {
  const connecte = useConnecte();
  return useQuery({ queryKey: cles.prefsNotifications, queryFn: chargerPrefsNotifications, enabled: connecte });
}

export function useAbonnement() {
  const connecte = useConnecte();
  const requete = useQuery({ queryKey: cles.abonnement, queryFn: chargerAbonnement, enabled: connecte });
  return { ...requete, offre: offreEffective(requete.data ?? null) };
}

export function useObjectifs(depuis: string) {
  const connecte = useConnecte();
  return useQuery({ queryKey: cles.objectifs, queryFn: () => listerObjectifs(depuis), enabled: connecte });
}

export function useObjectif(id: string) {
  const connecte = useConnecte();
  return useQuery({ queryKey: cles.objectif(id), queryFn: () => chargerObjectif(id), enabled: connecte && Boolean(id) });
}

export function useActionsPeriode(debut: string, fin: string) {
  const connecte = useConnecte();
  return useQuery({ queryKey: cles.actionsPeriode(debut, fin), queryFn: () => actionsEntre(debut, fin), enabled: connecte });
}

export function useAction(id: string) {
  const connecte = useConnecte();
  return useQuery({ queryKey: cles.action(id), queryFn: () => chargerAction(id), enabled: connecte && Boolean(id) && id !== 'nouvelle' });
}

export function useHistorique() {
  const connecte = useConnecte();
  return useQuery({ queryKey: cles.historique, queryFn: () => chargerHistorique(), enabled: connecte });
}

export function useCandidatures() {
  const connecte = useConnecte();
  return useQuery({ queryKey: cles.candidatures, queryFn: listerCandidatures, enabled: connecte });
}

export function useCandidature(id: string) {
  const connecte = useConnecte();
  return useQuery({ queryKey: cles.candidature(id), queryFn: () => chargerCandidature(id), enabled: connecte && Boolean(id) && id !== 'nouvelle' });
}

/**
 * Change le statut d'une action. Fonctionne hors connexion : la modification est affichée
 * immédiatement et envoyée quand le réseau revient (voir offline/client-requetes.ts).
 */
export function useChangerStatutAction() {
  const client = useQueryClient();
  return useMutation<void, Error, ChangementStatut, unknown>({
    mutationKey: CLE_MUTATION_STATUT,
    onMutate: async (c) => {
      await client.cancelQueries({ queryKey: cles.actions });
      // Mise à jour optimiste des listes d'actions en cache (sauf le report : il crée une nouvelle action).
      if (c.statut !== 'reportee') {
        client.setQueriesData<ActionAvecObjectif[]>({ queryKey: cles.actions }, (liste) =>
          liste?.map((a) =>
            a.id === c.actionId
              ? {
                  ...a,
                  statut: c.statut,
                  terminee_le: c.statut === 'terminee' ? new Date().toISOString() : null,
                  quantite_realisee: c.statut === 'terminee' ? (c.quantite ?? a.quantite_prevue) : null,
                }
              : a,
          ),
        );
      }
    },
  });
}

/** Nombre de modifications en attente d'envoi (hors connexion). */
export function useModificationsEnAttente(): number {
  return useMutationState({ filters: { status: 'pending' }, select: (m) => m.state.isPaused }).filter(Boolean).length;
}
