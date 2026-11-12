import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/data/supabase';
import { viderCacheLocal } from '@/offline/client-requetes';

/**
 * `connexions` augmente à chaque NOUVELLE connexion (passage de « pas de session » à « session ») :
 * la navigation s'en sert pour emmener l'utilisateur au bon écran juste après s'être connecté.
 * Un simple rafraîchissement de session (retour sur l'onglet, nouveau jeton) ne le change pas.
 */
type EtatSession = { session: Session | null; chargement: boolean; connexions: number };

const ContexteSession = createContext<EtatSession>({ session: null, chargement: true, connexions: 0 });

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatSession>({ session: null, chargement: true, connexions: 0 });

  useEffect(() => {
    let actif = true;
    supabase.auth
      .getSession()
      .then(({ data }) => actif && setEtat((e) => ({ ...e, session: data.session, chargement: false })))
      .catch(() => actif && setEtat((e) => ({ ...e, session: null, chargement: false })));
    const { data } = supabase.auth.onAuthStateChange((evenement, session) => {
      // Données d'un autre compte : on ne garde rien en cache après une déconnexion.
      if (evenement === 'SIGNED_OUT') void viderCacheLocal();
      setEtat((e) => ({
        session,
        chargement: false,
        connexions: !e.session && session && !e.chargement ? e.connexions + 1 : e.connexions,
      }));
    });
    return () => {
      actif = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <ContexteSession.Provider value={etat}>{children}</ContexteSession.Provider>;
}

export function useSession() {
  return useContext(ContexteSession);
}

export function useUtilisateurId(): string {
  const { session } = useSession();
  return session?.user.id ?? '';
}
