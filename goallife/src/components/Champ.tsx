import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { lireNombre } from '@/domain/validation';
import { couleurs, espace, rayon, TACTILE_MIN, texte } from '@/theme';
import { Texte } from './Texte';

export function Champ({
  libelle,
  erreur,
  aide,
  ...props
}: TextInputProps & { libelle: string; erreur?: string | null; aide?: string }) {
  return (
    <View style={styles.bloc}>
      <Texte variante="libelle" style={styles.libelle}>
        {libelle}
      </Texte>
      <TextInput
        accessibilityLabel={libelle}
        placeholderTextColor={couleurs.desactive}
        {...props}
        style={[styles.champ, props.multiline && styles.multiligne, erreur ? styles.champErreur : null]}
      />
      {erreur ? (
        <Texte variante="petit" couleur={couleurs.danger} accessibilityLiveRegion="polite">
          {erreur}
        </Texte>
      ) : aide ? (
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          {aide}
        </Texte>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { marginBottom: espace.l, gap: espace.xs },
  libelle: { marginBottom: 2 },
  champ: {
    ...texte.corps,
    minHeight: TACTILE_MIN + 4,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.m,
    paddingHorizontal: espace.m,
    backgroundColor: couleurs.surface,
    color: couleurs.texte,
  },
  multiligne: { minHeight: 88, paddingTop: espace.m, textAlignVertical: 'top' },
  champErreur: { borderColor: couleurs.danger },
});

/**
 * Champ numérique : garde le texte tapé (même vide ou incomplet) et ne transmet
 * que les nombres valides.
 */
export function ChampNombre({
  libelle,
  valeur,
  onValide,
  min = 0,
  max = 1e12,
  entier = false,
  aide,
}: {
  libelle: string;
  valeur: number | null;
  onValide: (n: number) => void;
  min?: number;
  max?: number;
  entier?: boolean;
  aide?: string;
}) {
  const [texte, setTexte] = useState(valeur == null ? '' : String(valeur));
  return (
    <Champ
      libelle={libelle}
      value={texte}
      aide={aide}
      keyboardType={entier ? 'number-pad' : 'numeric'}
      onChangeText={(v) => {
        setTexte(v);
        const n = lireNombre(v);
        if (n != null && n > min && n <= max) onValide(entier ? Math.round(n) : n);
      }}
    />
  );
}
