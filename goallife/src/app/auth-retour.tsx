import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Bouton } from '@/components/Bouton';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart } from '@/components/Etats';
import { supabase } from '@/data/supabase';
import { useI18n } from '@/providers/I18n';

/**
 * Lien reçu par e-mail (confirmation d'inscription ou mot de passe oublié).
 * Flux PKCE : on échange le code contre une session, puis on continue.
 */
export default function RetourAuthentification() {
  const { t } = useI18n();
  const { code, suite } = useLocalSearchParams<{ code?: string; suite?: string }>();
  const [echec, setEchec] = useState(false);
  const erreur = !code || echec;

  useEffect(() => {
    if (!code) return;
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setEchec(true);
      else if (suite === 'reinitialiser') router.replace('/reinitialiser');
      else router.replace('/');
    });
  }, [code, suite]);

  if (!erreur) return <Chargement />;
  return (
    <Ecran>
      <Encart ton="danger">{t('auth.lien_invalide')}</Encart>
      <Bouton titre={t('commun.retour')} onPress={() => router.replace('/')} />
    </Ecran>
  );
}
