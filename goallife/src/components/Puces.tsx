import { Pressable, StyleSheet, View } from 'react-native';
import { couleurs, espace, rayon, TACTILE_MIN } from '@/theme';
import { Texte } from './Texte';

export function Puce({ libelle, choisie, onPress }: { libelle: string; choisie: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: choisie }}
      onPress={onPress}
      style={[styles.puce, choisie && styles.choisie]}
    >
      <Texte variante="libelle" couleur={choisie ? couleurs.texteInverse : couleurs.texte}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

/** Choix unique parmi des options. */
export function ChoixUnique<T extends string | number | null>({
  options,
  valeur,
  onChange,
}: {
  options: { valeur: T; libelle: string }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.groupe} accessibilityRole="radiogroup">
      {options.map((o) => (
        <Puce key={String(o.valeur)} libelle={o.libelle} choisie={o.valeur === valeur} onPress={() => onChange(o.valeur)} />
      ))}
    </View>
  );
}

/** Choix multiple. */
export function ChoixMultiple<T extends string | number>({
  options,
  valeurs,
  onChange,
}: {
  options: { valeur: T; libelle: string }[];
  valeurs: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <View style={styles.groupe}>
      {options.map((o) => {
        const choisie = valeurs.includes(o.valeur);
        return (
          <Puce
            key={String(o.valeur)}
            libelle={o.libelle}
            choisie={choisie}
            onPress={() => onChange(choisie ? valeurs.filter((v) => v !== o.valeur) : [...valeurs, o.valeur])}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  groupe: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
  puce: {
    minHeight: TACTILE_MIN - 4,
    paddingHorizontal: espace.m,
    borderRadius: rayon.rond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.surface,
    justifyContent: 'center',
  },
  choisie: { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
});
