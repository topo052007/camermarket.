import { router } from 'expo-router';
import { useState } from 'react';
import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Encart } from '@/components/Etats';
import { cleErreur } from '@/data/erreurs';
import { supabase } from '@/data/supabase';
import { schemaMotDePasse } from '@/domain/validation';
import { traduireSiCle } from '@/i18n';
import { useI18n } from '@/providers/I18n';
import { useSession } from '@/providers/Session';

export default function Reinitialiser() {
  const { t } = useI18n();
  const { session } = useSession();
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  if (!session) {
    return (
      <Ecran>
        <Encart ton="danger">{t('auth.lien_invalide')}</Encart>
        <Bouton titre={t('commun.retour')} onPress={() => router.replace('/')} />
      </Ecran>
    );
  }

  async function enregistrer() {
    const m = schemaMotDePasse.safeParse(motDePasse);
    if (!m.success) return setErreur(traduireSiCle(t, m.error.issues[0]?.message ?? ''));
    if (motDePasse !== confirmation) return setErreur(t('auth.mots_de_passe_differents'));
    setErreur(null);
    setEnvoi(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnvoi(false);
    if (error) setErreur(t(cleErreur(error)));
    else setFait(true);
  }

  return (
    <Ecran>
      {erreur && <Encart ton="danger">{erreur}</Encart>}
      {fait ? (
        <>
          <Encart ton="succes">{t('auth.mot_de_passe_change')}</Encart>
          <Bouton titre={t('commun.continuer')} onPress={() => router.replace('/')} />
        </>
      ) : (
        <>
          <Champ libelle={t('auth.mot_de_passe')} value={motDePasse} onChangeText={setMotDePasse} secureTextEntry autoComplete="new-password" />
          <Champ libelle={t('auth.confirmer_mot_de_passe')} value={confirmation} onChangeText={setConfirmation} secureTextEntry />
          <Bouton titre={t('commun.enregistrer')} onPress={enregistrer} chargement={envoi} />
        </>
      )}
    </Ecran>
  );
}
