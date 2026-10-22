import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Encart } from '@/components/Etats';
import { Texte } from '@/components/Texte';
import { cleErreur } from '@/data/erreurs';
import { supabase } from '@/data/supabase';
import { schemaEmail } from '@/domain/validation';
import { traduireSiCle } from '@/i18n';
import { useI18n } from '@/providers/I18n';

export default function MotDePasseOublie() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [erreurEmail, setErreurEmail] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  async function envoyer() {
    const e = schemaEmail.safeParse(email);
    if (!e.success) {
      setErreurEmail(traduireSiCle(t, e.error.issues[0]?.message ?? ''));
      return;
    }
    setErreurEmail(null);
    setErreur(null);
    setEnvoi(true);
    const { error } = await supabase.auth.resetPasswordForEmail(e.data, {
      redirectTo: Linking.createURL('/auth-retour', { queryParams: { suite: 'reinitialiser' } }),
    });
    setEnvoi(false);
    // Même message que le compte existe ou non (on ne révèle pas quelles adresses sont inscrites).
    if (error && cleErreur(error) !== 'commun.erreur_generique') setErreur(t(cleErreur(error)));
    else setEnvoye(true);
  }

  return (
    <Ecran>
      <Texte>{t('auth.oubli_texte')}</Texte>
      {erreur && <Encart ton="danger">{erreur}</Encart>}
      {envoye ? (
        <Encart ton="succes">{t('auth.lien_envoye')}</Encart>
      ) : (
        <>
          <Champ
            libelle={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            erreur={erreurEmail}
          />
          <Bouton titre={t('auth.envoyer_lien')} onPress={envoyer} chargement={envoi} desactive={!email} />
        </>
      )}
    </Ecran>
  );
}
