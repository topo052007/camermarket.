import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { HORIZON_JOURS } from '@/config/env';
import { genererActions } from '@/data/actions';
import { cles } from '@/data/cles';
import { ajouterJours } from '@/domain/dates';
import { enregistrerJetonPush } from '@/notifications';
import { useSynchroRappels } from '@/notifications/useSynchroRappels';
import { useI18n } from '@/providers/I18n';

/**
 * Travail de fond quand l'utilisateur est connecté :
 * - crée les actions des 14 prochains jours (à l'ouverture et au retour au premier plan) ;
 * - reprogramme les rappels locaux ;
 * - enregistre le jeton push si un projet EAS est configuré.
 */
export function useSynchroArrierePlan(): void {
  const client = useQueryClient();
  const { aujourdhui } = useI18n();
  useSynchroRappels();

  useEffect(() => {
    const generer = () =>
      genererActions(ajouterJours(aujourdhui(), HORIZON_JOURS))
        .then((crees) => {
          if (crees > 0) {
            void client.invalidateQueries({ queryKey: cles.actions });
            void client.invalidateQueries({ queryKey: cles.objectifs });
          }
        })
        .catch(() => undefined); // hors connexion : on réessaiera au prochain retour au premier plan
    void generer();
    void enregistrerJetonPush();
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') void generer();
    });
    return () => abonnement.remove();
  }, [client, aujourdhui]);
}
