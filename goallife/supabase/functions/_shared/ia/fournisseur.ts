import type { z } from 'zod';

// Interface commune : changer de fournisseur IA = écrire une nouvelle implémentation
// de cette interface, sans toucher au reste de l'application.

export type MessageIa = { role: 'user' | 'assistant'; contenu: string };

export type DemandeTexte = {
  systeme: string;
  messages: MessageIa[];
  maxTokens: number;
};

export type DemandeJson<T> = DemandeTexte & { schema: z.ZodType<T> };

export interface FournisseurIa {
  readonly nom: string;
  /** Réponse texte, ou null si le fournisseur a refusé de répondre. */
  repondre(demande: DemandeTexte): Promise<string | null>;
  /** Réponse JSON validée par le schéma, ou null si refus ou réponse invalide. */
  repondreJson<T>(demande: DemandeJson<T>): Promise<T | null>;
}
