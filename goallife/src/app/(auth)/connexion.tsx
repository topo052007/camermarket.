import { Link, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Encart } from '@/components/Etats';
import { Texte } from '@/components/Texte';
import { NOM_APP } from '@/config/env';
import { cleErreur } from '@/data/erreurs';
import { supabase } from '@/data/supabase';
import { schemaEmail } from '@/domain/validation';
import { traduireSiCle } from '@/i18n';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';

export default function Connexion() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreurEmail, setErreurEmail] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function seConnecter() {
    setErreur(null);
    const e = schemaEmail.safeParse(email);
    if (!e.success) {
      setErreurEmail(traduireSiCle(t, e.error.issues[0]?.message ?? ''));
      return;
    }
    setErreurEmail(null);
    setEnvoi(true);
    const { error } = await supabase.auth.signInWithPassword({ email: e.data, password: motDePasse });
    setEnvoi(false);
    if (error) setErreur(t(cleErreur(error)));
    // En cas de succès, la navigation suit automatiquement la session (voir app/_layout.tsx).
  }

  return (
    <Ecran>
      <View style={{ gap: espace.s, marginTop: espace.xxl, marginBottom: espace.l }}>
        <Texte variante="titre1" couleur={couleurs.primaire}>
          {NOM_APP}
        </Texte>
        <Texte couleur={couleurs.texteSecondaire}>{t('app.slogan')}</Texte>
      </View>
      <Texte variante="titre2" accessibilityRole="header">
        {t('auth.connexion_titre')}
      </Texte>
      {erreur && <Encart ton="danger">{erreur}</Encart>}
      <View>
        <Champ
          libelle={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          erreur={erreurEmail}
        />
        <Champ
          libelle={t('auth.mot_de_passe')}
          value={motDePasse}
          onChangeText={setMotDePasse}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={seConnecter}
        />
      </View>
      <Bouton titre={t('auth.se_connecter')} onPress={seConnecter} chargement={envoi} desactive={!email || !motDePasse} />
      <Bouton titre={t('auth.oubli')} variante="discret" onPress={() => router.push('/mot-de-passe-oublie')} />
      <Bouton titre={t('auth.pas_de_compte')} variante="secondaire" onPress={() => router.push('/inscription')} />
      <Link href="/aide" style={{ textAlign: 'center', color: couleurs.texteSecondaire }}>
        {t('aide.titre')}
      </Link>
    </Ecran>
  );
}
