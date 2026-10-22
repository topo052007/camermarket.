import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/data/supabase';
import { viderCacheLocal } from '@/offline/client-requetes';

type EtatSession = { session: Session | null; chargement: boolean };

const ContexteSession = createContext<EtatSession>({ session: null, chargement: true });

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatSession>({ session: null, chargement: true });

  useEffect(() => {
    let actif = true;
    supabase.auth
      .getSession()
      .then(({ data }) => actif && setEtat({ session: data.session, chargement: false }))
      .catch(() => actif && setEtat({ session: null, chargement: false }));
    const { data } = supabase.auth.onAuthStateChange((evenement, session) => {
      // Données d'un autre compte : on ne garde rien en cache après une déconnexion.
      if (evenement === 'SIGNED_OUT') void viderCacheLocal();
      setEtat({ session, chargement: false });
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
