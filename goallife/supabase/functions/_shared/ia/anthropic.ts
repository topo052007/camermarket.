import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { DemandeJson, DemandeTexte, FournisseurIa } from './fournisseur.ts';

// Fournisseur Claude (Anthropic), via le SDK officiel.
// - Modèle : IA_MODELE (par défaut claude-opus-5-5). Le propriétaire peut choisir un modèle
//   moins cher (ex. claude-haiku-5-5) selon son budget : c'est un réglage, pas du code.
// - Effort : IA_EFFORT (par défaut « low » : réponses courtes de coaching, coût réduit).
// - Refus de sécurité : repli automatique côté serveur (fallbacks: "default"), puis
//   vérification de stop_reason avant de lire la réponse.

const MODELE_PAR_DEFAUT = 'claude-opus-5-5';
const BETA_REPLI = 'server-side-fallback-2026-07-01';
type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export class FournisseurAnthropic implements FournisseurIa {
  readonly nom = 'anthropic';
  private client: Anthropic;
  private modele: string;
  private effort: Effort;

  constructor(cleApi: string) {
    this.client = new Anthropic({ apiKey: cleApi, timeout: 60_000, maxRetries: 1 });
    this.modele = Deno.env.get('IA_MODELE') || MODELE_PAR_DEFAUT;
    const effort = Deno.env.get('IA_EFFORT') as Effort | undefined;
    this.effort = effort && ['low', 'medium', 'high', 'xhigh', 'max'].includes(effort) ? effort : 'low';
  }

  private messages(demande: DemandeTexte): Anthropic.Beta.BetaMessageParam[] {
    return demande.messages.map((m) => ({ role: m.role, content: m.contenu }));
  }

  async repondre(demande: DemandeTexte): Promise<string | null> {
    const reponse = await this.client.beta.messages.create({
      model: this.modele,
      max_tokens: demande.maxTokens,
      system: demande.systeme,
      messages: this.messages(demande),
      output_config: { effort: this.effort },
      betas: [BETA_REPLI],
      fallbacks: 'default',
    });
    if (reponse.stop_reason === 'refusal') return null;
    const texte = reponse.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return texte || null;
  }

  async repondreJson<T>(demande: DemandeJson<T>): Promise<T | null> {
    const reponse = await this.client.beta.messages.parse({
      model: this.modele,
      max_tokens: demande.maxTokens,
      system: demande.systeme,
      messages: this.messages(demande),
      output_config: { effort: this.effort, format: zodOutputFormat(demande.schema) },
      betas: [BETA_REPLI],
      fallbacks: 'default',
    });
    if (reponse.stop_reason === 'refusal') return null;
    return (reponse.parsed_output as T | null) ?? null;
  }
}
