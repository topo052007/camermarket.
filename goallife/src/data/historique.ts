import type { Unite } from '@/domain/types';
import { verifier } from './erreurs';
import { supabase } from './supabase';

export type EntreeHistorique =
  | { genre: 'action'; id: string; date: string; titre: string; ancien: string | null; nouveau: string; details: Record<string, unknown> }
  | { genre: 'evenement'; id: string; date: string; titre: string; type: string; valeur: number | null; unite: Unite | null; note: string | null };

/** Fusionne les changements d'état des actions et les événements de progression, du plus récent au plus ancien. */
export async function chargerHistorique(limite = 100): Promise<EntreeHistorique[]> {
  const [actions, evenements] = await Promise.all([
    supabase
      .from('historique_actions')
      .select('id, ancien_statut, nouveau_statut, details, cree_le, actions(titre)')
      .order('cree_le', { ascending: false })
      .limit(limite),
    supabase
      .from('evenements_progression')
      .select('id, type, valeur, note, cree_le, objectifs(titre, unite)')
      .in('type', ['contribution', 'reprise'])
      .order('cree_le', { ascending: false })
      .limit(limite),
  ]);
  type LigneA = { id: number; ancien_statut: string | null; nouveau_statut: string; details: Record<string, unknown>; cree_le: string; actions: { titre: string } | null };
  type LigneE = { id: string; type: string; valeur: number | null; note: string | null; cree_le: string; objectifs: { titre: string; unite: Unite | null } | null };
  const a = (verifier(actions) as unknown as LigneA[]).map<EntreeHistorique>((l) => ({
    genre: 'action',
    id: `a${l.id}`,
    date: l.cree_le,
    titre: l.actions?.titre ?? '—',
    ancien: l.ancien_statut,
    nouveau: l.nouveau_statut,
    details: l.details,
  }));
  const e = (verifier(evenements) as unknown as LigneE[]).map<EntreeHistorique>((l) => ({
    genre: 'evenement',
    id: `e${l.id}`,
    date: l.cree_le,
    titre: l.objectifs?.titre ?? '—',
    type: l.type,
    valeur: l.valeur,
    unite: l.objectifs?.unite ?? null,
    note: l.note,
  }));
  return [...a, ...e].sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, limite);
}
