import type { CleTraduction } from '@/i18n';

// Transforme une erreur (Supabase, réseau…) en message compréhensible, sans détail technique.

type ErreurBrute = { message?: string; code?: string; status?: number; name?: string } | null | undefined;

export class ErreurApp extends Error {
  constructor(public cle: CleTraduction) {
    super(cle);
  }
}

const MESSAGES_SERVEUR: Record<string, CleTraduction> = {
  limite_objectifs: 'erreur.limite_objectifs',
  action_deja_reportee: 'erreur.action_deja_reportee',
  action_deja_terminee: 'erreur.action_deja_terminee',
  date_report_invalide: 'erreur.date_report_invalide',
  action_introuvable: 'erreur.introuvable',
  objectif_introuvable: 'erreur.introuvable',
};

export function estErreurReseau(e: unknown): boolean {
  const m = String((e as ErreurBrute)?.message ?? e ?? '').toLowerCase();
  return m.includes('network request failed') || m.includes('failed to fetch') || m.includes('network') || m.includes('timeout');
}

export function cleErreur(e: unknown): CleTraduction {
  if (e instanceof ErreurApp) return e.cle;
  const err = e as ErreurBrute;
  const message = (err?.message ?? '').toLowerCase();
  for (const [code, cle] of Object.entries(MESSAGES_SERVEUR)) {
    if (message.includes(code)) return cle;
  }
  if (estErreurReseau(e)) return 'commun.erreur_reseau';
  if (message.includes('invalid login credentials')) return 'auth.identifiants_invalides';
  if (message.includes('email not confirmed')) return 'auth.email_non_confirme';
  if (message.includes('already registered') || message.includes('already been registered')) return 'auth.email_deja_utilise';
  if (err?.status === 429 || message.includes('rate limit')) return 'auth.trop_de_tentatives';
  if (message.includes('jwt expired') || message.includes('refresh token') || err?.code === 'PGRST301') return 'commun.session_expiree';
  if (err?.code === '42501' || message.includes('permission denied') || message.includes('row-level security')) return 'commun.permission_refusee';
  return 'commun.erreur_generique';
}

/** Lève l'erreur Supabase si présente, sinon renvoie les données (non nulles). */
export function verifier<T>(resultat: { data: T | null; error: unknown }): T {
  if (resultat.error) throw resultat.error;
  return resultat.data as T;
}
