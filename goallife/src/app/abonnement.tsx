import { Alert } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Carte } from '@/components/Carte';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart } from '@/components/Etats';
import { Texte } from '@/components/Texte';
import { LIMITES } from '@/domain/offres';
import type { Offre } from '@/domain/types';
import { useAbonnement } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs } from '@/theme';

// Les droits Premium sont lus dans la table `abonnements`, que seul le serveur peut modifier
// (webhook des boutiques : supabase/functions/webhook-abonnement). Rien n'est décidé sur le téléphone.

export default function Abonnement() {
  const { t } = useI18n();
  const { data, isLoading, offre } = useAbonnement();
  if (isLoading) return <Chargement />;

  const avantages = (o: Offre) => [
    t('abo.essentiel'),
    t('abo.objectifs_max', { nombre: LIMITES[o].maxObjectifsActifs }),
    t('abo.questions_ia', { nombre: LIMITES[o].quotaIaMensuel }),
    LIMITES[o].statistiquesDetaillees ? t('abo.stats_detaillees') : t('abo.stats_base'),
  ];

  return (
    <Ecran>
      <Carte>
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          {t('abo.offre_actuelle')}
        </Texte>
        <Texte variante="titre2">{offre === 'premium' ? t('abo.premium') : t('abo.gratuit')}</Texte>
        {offre === 'premium' && data?.expire_le && <Texte>{t('abo.expire_le', { date: new Date(data.expire_le).toLocaleDateString() })}</Texte>}
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          {t('abo.verifie_serveur')}
        </Texte>
      </Carte>
      {(['gratuit', 'premium'] as const).map((o) => (
        <Carte key={o} style={o === 'premium' ? { borderColor: couleurs.accent, borderWidth: 2 } : undefined}>
          <Texte variante="titre3">{o === 'premium' ? t('abo.premium') : t('abo.gratuit')}</Texte>
          {avantages(o).map((a) => (
            <Texte key={a}>• {a}</Texte>
          ))}
          {o === 'premium' && (
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              {t('abo.prix_indicatif')}
            </Texte>
          )}
        </Carte>
      ))}
      {offre !== 'premium' && (
        <>
          <Bouton titre={t('abo.passer_premium')} onPress={() => Alert.alert(t('abo.premium'), t('abo.bientot'))} />
          <Encart>{t('abo.bientot')}</Encart>
        </>
      )}
    </Ecran>
  );
}
