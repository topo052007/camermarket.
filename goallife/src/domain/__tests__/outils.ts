import { creerTraducteur } from '@/i18n';
import { formaterQuantite } from '../format';
import type { OutilsTexte } from '../plan';

export const t = creerTraducteur('fr');
export const outils: OutilsTexte = {
  t,
  quantite: (v, unite) => formaterQuantite(v, unite, 'XAF', 'fr', t),
};
