import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Carte } from '@/components/Carte';
import { Champ, ChampNombre } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart, EtatVide } from '@/components/Etats';
import { LigneReglage, Section } from '@/components/Lignes';
import { ChoixUnique } from '@/components/Puces';
import { SelecteurHeure, SelecteurJours } from '@/components/Selecteurs';
import { Texte } from '@/components/Texte';
import { HORIZON_JOURS } from '@/config/env';
import { cles } from '@/data/cles';
import { cleErreur } from '@/data/erreurs';
import { modifierObjectif, modifierRythme, type ObjectifDetail } from '@/data/objectifs';
import { ajouterJours } from '@/domain/dates';
import { useObjectif } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';

type Rythme = { id: string; jours: number[]; quantite: number | null; minutes: number | null; modifie: boolean };

function Formulaire({ o }: { o: ObjectifDetail }) {
  const { t, aujourdhui, quantite } = useI18n();
  const client = useQueryClient();
  const [titre, setTitre] = useState(o.titre);
  const [description, setDescription] = useState(o.description ?? '');
  const [priorite, setPriorite] = useState(o.priorite);
  const [rappelActif, setRappelActif] = useState(o.rappel_actif);
  const [rappelHeure, setRappelHeure] = useState(o.rappel_heure?.slice(0, 5) ?? '19:00');
  const [rythmes, setRythmes] = useState<Rythme[]>(
    o.recurrences.filter((r) => r.active).map((r) => ({ id: r.id, jours: r.jours_semaine, quantite: r.quantite, minutes: r.minutes, modifie: false })),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const majRythme = (id: string, champs: Partial<Rythme>) => setRythmes((rs) => rs.map((r) => (r.id === id ? { ...r, ...champs, modifie: true } : r)));

  async function enregistrer() {
    if (titre.trim().length < 3) return setErreur(t('validation.titre_court'));
    if (rythmes.some((r) => r.jours.length === 0)) return setErreur(t('validation.jours'));
    setErreur(null);
    setEnvoi(true);
    try {
      await modifierObjectif(o.id, {
        titre: titre.trim(),
        description: description.trim() || null,
        priorite,
        rappel_actif: rappelActif,
        rappel_heure: rappelActif ? rappelHeure : null,
      });
      for (const r of rythmes.filter((x) => x.modifie)) {
        await modifierRythme(r.id, r.jours, r.quantite, r.minutes, ajouterJours(aujourdhui(), HORIZON_JOURS));
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: cles.objectif(o.id) }),
        client.invalidateQueries({ queryKey: cles.objectifs }),
        client.invalidateQueries({ queryKey: cles.actions }),
      ]);
      router.back();
    } catch (e) {
      setErreur(t(cleErreur(e)));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Ecran
      bas={
        <>
          {erreur && <Encart ton="danger">{erreur}</Encart>}
          <Bouton titre={t('commun.enregistrer')} onPress={enregistrer} chargement={envoi} />
        </>
      }
    >
      <Champ libelle={t('form.titre')} value={titre} onChangeText={setTitre} maxLength={120} />
      <Champ libelle={`${t('form.description')} (${t('commun.facultatif')})`} value={description} onChangeText={setDescription} multiline maxLength={1000} />
      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('form.priorite')}</Texte>
        <ChoixUnique options={([1, 2, 3] as const).map((p) => ({ valeur: p, libelle: t(`priorite.${p}`) }))} valeur={priorite} onChange={setPriorite} />
      </View>
      <LigneReglage titre={t('form.rappel')} valeur={rappelActif} onChange={setRappelActif} />
      {rappelActif && <SelecteurHeure valeur={rappelHeure} onChange={setRappelHeure} />}

      {rythmes.length > 0 && (
        <Section titre={t('mod.rythme')}>
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {t('mod.rythme_note')}
          </Texte>
          {rythmes.map((r) => (
            <Carte key={r.id}>
              <SelecteurJours jours={r.jours} onChange={(j) => majRythme(r.id, { jours: j })} />
              {r.quantite != null && (
                <ChampNombre libelle={t('plan.par_seance')} valeur={r.quantite} aide={quantite(r.quantite, o.unite)} onValide={(n) => majRythme(r.id, { quantite: n })} />
              )}
              {r.minutes != null && (
                <ChampNombre libelle={t('form.minutes_seance')} valeur={r.minutes} entier max={600} onValide={(n) => majRythme(r.id, { minutes: n })} />
              )}
            </Carte>
          ))}
        </Section>
      )}
    </Ecran>
  );
}

export default function ModifierObjectif() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { data, isLoading } = useObjectif(id);
  if (isLoading) return <Chargement />;
  if (!data) return <EtatVide titre={t('det.introuvable')} />;
  return <Formulaire o={data} />;
}
