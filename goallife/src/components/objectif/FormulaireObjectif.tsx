import { useState } from 'react';
import { View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { ChoixUnique } from '@/components/Puces';
import { SelecteurHeure, SelecteurJours } from '@/components/Selecteurs';
import { LigneReglage } from '@/components/Lignes';
import { Carte } from '@/components/Carte';
import { Texte } from '@/components/Texte';
import { CATEGORIES, UNITES, type CodeCategorie, type TypeObjectif, type Unite } from '@/domain/types';
import { traduireSiCle } from '@/i18n';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';

/** Valeurs brutes du formulaire (les nombres restent du texte tant que l'utilisateur tape). */
export type BrouillonObjectif = {
  type: TypeObjectif;
  titre: string;
  description: string;
  categorie: CodeCategorie;
  unite: Unite | null;
  cible: string;
  deja: string;
  debutDemain: boolean;
  duree: number | null; // en jours ; null = sans échéance
  dureePerso: string;
  jours: number[];
  minutes: string;
  quantiteSeance: string;
  priorite: 1 | 2 | 3;
  rappelActif: boolean;
  rappelHeure: string;
};

const DUREES = [7, 14, 30, 60, 90, 180];
export const DUREE_PERSO = -1;

export function FormulaireObjectif({
  brouillon,
  onChange,
  erreurs,
  moduleSpiritualite,
}: {
  brouillon: BrouillonObjectif;
  onChange: (b: BrouillonObjectif) => void;
  erreurs: Record<string, string>;
  moduleSpiritualite: boolean;
}) {
  const { t } = useI18n();
  const [plusOptions, setPlusOptions] = useState(false);
  const maj = <K extends keyof BrouillonObjectif>(cle: K, valeur: BrouillonObjectif[K]) => onChange({ ...brouillon, [cle]: valeur });
  const erreur = (champ: string) => (erreurs[champ] ? traduireSiCle(t, erreurs[champ]) : null);
  const categories = CATEGORIES.filter((c) => c !== 'spiritualite' || moduleSpiritualite);
  const b = brouillon;

  const optionsDuree: { valeur: number | null; libelle: string }[] = [
    ...DUREES.map((d) => ({ valeur: d as number | null, libelle: t('form.duree_jours', { nombre: d }) })),
    { valeur: DUREE_PERSO, libelle: t('form.duree_perso') },
  ];
  if (b.type !== 'quantitatif') optionsDuree.unshift({ valeur: null, libelle: t('form.sans_echeance') });

  return (
    <View style={{ gap: espace.l }}>
      <View style={{ gap: espace.s }}>
        <Texte variante="titre3">{t('form.quel_type')}</Texte>
        {(['quantitatif', 'recurrent', 'echeance'] as const).map((type) => (
          <Carte
            key={type}
            onPress={() => onChange({ ...b, type, duree: type === 'quantitatif' && b.duree == null ? 30 : b.duree })}
            style={b.type === type ? { borderColor: couleurs.primaire, borderWidth: 2 } : undefined}
          >
            <Texte variante="libelle" couleur={b.type === type ? couleurs.primaire : couleurs.texte}>
              {t(`type.${type}`)}
            </Texte>
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              {t(`type.${type}_desc`)}
            </Texte>
          </Carte>
        ))}
      </View>

      <Champ libelle={t('form.titre')} placeholder={t('form.titre_placeholder')} value={b.titre} onChangeText={(v) => maj('titre', v)} maxLength={120} erreur={erreur('titre')} />

      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('form.categorie')}</Texte>
        <ChoixUnique options={categories.map((c) => ({ valeur: c, libelle: t(`cat.${c}`) }))} valeur={b.categorie} onChange={(v) => maj('categorie', v)} />
      </View>

      {b.type === 'quantitatif' && (
        <>
          <View style={{ gap: espace.s }}>
            <Texte variante="libelle">{t('form.unite')}</Texte>
            <ChoixUnique options={UNITES.map((u) => ({ valeur: u as Unite | null, libelle: t(`unite.${u}`) }))} valeur={b.unite} onChange={(v) => maj('unite', v)} />
            {erreur('unite') && <Texte variante="petit" couleur={couleurs.danger}>{erreur('unite')}</Texte>}
          </View>
          <Champ libelle={t('form.cible')} value={b.cible} onChangeText={(v) => maj('cible', v)} keyboardType="numeric" placeholder="50 000" erreur={erreur('valeurCible')} />
          <Champ
            libelle={`${t('form.deja')} (${t('commun.facultatif')})`}
            value={b.deja}
            onChangeText={(v) => maj('deja', v)}
            keyboardType="numeric"
            placeholder="0"
            erreur={erreur('valeurInitiale')}
          />
        </>
      )}

      {b.type === 'recurrent' && (
        <>
          <Champ libelle={t('form.minutes_seance')} value={b.minutes} onChangeText={(v) => maj('minutes', v)} keyboardType="number-pad" placeholder="30" erreur={erreur('minutesParSeance')} />
          <Champ
            libelle={`${t('form.quantite_seance')} (${t('commun.facultatif')})`}
            value={b.quantiteSeance}
            onChangeText={(v) => maj('quantiteSeance', v)}
            keyboardType="numeric"
            placeholder="10"
          />
          {b.quantiteSeance !== '' && (
            <ChoixUnique options={UNITES.filter((u) => u !== 'argent').map((u) => ({ valeur: u as Unite | null, libelle: t(`unite.${u}`) }))} valeur={b.unite} onChange={(v) => maj('unite', v)} />
          )}
        </>
      )}

      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('form.debut')}</Texte>
        <ChoixUnique
          options={[
            { valeur: 'aujourdhui', libelle: t('commun.aujourdhui') },
            { valeur: 'demain', libelle: t('form.debut_demain') },
          ]}
          valeur={b.debutDemain ? 'demain' : 'aujourdhui'}
          onChange={(v) => maj('debutDemain', v === 'demain')}
        />
      </View>

      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('form.duree')}</Texte>
        <ChoixUnique options={optionsDuree} valeur={b.duree} onChange={(v) => maj('duree', v)} />
        {b.duree === DUREE_PERSO && (
          <Champ libelle={t('form.duree_perso')} value={b.dureePerso} onChangeText={(v) => maj('dureePerso', v)} keyboardType="number-pad" />
        )}
        {erreur('dateEcheance') && <Texte variante="petit" couleur={couleurs.danger}>{erreur('dateEcheance')}</Texte>}
      </View>

      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('form.jours_seance')}</Texte>
        <SelecteurJours jours={b.jours} onChange={(v) => maj('jours', v)} />
        {erreur('jours') && <Texte variante="petit" couleur={couleurs.danger}>{erreur('jours')}</Texte>}
      </View>

      {b.type !== 'recurrent' && (
        <Champ
          libelle={`${t('form.minutes_seance')} (${t('commun.facultatif')})`}
          value={b.minutes}
          onChangeText={(v) => maj('minutes', v)}
          keyboardType="number-pad"
          placeholder="30"
        />
      )}

      <LigneReglage titre={t('form.rappel')} valeur={b.rappelActif} onChange={(v) => maj('rappelActif', v)} />
      {b.rappelActif && <SelecteurHeure valeur={b.rappelHeure} onChange={(v) => maj('rappelHeure', v)} />}

      {!plusOptions ? (
        <Bouton titre={t('form.plus_options')} variante="discret" onPress={() => setPlusOptions(true)} />
      ) : (
        <>
          <Champ
            libelle={`${t('form.description')} (${t('commun.facultatif')})`}
            value={b.description}
            onChangeText={(v) => maj('description', v)}
            multiline
            maxLength={1000}
          />
          <View style={{ gap: espace.s }}>
            <Texte variante="libelle">{t('form.priorite')}</Texte>
            <ChoixUnique
              options={([1, 2, 3] as const).map((p) => ({ valeur: p, libelle: t(`priorite.${p}`) }))}
              valeur={b.priorite}
              onChange={(v) => maj('priorite', v)}
            />
          </View>
        </>
      )}
    </View>
  );
}
