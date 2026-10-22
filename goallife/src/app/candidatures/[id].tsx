import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart, EtatVide } from '@/components/Etats';
import { ChoixUnique } from '@/components/Puces';
import { Texte } from '@/components/Texte';
import { enregistrerCandidature, supprimerCandidature } from '@/data/candidatures';
import { cles } from '@/data/cles';
import { cleErreur } from '@/data/erreurs';
import { ajouterJours } from '@/domain/dates';
import { STATUTS_CANDIDATURE, type Candidature, type StatutCandidature } from '@/domain/types';
import { useCandidature, useObjectifs } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';

function Formulaire({ candidature, objectifInitial }: { candidature: Candidature | null; objectifInitial: string | null }) {
  const { t, aujourdhui, date } = useI18n();
  const client = useQueryClient();
  const jour = aujourdhui();
  const objectifs = useObjectifs(ajouterJours(jour, -60));
  const [entreprise, setEntreprise] = useState(candidature?.entreprise ?? '');
  const [poste, setPoste] = useState(candidature?.poste ?? '');
  const [statut, setStatut] = useState<StatutCandidature>(candidature?.statut ?? 'a_envoyer');
  const [objectifId, setObjectifId] = useState<string | null>(candidature?.objectif_id ?? objectifInitial);
  const [relance, setRelance] = useState<string | null>(candidature?.relance_le ?? null);
  const [lien, setLien] = useState(candidature?.lien ?? '');
  const [notes, setNotes] = useState(candidature?.notes ?? '');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Seuls les objectifs « carrière » actifs (ou celui déjà lié) peuvent être associés.
  const objectifsCarriere = (objectifs.data ?? []).filter((o) => o.id === objectifId || (o.categorie === 'carriere' && o.statut === 'actif'));
  const optionsRelance: { valeur: string | null; libelle: string }[] = [
    { valeur: null, libelle: t('cand.relance_aucune') },
    { valeur: ajouterJours(jour, 7), libelle: t('cand.relance_7') },
    { valeur: ajouterJours(jour, 14), libelle: t('cand.relance_14') },
  ];
  if (relance && !optionsRelance.some((o) => o.valeur === relance)) optionsRelance.push({ valeur: relance, libelle: date(relance) });

  async function rafraichir() {
    await Promise.all([
      client.invalidateQueries({ queryKey: cles.candidatures }),
      client.invalidateQueries({ queryKey: ['candidature'] }),
      client.invalidateQueries({ queryKey: cles.objectifs }),
      client.invalidateQueries({ queryKey: ['objectif'] }),
      client.invalidateQueries({ queryKey: cles.historique }),
    ]);
  }

  async function enregistrer() {
    if (entreprise.trim().length === 0) return setErreur(t('validation.titre_court'));
    setErreur(null);
    setEnvoi(true);
    const envoyee = statut !== 'a_envoyer' && statut !== 'abandonnee';
    try {
      await enregistrerCandidature(candidature?.id ?? null, {
        entreprise: entreprise.trim(),
        poste: poste.trim() || null,
        statut,
        objectif_id: objectifId,
        // Date d'envoi gardée si elle existe, sinon aujourd'hui dès que la candidature est envoyée.
        envoyee_le: envoyee ? (candidature?.envoyee_le ?? jour) : null,
        relance_le: relance,
        lien: lien.trim() || null,
        notes: notes.trim() || null,
      });
      await rafraichir();
      router.back();
    } catch (e) {
      setErreur(t(cleErreur(e)));
    } finally {
      setEnvoi(false);
    }
  }

  function supprimer() {
    if (!candidature) return;
    Alert.alert(t('cand.supprimer_confirmer'), '', [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
        style: 'destructive',
        onPress: () =>
          void supprimerCandidature(candidature.id)
            .then(rafraichir)
            .then(() => router.back())
            .catch((e) => setErreur(t(cleErreur(e)))),
      },
    ]);
  }

  return (
    <Ecran
      bas={
        <>
          {erreur && <Encart ton="danger">{erreur}</Encart>}
          <Bouton titre={t('commun.enregistrer')} onPress={enregistrer} chargement={envoi} />
          {candidature && <Bouton titre={t('commun.supprimer')} variante="danger" onPress={supprimer} />}
        </>
      }
    >
      <Stack.Screen options={{ title: candidature ? t('cand.modifier') : t('cand.nouvelle') }} />
      <Champ libelle={t('cand.entreprise')} value={entreprise} onChangeText={setEntreprise} maxLength={120} />
      <Champ libelle={`${t('cand.poste')} (${t('commun.facultatif')})`} value={poste} onChangeText={setPoste} maxLength={120} />
      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('cand.statut')}</Texte>
        <ChoixUnique options={STATUTS_CANDIDATURE.map((s) => ({ valeur: s, libelle: t(`cand.statut.${s}`) }))} valeur={statut} onChange={setStatut} />
      </View>
      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('cand.relance')}</Texte>
        <ChoixUnique options={optionsRelance} valeur={relance} onChange={setRelance} />
      </View>
      {objectifsCarriere.length > 0 && (
        <View style={{ gap: espace.s }}>
          <Texte variante="libelle">{t('cand.objectif')}</Texte>
          <ChoixUnique
            options={[{ valeur: null as string | null, libelle: t('cand.aucun_objectif') }, ...objectifsCarriere.map((o) => ({ valeur: o.id as string | null, libelle: o.titre }))]}
            valeur={objectifId}
            onChange={setObjectifId}
          />
        </View>
      )}
      <Champ
        libelle={`${t('cand.lien')} (${t('commun.facultatif')})`}
        value={lien}
        onChangeText={setLien}
        autoCapitalize="none"
        keyboardType="url"
        maxLength={500}
      />
      <Champ libelle={`${t('cand.notes')} (${t('commun.facultatif')})`} value={notes} onChangeText={setNotes} multiline maxLength={1000} />
      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
        {t('cand.privee')}
      </Texte>
    </Ecran>
  );
}

export default function EcranCandidature() {
  const { id, objectif } = useLocalSearchParams<{ id: string; objectif?: string }>();
  const { t } = useI18n();
  const nouvelle = id === 'nouvelle';
  const requete = useCandidature(id);
  if (nouvelle) return <Formulaire candidature={null} objectifInitial={objectif ?? null} />;
  if (requete.isLoading) return <Chargement />;
  if (!requete.data) return <EtatVide titre={t('erreur.introuvable')} action={{ titre: t('commun.retour'), onPress: () => router.back() }} />;
  return <Formulaire candidature={requete.data} objectifInitial={null} />;
}
