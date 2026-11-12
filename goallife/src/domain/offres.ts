import type { Abonnement, Offre } from './types';

// Règles freemium centralisées. Les MÊMES valeurs sont dans la table SQL `parametres_offres`,
// qui fait foi : le serveur refuse un objectif de trop ou une requête IA hors quota.
// Ici, elles servent seulement à afficher l'interface (bouton grisé, message clair).

export type Limites = {
  maxObjectifsActifs: number;
  quotaIaMensuel: number;
  statistiquesDetaillees: boolean;
};

export const LIMITES: Record<Offre, Limites> = {
  gratuit: { maxObjectifsActifs: 3, quotaIaMensuel: 5, statistiquesDetaillees: false },
  premium: { maxObjectifsActifs: 30, quotaIaMensuel: 150, statistiquesDetaillees: true },
};

/** Offre effective : un Premium expiré redevient gratuit. */
export function offreEffective(abonnement: Pick<Abonnement, 'offre' | 'statut' | 'expire_le'> | null, maintenant = new Date()): Offre {
  if (!abonnement || abonnement.offre !== 'premium') return 'gratuit';
  const expire = abonnement.expire_le ? new Date(abonnement.expire_le).getTime() <= maintenant.getTime() : false;
  if (abonnement.statut === 'actif' || abonnement.statut === 'essai') return expire ? 'gratuit' : 'premium';
  // Renouvellement arrêté : Premium jusqu'à la fin de la période déjà payée.
  if (abonnement.statut === 'annule' && abonnement.expire_le && !expire) return 'premium';
  return 'gratuit';
}

export function peutCreerObjectif(offre: Offre, objectifsActifs: number): boolean {
  return objectifsActifs < LIMITES[offre].maxObjectifsActifs;
}
