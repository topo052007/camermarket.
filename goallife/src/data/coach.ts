import type { PlanPropose } from '@/domain/plan';
import type { Langue } from '@/domain/types';
import { schemaPlanPropose, type SaisieObjectif } from '@/domain/validation';
import { verifier } from './erreurs';
import { supabase } from './supabase';

// Toutes les requêtes IA passent par la fonction serveur « coach » (supabase/functions/coach).
// Aucune clé IA n'existe dans l'application.

export type StatutCoach = { ia_configuree: boolean; offre: 'gratuit' | 'premium'; utilise: number; quota: number };

export type MessageCoach = { id: string; role: 'utilisateur' | 'coach'; contenu: string; source: 'ia' | 'regles'; cree_le: string };

async function appeler<T>(corps: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('coach', { body: corps });
  if (error) throw error;
  return data as T;
}

export function statutCoach(): Promise<StatutCoach> {
  return appeler<StatutCoach>({ mode: 'statut' });
}

export type ReponseCoach =
  | { ok: true; reponse: string; utilise: number; quota: number }
  | { ok: false; raison: 'non_configuree' | 'quota_epuise' | 'indisponible' };

export function demanderAuCoach(question: string, langue: Langue): Promise<ReponseCoach> {
  return appeler<ReponseCoach>({ mode: 'message', question, langue });
}

export type ReponsePlanIa = { ok: true; plan: PlanPropose } | { ok: false; raison: 'non_configuree' | 'quota_epuise' | 'indisponible' };

export async function demanderPlanIa(saisie: SaisieObjectif, langue: Langue): Promise<ReponsePlanIa> {
  const r = await appeler<{ ok: boolean; plan?: unknown; raison?: 'non_configuree' | 'quota_epuise' | 'indisponible' }>({
    mode: 'plan',
    objectif: saisie,
    langue,
  });
  if (!r.ok) return { ok: false, raison: r.raison ?? 'indisponible' };
  // On ne fait pas confiance aveuglément à la réponse : un plan mal formé est refusé.
  const plan = schemaPlanPropose.safeParse(r.plan);
  return plan.success ? { ok: true, plan: plan.data } : { ok: false, raison: 'indisponible' };
}

export async function chargerMessagesCoach(): Promise<MessageCoach[]> {
  const res = await supabase.from('messages_coach').select('*').order('cree_le', { ascending: true }).limit(50);
  return verifier(res) as MessageCoach[];
}

export async function effacerMessagesCoach(userId: string): Promise<void> {
  verifier(await supabase.from('messages_coach').delete().eq('user_id', userId));
}
