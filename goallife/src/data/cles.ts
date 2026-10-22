// Clés de cache TanStack Query, centralisées pour invalider au bon endroit.
export const cles = {
  profil: ['profil'] as const,
  prefsNotifications: ['prefs-notifications'] as const,
  abonnement: ['abonnement'] as const,
  objectifs: ['objectifs'] as const,
  objectif: (id: string) => ['objectif', id] as const,
  actions: ['actions'] as const,
  actionsPeriode: (debut: string, fin: string) => ['actions', debut, fin] as const,
  action: (id: string) => ['action', id] as const,
  historique: ['historique'] as const,
  coachStatut: ['coach', 'statut'] as const,
  messagesCoach: ['coach', 'messages'] as const,
};
