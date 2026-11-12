import { router } from 'expo-router';
import { View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Carte } from '@/components/Carte';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart, EtatErreur, EtatVide } from '@/components/Etats';
import { Section } from '@/components/Lignes';
import { ResumeProgression } from '@/components/ResumeProgression';
import { Texte } from '@/components/Texte';
import type { ObjectifResume } from '@/data/objectifs';
import { ajouterJours } from '@/domain/dates';
import { LIMITES, peutCreerObjectif } from '@/domain/offres';
import { useAbonnement, useObjectifs } from '@/hooks/donnees';
import { resumeObjectif } from '@/hooks/progression';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';

function CarteObjectif({ objectif, jour }: { objectif: ObjectifResume; jour: string }) {
  const { t, date } = useI18n();
  const { progression, retard } = resumeObjectif(objectif, jour);
  return (
    <Carte onPress={() => router.push(`/objectifs/${objectif.id}`)}>
      <View style={{ flexDirection: 'row', gap: espace.s, alignItems: 'center' }}>
        <Texte variante="titre3" style={{ flex: 1 }}>
          {objectif.titre}
        </Texte>
        {objectif.priorite === 1 && (
          <Texte variante="petit" couleur={couleurs.accent}>
            ★ {t('priorite.1')}
          </Texte>
        )}
      </View>
      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
        {t(`cat.${objectif.categorie}`)} · {objectif.date_echeance ? t('det.echeance', { date: date(objectif.date_echeance) }) : t('det.sans_echeance')}
      </Texte>
      <ResumeProgression progression={progression} unite={objectif.unite} />
      {retard.enRetard && objectif.statut === 'actif' && (
        <Texte variante="petit" couleur={couleurs.avertissement}>
          {t('det.retard_titre')}
        </Texte>
      )}
    </Carte>
  );
}

export default function ListeObjectifs() {
  const { t, aujourdhui } = useI18n();
  const jour = aujourdhui();
  const objectifs = useObjectifs(ajouterJours(jour, -60));
  const { offre } = useAbonnement();

  if (objectifs.isLoading) return <Chargement />;
  if (objectifs.isError && !objectifs.data) return <EtatErreur erreur={objectifs.error} onReessayer={() => void objectifs.refetch()} />;

  const liste = objectifs.data ?? [];
  const actifs = liste.filter((o) => o.statut === 'actif');
  const pause = liste.filter((o) => o.statut === 'en_pause');
  const finis = liste.filter((o) => o.statut === 'termine' || o.statut === 'abandonne');
  const peutCreer = peutCreerObjectif(offre, actifs.length);

  return (
    <Ecran
      bas={
        <>
          {!peutCreer && (
            <Encart ton="avertissement">
              <Texte couleur={couleurs.avertissement}>{t('obj.limite_atteinte', { max: LIMITES[offre].maxObjectifsActifs })}</Texte>
              <Bouton titre={t('obj.voir_offres')} variante="discret" compact onPress={() => router.push('/abonnement')} />
            </Encart>
          )}
          <Bouton titre={t('obj.nouveau')} onPress={() => router.push('/objectifs/nouveau')} desactive={!peutCreer} />
        </>
      }
    >
      {liste.length === 0 && <EtatVide titre={t('obj.aucun')} texte={t('accueil.vide_texte')} />}
      {actifs.length > 0 && (
        <Section titre={`${t('obj.actifs')} (${actifs.length})`}>
          {actifs.map((o) => (
            <CarteObjectif key={o.id} objectif={o} jour={jour} />
          ))}
        </Section>
      )}
      {pause.length > 0 && (
        <Section titre={t('obj.en_pause')}>
          {pause.map((o) => (
            <CarteObjectif key={o.id} objectif={o} jour={jour} />
          ))}
        </Section>
      )}
      {finis.length > 0 && (
        <Section titre={t('obj.termines')}>
          {finis.map((o) => (
            <CarteObjectif key={o.id} objectif={o} jour={jour} />
          ))}
        </Section>
      )}
    </Ecran>
  );
}
