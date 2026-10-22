import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Carte } from '@/components/Carte';
import { ChampNombre } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart, EtatErreur, EtatVide } from '@/components/Etats';
import { LigneAction } from '@/components/LigneAction';
import { Section } from '@/components/Lignes';
import { ResumeProgression } from '@/components/ResumeProgression';
import { Texte } from '@/components/Texte';
import type { ActionAvecObjectif } from '@/data/actions';
import { cles } from '@/data/cles';
import { cleErreur } from '@/data/erreurs';
import { ajouterContribution, changerStatutObjectif, cocherEtape, supprimerContribution, supprimerObjectif } from '@/data/objectifs';
import { ajouterJours, ecartJours } from '@/domain/dates';
import { prevoirAtteinte } from '@/domain/prevision';
import { calculerProgression, effortRestantParJour } from '@/domain/progression';
import { ResumePrevision } from '@/components/objectif/Prevision';
import { analyserRetard } from '@/domain/reprise';
import type { StatutObjectif } from '@/domain/types';
import { useObjectif } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace, TACTILE_MIN } from '@/theme';

export default function DetailObjectif() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, aujourdhui, date, quantite } = useI18n();
  const jour = aujourdhui();
  const client = useQueryClient();
  const requete = useObjectif(id);
  const o = requete.data;
  const [contribution, setContribution] = useState<number | null>(null);
  const [cleChamp, setCleChamp] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const calculs = useMemo(() => {
    if (!o) return null;
    const progression = calculerProgression(o, { actions: o.actions, etapes: o.etapes, evenements: o.evenements_progression }, jour);
    const retard = analyserRetard(o.actions, jour, Boolean(o.date_echeance));
    const effort = progression.mode === 'quantite' ? effortRestantParJour(progression.reste, jour, o.date_echeance) : null;
    const avecObjectif = (a: (typeof o.actions)[number]): ActionAvecObjectif => ({
      ...a,
      objectifs: { titre: o.titre, categorie: o.categorie, unite: o.unite, type: o.type, statut: o.statut },
    });
    const visibles = o.actions.filter((a) => a.statut !== 'reportee');
    const aVenir = visibles
      .filter((a) => ecartJours(jour, a.date_prevue) >= 0 && ecartJours(jour, a.date_prevue) <= 7 && a.statut !== 'annulee')
      .map(avecObjectif);
    const recentes = visibles
      .filter((a) => ecartJours(a.date_prevue, jour) > 0 && ecartJours(a.date_prevue, jour) <= 7)
      .reverse()
      .map(avecObjectif);
    return { progression, retard, effort, aVenir, recentes };
  }, [o, jour]);

  if (requete.isLoading) return <Chargement />;
  if (requete.isError && !o) return <EtatErreur erreur={requete.error} onReessayer={() => void requete.refetch()} />;
  if (!o || !calculs) {
    return (
      <Ecran>
        <EtatVide titre={t('det.introuvable')} action={{ titre: t('commun.retour'), onPress: () => router.back() }} />
      </Ecran>
    );
  }

  const rafraichir = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: cles.objectif(o.id) }),
      client.invalidateQueries({ queryKey: cles.objectifs }),
      client.invalidateQueries({ queryKey: cles.actions }),
    ]);
  };

  async function executer(op: () => Promise<void>) {
    setErreur(null);
    setOccupe(true);
    try {
      await op();
      await rafraichir();
    } catch (e) {
      setErreur(t(cleErreur(e)));
    } finally {
      setOccupe(false);
    }
  }

  const objectifId = o.id;
  const changerStatut = (statut: StatutObjectif) => executer(() => changerStatutObjectif(objectifId, statut));

  function supprimer() {
    Alert.alert(t('det.supprimer'), t('det.supprimer_confirmer'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
        style: 'destructive',
        onPress: () =>
          void executer(async () => {
            await supprimerObjectif(objectifId);
            router.back();
          }),
      },
    ]);
  }

  const { progression, retard, effort } = calculs;
  const contributionsManuelles = o.evenements_progression.filter((e) => e.type === 'contribution');

  return (
    <Ecran>
      <Stack.Screen options={{ title: o.titre }} />

      <View style={{ gap: espace.xs }}>
        <Texte variante="titre2">{o.titre}</Texte>
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          {t(`cat.${o.categorie}`)} · {t(`statut_obj.${o.statut}`)} ·{' '}
          {o.date_echeance ? t('det.echeance', { date: date(o.date_echeance) }) : t('det.sans_echeance')}
        </Texte>
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          {o.source_plan === 'ia' ? t('det.plan_ia') : t('det.plan_regles')}
        </Texte>
        {o.description && <Texte>{o.description}</Texte>}
      </View>

      {erreur && <Encart ton="danger">{erreur}</Encart>}

      {retard.enRetard && o.statut === 'actif' && (
        <Encart ton="avertissement">
          <Texte variante="libelle" couleur={couleurs.avertissement}>
            {t('det.retard_titre')}
          </Texte>
          <Texte couleur={couleurs.avertissement}>{t('det.retard_texte')}</Texte>
          <Bouton titre={t('det.adapter')} onPress={() => router.push(`/objectifs/${o.id}/reprise`)} compact />
        </Encart>
      )}

      <Section titre={t('det.progression')}>
        <Carte>
          <ResumeProgression progression={progression} unite={o.unite} />
          {progression.mode === 'regularite' && progression.pourcentage != null && (
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              {t('det.regularite_note')}
            </Texte>
          )}
          {progression.mode === 'quantite' && progression.reste > 0 && (
            <Texte variante="petit">{t('det.reste', { reste: quantite(progression.reste, o.unite) })}</Texte>
          )}
          {effort && <Texte variante="petit">{t('det.effort_restant', { quantite: quantite(effort.parJour, o.unite), nombre: effort.joursRestants })}</Texte>}
          {o.type === 'quantitatif' && o.valeur_cible != null && o.statut === 'actif' && (
            <ResumePrevision
              prevision={prevoirAtteinte({ ...o, valeur_cible: o.valeur_cible }, o.evenements_progression, jour)}
              unite={o.unite}
            />
          )}
          {progression.mode === 'quantite' && progression.reste === 0 && o.statut === 'actif' && (
            <Encart ton="succes">
              <Texte couleur={couleurs.succes}>{t('det.objectif_atteint')}</Texte>
              <Bouton titre={t('det.marquer_termine')} compact onPress={() => void changerStatut('termine')} />
            </Encart>
          )}
        </Carte>
      </Section>

      {(o.categorie === 'carriere' || o.unite === 'candidatures') && (
        <Bouton titre={t('cand.voir')} variante="secondaire" onPress={() => router.push(`/candidatures?objectif=${o.id}`)} />
      )}

      {o.type === 'quantitatif' && (
        <Section titre={t('det.contributions')}>
          <Carte>
            <ChampNombre key={cleChamp} libelle={t('det.contribution_quantite')} valeur={null} onValide={setContribution} />
            <Bouton
              titre={t('det.ajouter_contribution')}
              variante="secondaire"
              desactive={!contribution}
              chargement={occupe}
              onPress={() =>
                void executer(async () => {
                  await ajouterContribution(o.id, contribution!, jour, null);
                  setContribution(null);
                  setCleChamp((c) => c + 1);
                })
              }
            />
            {contributionsManuelles.slice(0, 10).map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: espace.s }}>
                <Texte style={{ flex: 1 }}>
                  +{quantite(e.valeur ?? 0, o.unite)} · {date(e.date_evenement)}
                </Texte>
                {e.action_id == null && e.candidature_id == null && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('commun.supprimer')}
                    onPress={() => void executer(() => supprimerContribution(e.id))}
                    style={{ width: TACTILE_MIN, height: TACTILE_MIN, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={couleurs.texteSecondaire} />
                  </Pressable>
                )}
              </View>
            ))}
          </Carte>
        </Section>
      )}

      {o.etapes.length > 0 && (
        <Section titre={t('det.etapes')}>
          <Carte>
            {o.etapes.map((e) => {
              const automatique = e.valeur_cible != null; // jalon chiffré : coché automatiquement
              return (
                <Pressable
                  key={e.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: Boolean(e.terminee_le), disabled: automatique }}
                  disabled={automatique || occupe}
                  onPress={() => void executer(() => cocherEtape(e.id, !e.terminee_le))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: espace.s, minHeight: TACTILE_MIN }}
                >
                  <Ionicons name={e.terminee_le ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={e.terminee_le ? couleurs.succes : couleurs.primaire} />
                  <View style={{ flex: 1 }}>
                    <Texte>{e.titre}</Texte>
                    {e.date_cible && (
                      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                        {date(e.date_cible)}
                      </Texte>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </Carte>
        </Section>
      )}

      <Section
        titre={t('det.actions_a_venir')}
        action={<Bouton titre={t('det.ajouter_action')} variante="discret" compact onPress={() => router.push(`/actions/nouvelle?objectif=${o.id}`)} />}
      >
        <Carte>
          {calculs.aVenir.length === 0 ? (
            <Texte couleur={couleurs.texteSecondaire}>{t('planning.aucune')}</Texte>
          ) : (
            calculs.aVenir.map((a) => (
              <View key={a.id}>
                <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                  {a.date_prevue === jour ? t('commun.aujourdhui') : date(a.date_prevue)}
                </Texte>
                <LigneAction action={a} afficherObjectif={false} />
              </View>
            ))
          )}
        </Carte>
      </Section>

      {calculs.recentes.length > 0 && (
        <Section titre={t('det.actions_passees')}>
          <Carte>
            {calculs.recentes.map((a) => (
              <View key={a.id}>
                <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                  {a.date_prevue === ajouterJours(jour, -1) ? t('commun.hier') : date(a.date_prevue)}
                </Texte>
                <LigneAction action={a} afficherObjectif={false} />
              </View>
            ))}
          </Carte>
        </Section>
      )}

      <View style={{ gap: espace.s }}>
        <Bouton titre={t('det.modifier')} variante="secondaire" onPress={() => router.push(`/objectifs/${o.id}/modifier`)} />
        {o.statut === 'actif' && <Bouton titre={t('det.mettre_en_pause')} variante="secondaire" onPress={() => void changerStatut('en_pause')} desactive={occupe} />}
        {o.statut !== 'actif' && <Bouton titre={t('det.reactiver')} variante="secondaire" onPress={() => void changerStatut('actif')} desactive={occupe} />}
        {o.statut === 'actif' && <Bouton titre={t('det.marquer_termine')} variante="secondaire" onPress={() => void changerStatut('termine')} desactive={occupe} />}
        {o.statut === 'actif' && <Bouton titre={t('det.abandonner')} variante="discret" onPress={() => void changerStatut('abandonne')} desactive={occupe} />}
        <Bouton titre={t('det.supprimer')} variante="danger" onPress={supprimer} desactive={occupe} />
      </View>
    </Ecran>
  );
}
