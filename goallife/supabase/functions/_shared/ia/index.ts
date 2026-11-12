import { FournisseurAnthropic } from './anthropic.ts';
import type { FournisseurIa } from './fournisseur.ts';
import { FournisseurSimule } from './simule.ts';

export type { FournisseurIa } from './fournisseur.ts';

/**
 * Fournisseur configuré, ou null si aucun : l'application affiche alors honnêtement
 * que le coach IA n'est pas configuré et continue de fonctionner avec les règles simples.
 */
export function choisirFournisseur(env: (nom: string) => string | undefined = (n) => Deno.env.get(n)): FournisseurIa | null {
  const nom = env('IA_FOURNISSEUR') ?? 'anthropic';
  if (nom === 'simule') {
    // Jamais en production.
    return env('ENVIRONNEMENT') === 'test' ? new FournisseurSimule() : null;
  }
  if (nom === 'anthropic') {
    const cle = env('ANTHROPIC_API_KEY');
    return cle ? new FournisseurAnthropic(cle) : null;
  }
  return null;
}
