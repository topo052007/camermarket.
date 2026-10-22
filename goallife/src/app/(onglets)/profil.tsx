import { router } from 'expo-router';
import { Alert } from 'react-native';
import { Carte } from '@/components/Carte';
import { Ecran } from '@/components/Ecran';
import { LigneLien } from '@/components/Lignes';
import { Texte } from '@/components/Texte';
import { supabase } from '@/data/supabase';
import { useAbonnement, useProfil } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { useSession } from '@/providers/Session';
import { couleurs } from '@/theme';

export default function Profil() {
  const { t } = useI18n();
  const { session } = useSession();
  const { data: profil } = useProfil();
  const { offre } = useAbonnement();

  function deconnecter() {
    Alert.alert(t('profil.deconnexion'), t('profil.deconnexion_confirmer'), [
      { text: t('commun.annuler'), style: 'cancel' },
      { text: t('profil.deconnexion'), style: 'destructive', onPress: () => void supabase.auth.signOut() },
    ]);
  }

  return (
    <Ecran>
      <Carte>
        <Texte variante="titre2">{profil?.prenom || '—'}</Texte>
        <Texte couleur={couleurs.texteSecondaire}>{session?.user.email}</Texte>
        <Texte variante="libelle" couleur={couleurs.primaire}>
          {t('profil.offre', { offre: offre === 'premium' ? t('abo.premium') : t('abo.gratuit') })}
        </Texte>
      </Carte>
      <Carte>
        <LigneLien icone="settings-outline" titre={t('profil.parametres')} onPress={() => router.push('/parametres')} />
        <LigneLien icone="notifications-outline" titre={t('profil.notifications')} onPress={() => router.push('/notifications')} />
        <LigneLien icone="star-outline" titre={t('profil.abonnement')} onPress={() => router.push('/abonnement')} />
        <LigneLien icone="shield-checkmark-outline" titre={t('profil.confidentialite')} onPress={() => router.push('/confidentialite')} />
        <LigneLien icone="briefcase-outline" titre={t('cand.titre')} onPress={() => router.push('/candidatures')} />
        <LigneLien icone="time-outline" titre={t('hist.titre')} onPress={() => router.push('/historique')} />
        <LigneLien icone="help-circle-outline" titre={t('profil.aide')} onPress={() => router.push('/aide')} />
        <LigneLien icone="log-out-outline" titre={t('profil.deconnexion')} onPress={deconnecter} />
      </Carte>
    </Ecran>
  );
}
