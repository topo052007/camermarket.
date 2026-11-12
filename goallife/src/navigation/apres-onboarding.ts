// Écran demandé à la fin de l'onboarding. C'est la redirection de app/_layout.tsx qui navigue,
// dès que le profil rechargé indique l'onboarding terminé (une seule décision, pas de course).
type Ecran = '/' | '/objectifs/nouveau';
let cible: Ecran | null = null;

export function choisirEcranApresOnboarding(chemin: Ecran): void {
  cible = chemin;
}

/** Renvoie l'écran demandé (une seule fois), ou null s'il n'y en a pas. */
export function prendreEcranApresOnboarding(): Ecran | null {
  const c = cible;
  cible = null;
  return c;
}
