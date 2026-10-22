import { Pressable, StyleSheet, View } from 'react-native';
import { formaterHeure, minutesDepuisMinuit } from '@/domain/dates';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace, rayon, TACTILE_MIN } from '@/theme';
import { ChoixMultiple } from './Puces';
import { Texte } from './Texte';

/** Jours de la semaine (1 = lundi … 7 = dimanche). */
export function SelecteurJours({ jours, onChange }: { jours: number[]; onChange: (j: number[]) => void }) {
  const { t } = useI18n();
  const options = [1, 2, 3, 4, 5, 6, 7].map((j) => ({ valeur: j, libelle: t(`jour.${j}` as 'jour.1') }));
  return <ChoixMultiple options={options} valeurs={jours} onChange={(v) => onChange([...v].sort((a, b) => a - b))} />;
}

function Pas({ libelle, onPress, accessibilite }: { libelle: string; onPress: () => void; accessibilite: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilite} onPress={onPress} style={styles.pas}>
      <Texte variante="titre3" couleur={couleurs.primaire}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

/** Heure HH:MM par pas de 15 minutes, sans dépendance native. */
export function SelecteurHeure({ valeur, onChange }: { valeur: string | null; onChange: (h: string) => void }) {
  const minutes = minutesDepuisMinuit(valeur) ?? 19 * 60;
  const changer = (delta: number) => onChange(formaterHeure((minutes + delta + 1440) % 1440));
  return (
    <View style={styles.heure}>
      <Pas libelle="−1h" accessibilite="-1 h" onPress={() => changer(-60)} />
      <Pas libelle="−15" accessibilite="-15 min" onPress={() => changer(-15)} />
      <Texte variante="titre2" style={styles.valeur} accessibilityLiveRegion="polite">
        {formaterHeure(minutes)}
      </Texte>
      <Pas libelle="+15" accessibilite="+15 min" onPress={() => changer(15)} />
      <Pas libelle="+1h" accessibilite="+1 h" onPress={() => changer(60)} />
    </View>
  );
}

const styles = StyleSheet.create({
  heure: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  valeur: { minWidth: 72, textAlign: 'center' },
  pas: {
    minWidth: TACTILE_MIN,
    minHeight: TACTILE_MIN,
    borderRadius: rayon.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espace.s,
  },
});
