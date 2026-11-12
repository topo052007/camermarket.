import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarreProgression } from '@/components/BarreProgression';
import { Bouton } from '@/components/Bouton';
import { Carte } from '@/components/Carte';
import { BandeauConnexion } from '@/components/Ecran';
import { Chargement, Encart, EtatErreur, EtatVide } from '@/components/Etats';
import { LigneAction } from '@/components/LigneAction';
import { Section } from '@/components/Lignes';
import { ResumeProgression } from '@/components/ResumeProgression';
import { Texte } from '@/components/Texte';
import { conseilsSansIa } from '@/domain/coach-regles';
import { ajouterJours, ecartJours } from '@/domain/dates';
import { actionsComptees } from '@/domain/progression';
import { useActionsPeriode, useObjectifs, useProfil } from '@/hooks/donnees';
import { resumeObjectif } from '@/hooks/progression';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';

export default function Accueil() {
  const { t, aujourdhui, date } = useI18n();
  const jour = aujourdhui();
  const { data: profil } = useProfil();
  const objectifs = useObjectifs(ajouterJours(jour, -60));
  const actions = useActionsPeriode(ajouterJours(jour, -6), ajouterJours(jour, 7));

  const donnees = useMemo(() => {
    const liste = actions.data ?? [];
    const visibles = liste.filter((a) => a.statut !== 'reportee' && a.objectifs?.statut !== 'en_pause');
    const duJour = visibles.filter((a) => a.date_prevue === jour && a.statut !== 'annulee');
    const faitesDuJour = duJour.filter((a) => a.statut === 'terminee').length;
    const semaine = actionsComptees(visibles, jour);
    const tauxSemaine = semaine.length > 0 ? Math.round((semaine.filter((a) => a.statut === 'terminee').length / semaine.length) * 100) : null;
    const prochaine = visibles.find((a) => a.statut === 'a_faire' && ecartJours(jour, a.date_prevue) >= 0);
    const actifs = (objectifs.data ?? []).filter((o) => o.statut === 'actif');
    const resumes = actifs.map((o) => ({ objectif: o, ...resumeObjectif(o, jour) }));
    const conseil = conseilsSansIa(
      resumes.map((r) => ({ titre: r.objectif.titre, progression: r.progression, retard: r.retard, tempsEcoule: r.tempsEcoule })),
      duJour.length - faitesDuJour,
      t,
    )[0];
    return { duJour, faitesDuJour, tauxSemaine, prochaine, resumes, conseil };
  }, [actions.data, objectifs.data, jour, t]);

  if (objectifs.isLoading || actions.isLoading) return <Chargement />;
  if (objectifs.isError && !objectifs.data) return <EtatErreur erreur={objectifs.error} onReessayer={() => void objectifs.refetch()} />;

  const rafraichir = () => {
    void objectifs.refetch();
    void actions.refetch();
  };
  const aucunObjectif = (objectifs.data ?? []).length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: couleurs.fond }} edges={['top', 'left', 'right']}>
      <BandeauConnexion />
      <ScrollView
        contentContainerStyle={styles.contenu}
        refreshControl={<RefreshControl refreshing={objectifs.isRefetching} onRefresh={rafraichir} tintColor={couleurs.primaire} />}
      >
        <View>
          <Texte variante="titre1" accessibilityRole="header">
            {profil?.prenom ? t('accueil.bonjour', { prenom: profil.prenom }) : t('accueil.bonjour_sans_nom')}
          </Texte>
          <Texte couleur={couleurs.texteSecondaire}>{date(jour, { weekday: 'long', day: 'numeric', month: 'long' })}</Texte>
        </View>

        {aucunObjectif ? (
          <Carte>
            <EtatVide
              titre={t('accueil.vide_titre')}
              texte={t('accueil.vide_texte')}
              action={{ titre: t('accueil.creer_premier'), onPress: () => router.push('/objectifs/nouveau') }}
            />
          </Carte>
        ) : (
          <>
            <Section
              titre={t('accueil.aujourdhui')}
              action={
                donnees.duJour.length > 0 ? (
                  <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                    {t('accueil.faites', { faites: donnees.faitesDuJour, total: donnees.duJour.length })}
                  </Texte>
                ) : undefined
              }
            >
              <Carte>
                {donnees.duJour.length === 0 ? (
                  <Texte couleur={couleurs.texteSecondaire}>{t('accueil.rien_aujourdhui')}</Texte>
                ) : (
                  <>
                    <BarreProgression pourcentage={(donnees.faitesDuJour / donnees.duJour.length) * 100} couleur={couleurs.succes} />
                    {donnees.duJour.map((a) => (
                      <LigneAction key={a.id} action={a} />
                    ))}
                    {donnees.faitesDuJour === donnees.duJour.length && <Encart ton="succes">{t('accueil.tout_fait')}</Encart>}
                  </>
                )}
              </Carte>
            </Section>

            {donnees.prochaine && donnees.prochaine.date_prevue !== jour && (
              <Section titre={t('accueil.prochain')}>
                <Carte onPress={() => router.push(`/actions/${donnees.prochaine!.id}`)}>
                  <Texte variante="libelle">{donnees.prochaine.titre}</Texte>
                  <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                    {date(donnees.prochaine.date_prevue)} · {donnees.prochaine.objectifs?.titre}
                  </Texte>
                </Carte>
              </Section>
            )}

            {donnees.conseil && (
              <Encart ton="info">
                <Texte variante="libelle" couleur={couleurs.primaireFonce}>
                  {t('accueil.conseil')}
                </Texte>
                <Texte couleur={couleurs.primaireFonce}>{donnees.conseil}</Texte>
              </Encart>
            )}

            <Section
              titre={t('accueil.objectifs_actifs')}
              action={<Bouton titre={t('accueil.nouvel_objectif')} variante="discret" compact onPress={() => router.push('/objectifs/nouveau')} />}
            >
              {donnees.tauxSemaine != null && (
                <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                  {t('prog.7_jours')} : {donnees.tauxSemaine} %
                </Texte>
              )}
              {donnees.resumes.map(({ objectif, progression, retard }) => (
                <Carte key={objectif.id} onPress={() => router.push(`/objectifs/${objectif.id}`)}>
                  <Texte variante="titre3">{objectif.titre}</Texte>
                  <ResumeProgression progression={progression} unite={objectif.unite} />
                  {retard.enRetard && (
                    <Texte variante="petit" couleur={couleurs.avertissement}>
                      {t('det.retard_titre')}
                    </Texte>
                  )}
                </Carte>
              ))}
            </Section>
          </>
        )}

        <View style={styles.raccourcis}>
          <View style={styles.raccourci}>
            <Bouton titre={t('accueil.planning')} variante="secondaire" compact onPress={() => router.push('/planning')} />
          </View>
          <View style={styles.raccourci}>
            <Bouton titre={t('accueil.calendrier')} variante="secondaire" compact onPress={() => router.push('/calendrier')} />
          </View>
          <View style={styles.raccourci}>
            <Bouton titre={t('accueil.historique')} variante="secondaire" compact onPress={() => router.push('/historique')} />
          </View>
          <View style={styles.raccourci}>
            <Bouton titre={t('accueil.statistiques')} variante="secondaire" compact onPress={() => router.push('/progression')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: espace.l, gap: espace.l, paddingBottom: espace.xxl },
  raccourcis: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
  raccourci: { flexGrow: 1, flexBasis: '45%' },
});
