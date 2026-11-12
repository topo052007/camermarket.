import type { PlanPropose } from '@/domain/plan';
import type { Action, Etape, EvenementProgression, Objectif, Recurrence, StatutObjectif } from '@/domain/types';
import type { SaisieObjectif } from '@/domain/validation';
import { verifier } from './erreurs';
import { supabase } from './supabase';

export type ObjectifResume = Objectif & {
  etapes: Pick<Etape, 'terminee_le'>[];
  evenements_progression: Pick<EvenementProgression, 'type' | 'valeur'>[];
  actions: Pick<Action, 'statut' | 'date_prevue' | 'terminee_le'>[];
  recurrences: Pick<Recurrence, 'jours_semaine' | 'active'>[];
};

/** Liste des objectifs avec ce qu'il faut pour calculer la progression (actions des 60 derniers jours). */
export async function listerObjectifs(depuis: string): Promise<ObjectifResume[]> {
  const res = await supabase
    .from('objectifs')
    .select('*, etapes(terminee_le), evenements_progression(type, valeur), actions(statut, date_prevue, terminee_le), recurrences(jours_semaine, active)')
    .gte('actions.date_prevue', depuis)
    .order('priorite', { ascending: true })
    .order('cree_le', { ascending: false });
  return verifier(res) as ObjectifResume[];
}

export type ObjectifDetail = Objectif & {
  etapes: Etape[];
  recurrences: Recurrence[];
  actions: Action[];
  evenements_progression: EvenementProgression[];
};

export async function chargerObjectif(id: string): Promise<ObjectifDetail | null> {
  const res = await supabase
    .from('objectifs')
    .select('*, etapes(*), recurrences(*), actions(*), evenements_progression(*)')
    .eq('id', id)
    .order('ordre', { referencedTable: 'etapes' })
    .order('date_prevue', { referencedTable: 'actions' })
    .order('date_evenement', { referencedTable: 'evenements_progression', ascending: false })
    .maybeSingle();
  return verifier(res) as ObjectifDetail | null;
}

export async function creerObjectifAvecPlan(saisie: SaisieObjectif, plan: PlanPropose, horizon: string): Promise<string> {
  const res = await supabase.rpc('creer_objectif_avec_plan', {
    p_objectif: {
      titre: saisie.titre,
      description: saisie.description,
      categorie: saisie.categorie,
      type: saisie.type,
      priorite: saisie.priorite,
      date_debut: saisie.dateDebut,
      date_echeance: saisie.dateEcheance,
      valeur_cible: saisie.type === 'quantitatif' ? saisie.valeurCible : null,
      valeur_initiale: saisie.type === 'quantitatif' ? saisie.valeurInitiale : 0,
      unite: saisie.unite,
      minutes_par_seance: saisie.minutesParSeance,
      rappel_actif: saisie.rappelActif,
      rappel_heure: saisie.rappelActif ? saisie.rappelHeure : null,
      source_plan: plan.source,
    },
    p_etapes: plan.etapes.map((e) => ({ titre: e.titre, date_cible: e.dateCible, valeur_cible: e.valeurCible })),
    p_recurrences: plan.recurrences.map((r) => ({
      titre: r.titre,
      jours_semaine: r.joursSemaine,
      quantite: r.quantite,
      minutes: r.minutes,
      date_debut: r.dateDebut,
      date_fin: r.dateFin,
    })),
    p_horizon: horizon,
  });
  return verifier(res) as string;
}

export type MajObjectif = Partial<
  Pick<Objectif, 'titre' | 'description' | 'priorite' | 'date_echeance' | 'rappel_actif' | 'rappel_heure' | 'statut' | 'categorie'>
>;

export async function modifierObjectif(id: string, champs: MajObjectif): Promise<void> {
  verifier(await supabase.from('objectifs').update(champs).eq('id', id).select('id').single());
}

export async function changerStatutObjectif(id: string, statut: StatutObjectif): Promise<void> {
  await modifierObjectif(id, { statut });
}

export async function supprimerObjectif(id: string): Promise<void> {
  verifier(await supabase.from('objectifs').delete().eq('id', id));
}

export async function modifierRythme(recurrenceId: string, jours: number[], quantite: number | null, minutes: number | null, horizon: string): Promise<void> {
  verifier(
    await supabase.rpc('modifier_rythme', { p_recurrence: recurrenceId, p_jours: jours, p_quantite: quantite, p_minutes: minutes, p_horizon: horizon }),
  );
}

export async function ajouterContribution(objectifId: string, valeur: number, date: string, note: string | null): Promise<void> {
  verifier(
    await supabase.from('evenements_progression').insert({ objectif_id: objectifId, type: 'contribution', valeur, date_evenement: date, note }),
  );
}

export async function supprimerContribution(id: string): Promise<void> {
  verifier(await supabase.from('evenements_progression').delete().eq('id', id));
}

export async function cocherEtape(id: string, faite: boolean): Promise<void> {
  verifier(await supabase.from('etapes').update({ terminee_le: faite ? new Date().toISOString() : null }).eq('id', id));
}

export type OptionReprise = 'action_minimale' | 'reduire_effort' | 'decaler_echeance' | 'nouveau_planning';

export async function reprendreObjectif(id: string, option: OptionReprise, titreAction: string | null, jours = 7): Promise<{ manquees_ignorees: number }> {
  const res = await supabase.rpc('reprendre_objectif', { p_objectif: id, p_option: option, p_titre_action: titreAction, p_jours: jours });
  return verifier(res) as { manquees_ignorees: number };
}
