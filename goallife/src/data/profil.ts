import type { Abonnement, PreferencesNotifications, Profil } from '@/domain/types';
import { verifier } from './erreurs';
import { supabase } from './supabase';

export type ProfilComplet = Profil & { partage_objectifs_ia: boolean };

export async function chargerProfil(): Promise<ProfilComplet> {
  return verifier(await supabase.from('profils').select('*').single()) as ProfilComplet;
}

export type MajProfil = Partial<
  Pick<ProfilComplet, 'prenom' | 'langue' | 'fuseau_horaire' | 'devise' | 'minutes_par_jour' | 'domaines' | 'module_spiritualite' | 'partage_objectifs_ia' | 'onboarding_termine_le'>
>;

export async function majProfil(id: string, champs: MajProfil): Promise<void> {
  verifier(await supabase.from('profils').update(champs).eq('id', id).select('id').single());
}

export async function chargerPrefsNotifications(): Promise<PreferencesNotifications> {
  return verifier(await supabase.from('preferences_notifications').select('*').single()) as PreferencesNotifications;
}

export async function majPrefsNotifications(userId: string, champs: Partial<Omit<PreferencesNotifications, 'user_id'>>): Promise<void> {
  verifier(await supabase.from('preferences_notifications').update(champs).eq('user_id', userId).select('user_id').single());
}

export type AbonnementEtUsage = Abonnement & { requetes_ia_mois: number };

export async function chargerAbonnement(): Promise<AbonnementEtUsage> {
  const abonnement = verifier(await supabase.from('abonnements').select('*').single()) as Abonnement;
  const debutMois = new Date();
  const mois = `${debutMois.getUTCFullYear()}-${String(debutMois.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const usage = verifier(await supabase.from('usage_ia').select('requetes').eq('mois', mois).maybeSingle()) as { requetes: number } | null;
  return { ...abonnement, requetes_ia_mois: usage?.requetes ?? 0 };
}
