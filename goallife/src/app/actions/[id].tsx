import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Carte } from '@/components/Carte';
import { Champ, ChampNombre } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart, EtatVide } from '@/components/Etats';
import { Section } from '@/components/Lignes';
import { ChoixUnique } from '@/components/Puces';
import { Texte } from '@/components/Texte';
import { creerAction, modifierAction, supprimerAction, type ActionAvecObjectif, type LigneHistoriqueAction } from '@/data/actions';
import { cles } from '@/data/cles';
import { cleErreur } from '@/data/erreurs';
import { ajouterJours, ecartJours } from '@/domain/dates';
import type { StatutAction } from '@/domain/types';
import { useAction, useChangerStatutAction } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';

type Edition = { titre: string; decalage: number; quantite: number | null; minutes: number | null };

/** Choix de date simple (sans calendrier natif) : aujourd'hui + N jours. */
function choixDates(t: ReturnType<typeof useI18n>['t']) {
  return [
    { valeur: 0, libelle: t('commun.aujourdhui') },
    { valeur: 1, libelle: t('commun.demain') },
    { valeur: 2, libelle: t('act.dans_2_jours') },
    { valeur: 7, libelle: t('act.semaine_pro') },
  ];
}

function FormulaireAction({ objectifId, action }: { objectifId: string; action: ActionAvecObjectif | null }) {
  const { t, aujourdhui, date } = useI18n();
  const client = useQueryClient();
  const jour = aujourdhui();
  const decalageInitial = action ? ecartJours(jour, action.date_prevue) : 0;
  const [edition, setEdition] = useState<Edition>({
    titre: action?.titre ?? '',
    decalage: decalageInitial,
    quantite: action?.quantite_prevue ?? null,
    minutes: action?.minutes_prevues ?? null,
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const options = choixDates(t);
  if (!options.some((o) => o.valeur === edition.decalage)) {
    options.unshift({ valeur: edition.decalage, libelle: action ? date(action.date_prevue) : '' });
  }

  async function enregistrer() {
    if (edition.titre.trim().length < 1) return setErreur(t('validation.titre_court'));
    setErreur(null);
    setEnvoi(true);
    const saisie = {
      titre: edition.titre.trim(),
      date_prevue: ajouterJours(jour, edition.decalage),
      quantite_prevue: edition.quantite,
      minutes_prevues: edition.minutes,
    };
    try {
      if (action) await modifierAction(action.id, saisie);
      else await creerAction(objectifId, saisie);
      await Promise.all([
        client.invalidateQueries({ queryKey: cles.actions }),
        client.invalidateQueries({ queryKey: ['objectif'] }),
        client.invalidateQueries({ queryKey: cles.objectifs }),
        action ? client.invalidateQueries({ queryKey: cles.action(action.id) }) : Promise.resolve(),
      ]);
      router.back();
    } catch (e) {
      setErreur(t(cleErreur(e)));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <View style={{ gap: espace.s }}>
      <Champ libelle={t('act.titre')} value={edition.titre} onChangeText={(v) => setEdition({ ...edition, titre: v })} maxLength={160} />
      <Texte variante="libelle">{t('act.date')}</Texte>
      <ChoixUnique options={options} valeur={edition.decalage} onChange={(v) => setEdition({ ...edition, decalage: v })} />
      <ChampNombre libelle={`${t('act.quantite')} (${t('commun.facultatif')})`} valeur={edition.quantite} onValide={(n) => setEdition({ ...edition, quantite: n })} />
      <ChampNombre libelle={`${t('act.minutes')} (${t('commun.facultatif')})`} valeur={edition.minutes} entier max={600} onValide={(n) => setEdition({ ...edition, minutes: n })} />
      {erreur && <Encart ton="danger">{erreur}</Encart>}
      <Bouton titre={t('commun.enregistrer')} onPress={enregistrer} chargement={envoi} />
    </View>
  );
}

function libelleHistorique(l: LigneHistoriqueAction, t: ReturnType<typeof useI18n>['t']): string {
  const statut = t(`statut_action.${l.nouveau_statut as StatutAction}`);
  const raison = typeof l.details.raison === 'string' ? ` · ${t('act.raison', { raison: l.details.raison === 'reprise' ? t('act.raison_reprise') : l.details.raison })}` : '';
  return `${statut}${raison}`;
}

export default function EcranAction() {
  const { id, objectif } = useLocalSearchParams<{ id: string; objectif?: string }>();
  const { t, aujourdhui, date, quantite } = useI18n();
  const client = useQueryClient();
  const nouvelle = id === 'nouvelle';
  const requete = useAction(id);
  const changer = useChangerStatutAction();
  const [mode, setMode] = useState<'details' | 'modifier' | 'reporter' | 'ignorer'>('details');
  const [raison, setRaison] = useState('');
  const [quantiteFaite, setQuantiteFaite] = useState<number | null>(null);
  const jour = aujourdhui();

  if (nouvelle) {
    return (
      <Ecran>
        <Stack.Screen options={{ title: t('act.nouvelle_titre') }} />
        {objectif ? <FormulaireAction objectifId={objectif} action={null} /> : <EtatVide titre={t('act.introuvable')} />}
      </Ecran>
    );
  }
  if (requete.isLoading) return <Chargement />;
  const action = requete.data;
  if (!action) return <EtatVide titre={t('act.introuvable')} action={{ titre: t('commun.retour'), onPress: () => router.back() }} />;

  const unite = action.objectifs?.unite ?? null;
  const statutFinal = action.statut === 'reportee';

  function changerStatut(statut: StatutAction, extra: { raison?: string; nouvelleDate?: string; quantite?: number | null } = {}) {
    changer.mutate(
      { actionId: action!.id, statut, ...extra },
      { onSettled: () => void client.invalidateQueries({ queryKey: cles.action(action!.id) }) },
    );
    router.back();
  }

  function supprimer() {
    Alert.alert(t('act.supprimer_confirmer'), '', [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
        style: 'destructive',
        onPress: () =>
          void supprimerAction(action!.id)
            .then(() => client.invalidateQueries({ queryKey: cles.actions }))
            .then(() => router.back())
            .catch((e) => Alert.alert(t(cleErreur(e)))),
      },
    ]);
  }

  return (
    <Ecran>
      <Carte>
        <Texte variante="titre2">{action.titre}</Texte>
        <Texte couleur={couleurs.texteSecondaire}>
          {date(action.date_prevue, { weekday: 'long', day: 'numeric', month: 'long' })} · {action.objectifs?.titre}
        </Texte>
        {action.quantite_prevue != null && <Texte>{quantite(action.quantite_prevue, unite)}</Texte>}
        {action.minutes_prevues != null && <Texte>{t('unite.minutes_court', { nombre: action.minutes_prevues })}</Texte>}
        <Texte variante="libelle" couleur={action.statut === 'terminee' ? couleurs.succes : couleurs.primaire}>
          {t(`statut_action.${action.statut}`)}
        </Texte>
        {action.raison && (
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {t('act.raison', { raison: action.raison === 'reprise' ? t('act.raison_reprise') : action.raison })}
          </Texte>
        )}
      </Carte>

      {mode === 'details' && !statutFinal && (
        <View style={{ gap: espace.s }}>
          {action.statut !== 'terminee' ? (
            <>
              {action.quantite_prevue != null && (
                <ChampNombre libelle={t('act.quantite_realisee')} valeur={action.quantite_prevue} onValide={setQuantiteFaite} aide={quantite(quantiteFaite ?? action.quantite_prevue, unite)} />
              )}
              <Bouton titre={t('act.terminer')} onPress={() => changerStatut('terminee', { quantite: quantiteFaite ?? action.quantite_prevue })} />
              {action.statut === 'a_faire' && <Bouton titre={t('act.reporter')} variante="secondaire" onPress={() => setMode('reporter')} />}
              {action.statut === 'a_faire' && <Bouton titre={t('act.ignorer')} variante="secondaire" onPress={() => setMode('ignorer')} />}
              {action.statut !== 'a_faire' && <Bouton titre={t('act.retablir')} variante="secondaire" onPress={() => changerStatut('a_faire')} />}
              {action.statut === 'a_faire' && <Bouton titre={t('act.annuler_action')} variante="discret" onPress={() => changerStatut('annulee')} />}
            </>
          ) : (
            <Bouton titre={t('act.retablir')} variante="secondaire" onPress={() => changerStatut('a_faire')} />
          )}
          <Bouton titre={t('commun.modifier')} variante="discret" onPress={() => setMode('modifier')} />
          <Bouton titre={t('commun.supprimer')} variante="danger" onPress={supprimer} />
        </View>
      )}

      {mode === 'reporter' && (
        <Section titre={t('act.reporter_quand')}>
          {[
            { jours: 1, libelle: t('commun.demain') },
            { jours: 2, libelle: t('act.dans_2_jours') },
            { jours: 7, libelle: t('act.semaine_pro') },
          ].map((o) => (
            <Bouton
              key={o.jours}
              titre={`${o.libelle} (${date(ajouterJours(jour, o.jours))})`}
              variante="secondaire"
              onPress={() => changerStatut('reportee', { nouvelleDate: ajouterJours(jour, o.jours) })}
            />
          ))}
          <Bouton titre={t('commun.annuler')} variante="discret" onPress={() => setMode('details')} />
        </Section>
      )}

      {mode === 'ignorer' && (
        <Section titre={t('act.ignorer')}>
          <Champ libelle={t('act.raison_placeholder')} value={raison} onChangeText={setRaison} maxLength={300} />
          <Bouton titre={t('commun.confirmer')} onPress={() => changerStatut('ignoree', { raison: raison.trim() || undefined })} />
          <Bouton titre={t('commun.annuler')} variante="discret" onPress={() => setMode('details')} />
        </Section>
      )}

      {mode === 'modifier' && action.objectif_id && <FormulaireAction objectifId={action.objectif_id} action={action} />}

      {action.historique_actions.length > 0 && (
        <Section titre={t('act.historique')}>
          <Carte>
            {action.historique_actions.map((l) => (
              <Texte key={l.id} variante="petit">
                {new Date(l.cree_le).toLocaleString()} · {libelleHistorique(l, t)}
              </Texte>
            ))}
          </Carte>
        </Section>
      )}
    </Ecran>
  );
}
