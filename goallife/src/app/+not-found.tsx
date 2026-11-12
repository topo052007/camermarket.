import { router } from 'expo-router';
import { Ecran } from '@/components/Ecran';
import { EtatVide } from '@/components/Etats';
import { useI18n } from '@/providers/I18n';

export default function Introuvable() {
  const { t } = useI18n();
  return (
    <Ecran>
      <EtatVide titre={t('erreur.introuvable')} action={{ titre: t('commun.retour'), onPress: () => router.replace('/') }} />
    </Ecran>
  );
}
