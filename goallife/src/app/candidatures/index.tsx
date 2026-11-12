import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Carte } from '@/components/Carte';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart, EtatErreur, EtatVide } from '@/components/Etats';
import { ChoixUnique } from '@/components/Puces';
import { Texte } from '@/components/Texte';
import { ecartJours } from '@/domain/dates';
import { STATUTS_CANDIDATURE, type StatutCandidature } from '@/domain/types';
import { useCandidatures, useObjectif } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';

/** Suivi des candidatures (privé). Avec ?objectif=…, n'affiche que celles de cet objectif. */
export default function Candidatures() {
  const { t, date, aujourdhui } = useI18n();
  const { objectif: objectifId } = useLocalSearchParams<{ objectif?: string }>();
  const candidatures = useCandidatures();
  const objectif = useObjectif(objectifId ?? '');
  const [filtre, setFiltre] = useState<StatutCandidature | 'tout'>('tout');
  const jour = aujourdhui();

  if (candidatures.isLoading) return <Chargement />;
  if (candidatures.isError && !candidatures.data) return <EtatErreur erreur={candidatures.error} onReessayer={() => void candidatures.refetch()} />;

  const liste = (candidatures.data ?? [])
    .filter((c) => !objectifId || c.objectif_id === objectifId)
    .filter((c) => filtre === 'tout' || c.statut === filtre);
  const nouvelle = objectifId ? `/candidatures/nouvelle?objectif=${objectifId}` : '/candidatures/nouvelle';

  return (
    <Ecran bas={<Bouton titre={t('cand.nouvelle')} onPress={() => router.push(nouvelle)} />}>
      <Encart>{t('cand.privee')}</Encart>
      {objectif.data?.unite === 'candidatures' && <Texte couleur={couleurs.texteSecondaire}>{t('cand.compte', { titre: objectif.data.titre })}</Texte>}
      <ChoixUnique
        options={[
          { valeur: 'tout' as StatutCandidature | 'tout', libelle: t('cand.filtre_tout') },
          ...STATUTS_CANDIDATURE.map((s) => ({ valeur: s as StatutCandidature | 'tout', libelle: t(`cand.statut.${s}`) })),
        ]}
        valeur={filtre}
        onChange={setFiltre}
      />
      {liste.length === 0 ? (
        <EtatVide titre={t('cand.aucune')} />
      ) : (
        liste.map((c) => {
          const aRelancer = c.relance_le != null && ecartJours(c.relance_le, jour) >= 0 && (c.statut === 'envoyee' || c.statut === 'entretien');
          return (
            <Carte key={c.id} onPress={() => router.push(`/candidatures/${c.id}`)}>
              <View style={{ flexDirection: 'row', gap: espace.s }}>
                <Texte variante="titre3" style={{ flex: 1 }}>
                  {c.entreprise}
                </Texte>
                <Texte variante="libelle" couleur={c.statut === 'offre' ? couleurs.succes : c.statut === 'refusee' ? couleurs.texteSecondaire : couleurs.primaire}>
                  {t(`cand.statut.${c.statut}`)}
                </Texte>
              </View>
              {c.poste && <Texte>{c.poste}</Texte>}
              {c.envoyee_le && (
                <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                  {t('cand.envoyee_le', { date: date(c.envoyee_le) })}
                </Texte>
              )}
              {aRelancer && (
                <Texte variante="petit" couleur={couleurs.avertissement}>
                  {t('cand.a_relancer')}
                </Texte>
              )}
            </Carte>
          );
        })
      )}
    </Ecran>
  );
}
