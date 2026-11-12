// Réponses HTTP communes. Les messages d'erreur ne contiennent jamais de détail technique.

export const ENTETES_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...ENTETES_CORS, 'Content-Type': 'application/json' },
  });
}

export function erreur(code: string, statut: number): Response {
  return json({ erreur: code }, statut);
}

/** Journalise une erreur sans données personnelles (seulement le type et un code). */
export function journaliser(contexte: string, e: unknown): void {
  const nom = e instanceof Error ? e.name : typeof e;
  console.error(`[${contexte}] ${nom}`);
}
