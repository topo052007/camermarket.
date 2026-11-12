import type { DemandeJson, DemandeTexte, FournisseurIa } from './fournisseur.ts';

// Fournisseur SIMULÉ : uniquement pour les tests automatisés (IA_FOURNISSEUR=simule ET
// ENVIRONNEMENT=test). Les réponses sont marquées comme simulées et ne doivent jamais
// être présentées comme un vrai service d'IA.

export class FournisseurSimule implements FournisseurIa {
  readonly nom = 'simule';
  constructor(private reponseJson: unknown = null) {}

  repondre(demande: DemandeTexte): Promise<string | null> {
    const derniere = demande.messages[demande.messages.length - 1]?.contenu ?? '';
    return Promise.resolve(`[réponse simulée] ${derniere.slice(0, 50)}`);
  }

  repondreJson<T>(demande: DemandeJson<T>): Promise<T | null> {
    const r = demande.schema.safeParse(this.reponseJson);
    return Promise.resolve(r.success ? r.data : null);
  }
}
