import type { Candidature, StatutCandidature } from '@/domain/types';
import { verifier } from './erreurs';
import { supabase } from './supabase';

export async function listerCandidatures(): Promise<Candidature[]> {
  return verifier(await supabase.from('candidatures').select('*').order('modifie_le', { ascending: false })) as Candidature[];
}

export async function chargerCandidature(id: string): Promise<Candidature | null> {
  return verifier(await supabase.from('candidatures').select('*').eq('id', id).maybeSingle()) as Candidature | null;
}

export type SaisieCandidature = {
  entreprise: string;
  poste: string | null;
  statut: StatutCandidature;
  objectif_id: string | null;
  envoyee_le: string | null;
  relance_le: string | null;
  lien: string | null;
  notes: string | null;
};

export async function enregistrerCandidature(id: string | null, saisie: SaisieCandidature): Promise<void> {
  if (id) verifier(await supabase.from('candidatures').update(saisie).eq('id', id).select('id').single());
  else verifier(await supabase.from('candidatures').insert(saisie).select('id').single());
}

export async function supprimerCandidature(id: string): Promise<void> {
  verifier(await supabase.from('candidatures').delete().eq('id', id));
}
