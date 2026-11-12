import type { Action, CodeCategorie, StatutAction, TypeObjectif, Unite } from '@/domain/types';
import { verifier } from './erreurs';
import { supabase } from './supabase';

export type ActionAvecObjectif = Action & {
  objectifs: { titre: string; categorie: CodeCategorie; unite: Unite | null; type: TypeObjectif; statut: string } | null;
};

export async function actionsEntre(debut: string, fin: string): Promise<ActionAvecObjectif[]> {
  const res = await supabase
    .from('actions')
    .select('*, objectifs(titre, categorie, unite, type, statut)')
    .gte('date_prevue', debut)
    .lte('date_prevue', fin)
    .order('date_prevue')
    .order('cree_le');
  return verifier(res) as ActionAvecObjectif[];
}

export type LigneHistoriqueAction = { id: number; ancien_statut: string | null; nouveau_statut: string; details: Record<string, unknown>; cree_le: string };

export async function chargerAction(id: string): Promise<(ActionAvecObjectif & { historique_actions: LigneHistoriqueAction[] }) | null> {
  const res = await supabase
    .from('actions')
    .select('*, objectifs(titre, categorie, unite, type, statut), historique_actions(id, ancien_statut, nouveau_statut, details, cree_le)')
    .eq('id', id)
    .order('cree_le', { referencedTable: 'historique_actions', ascending: false })
    .maybeSingle();
  return verifier(res) as (ActionAvecObjectif & { historique_actions: LigneHistoriqueAction[] }) | null;
}

export type ChangementStatut = {
  actionId: string;
  statut: StatutAction;
  quantite?: number | null;
  raison?: string | null;
  nouvelleDate?: string | null;
};

export async function changerStatutAction(c: ChangementStatut): Promise<void> {
  verifier(
    await supabase.rpc('changer_statut_action', {
      p_action: c.actionId,
      p_statut: c.statut,
      p_quantite: c.quantite ?? null,
      p_raison: c.raison ?? null,
      p_nouvelle_date: c.nouvelleDate ?? null,
    }),
  );
}

export type SaisieAction = { titre: string; date_prevue: string; quantite_prevue: number | null; minutes_prevues: number | null };

export async function creerAction(objectifId: string, saisie: SaisieAction): Promise<string> {
  const res = await supabase.from('actions').insert({ objectif_id: objectifId, ...saisie }).select('id').single();
  return (verifier(res) as { id: string }).id;
}

export async function modifierAction(id: string, saisie: SaisieAction): Promise<void> {
  verifier(await supabase.from('actions').update(saisie).eq('id', id).select('id').single());
}

export async function supprimerAction(id: string): Promise<void> {
  verifier(await supabase.from('actions').delete().eq('id', id));
}

/** Crée les actions des récurrences jusqu'à la date donnée (idempotent). */
export async function genererActions(jusquAu: string): Promise<number> {
  return verifier(await supabase.rpc('generer_actions_jusqu_au', { p_jusqu_au: jusquAu })) as number;
}
