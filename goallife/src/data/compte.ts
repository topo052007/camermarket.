import { verifier } from './erreurs';
import { supabase } from './supabase';

/** Supprime définitivement le compte (fonction serveur avec la clé service role). */
export async function supprimerCompte(): Promise<void> {
  const { error } = await supabase.functions.invoke('supprimer-compte', { body: { confirmation: true } });
  if (error) throw error;
}

/** Rassemble toutes les données de l'utilisateur (lisibles grâce à la RLS) dans un objet JSON. */
export async function exporterDonnees(): Promise<Record<string, unknown>> {
  const tables = [
    'profils',
    'preferences_notifications',
    'abonnements',
    'objectifs',
    'etapes',
    'recurrences',
    'actions',
    'historique_actions',
    'evenements_progression',
    'messages_coach',
    'usage_ia',
  ] as const;
  const resultats = await Promise.all(tables.map((table) => supabase.from(table).select('*')));
  const export_: Record<string, unknown> = { exporte_le: new Date().toISOString() };
  tables.forEach((table, i) => {
    export_[table] = verifier(resultats[i]!);
  });
  return export_;
}
