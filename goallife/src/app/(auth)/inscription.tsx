import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Encart } from '@/components/Etats';
import { cleErreur } from '@/data/erreurs';
import { supabase } from '@/data/supabase';
import { schemaEmail, schemaMotDePasse } from '@/domain/validation';
import { traduireSiCle } from '@/i18n';
import { useI18n } from '@/providers/I18n';

export default function Inscription() {
  const { t, langue } = useI18n();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  async function creerCompte() {
    setErreur(null);
    const e = schemaEmail.safeParse(email);
    const m = schemaMotDePasse.safeParse(motDePasse);
    const nouvelles: Record<string, string> = {};
    if (!e.success) nouvelles.email = traduireSiCle(t, e.error.issues[0]?.message ?? '');
    if (!m.success) nouvelles.motDePasse = traduireSiCle(t, m.error.issues[0]?.message ?? '');
    if (motDePasse !== confirmation) nouvelles.confirmation = t('auth.mots_de_passe_differents');
    setErreurs(nouvelles);
    if (Object.keys(nouvelles).length > 0 || !e.success) return;

    setEnvoi(true);
    const { data, error } = await supabase.auth.signUp({
      email: e.data,
      password: motDePasse,
      options: {
        data: { langue },
        emailRedirectTo: Linking.createURL('/auth-retour'),
      },
    });
    setEnvoi(false);
    if (error) {
      setErreur(t(cleErreur(error)));
      return;
    }
    // Si la confirmation par e-mail est activée, il n'y a pas encore de session.
    if (!data.session) setSucces(true);
  }

  if (succes) {
    return (
      <Ecran>
        <Encart ton="succes">{t('auth.verifier_email')}</Encart>
        <Bouton titre={t('auth.se_connecter')} onPress={() => router.replace('/connexion')} />
      </Ecran>
    );
  }

  return (
    <Ecran>
      {erreur && <Encart ton="danger">{erreur}</Encart>}
      <Champ
        libelle={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        erreur={erreurs.email}
      />
      <Champ
        libelle={t('auth.mot_de_passe')}
        value={motDePasse}
        onChangeText={setMotDePasse}
        secureTextEntry
        autoComplete="new-password"
        aide={t('validation.mot_de_passe')}
        erreur={erreurs.motDePasse}
      />
      <Champ
        libelle={t('auth.confirmer_mot_de_passe')}
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        autoComplete="new-password"
        erreur={erreurs.confirmation}
      />
      <Encart>{t('auth.accepte_confidentialite')}</Encart>
      <Bouton titre={t('auth.lire_confidentialite')} variante="discret" onPress={() => router.push('/confidentialite')} />
      <Bouton titre={t('auth.creer_compte')} onPress={creerCompte} chargement={envoi} />
      <Bouton titre={t('auth.deja_un_compte')} variante="secondaire" onPress={() => router.back()} />
    </Ecran>
  );
}
