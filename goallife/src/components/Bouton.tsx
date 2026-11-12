import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { couleurs, espace, rayon, TACTILE_MIN } from '@/theme';
import { Texte } from './Texte';

type Variante = 'primaire' | 'secondaire' | 'danger' | 'discret';

const STYLES: Record<Variante, { fond: string; texte: string; bordure: string }> = {
  primaire: { fond: couleurs.primaire, texte: couleurs.texteInverse, bordure: couleurs.primaire },
  secondaire: { fond: couleurs.surface, texte: couleurs.primaire, bordure: couleurs.bordure },
  danger: { fond: couleurs.surface, texte: couleurs.danger, bordure: couleurs.danger },
  discret: { fond: 'transparent', texte: couleurs.primaire, bordure: 'transparent' },
};

export function Bouton({
  titre,
  onPress,
  variante = 'primaire',
  chargement = false,
  desactive = false,
  compact = false,
}: {
  titre: string;
  onPress: () => void;
  variante?: Variante;
  chargement?: boolean;
  desactive?: boolean;
  compact?: boolean;
}) {
  const s = STYLES[variante];
  const inactif = desactive || chargement;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif, busy: chargement }}
      onPress={inactif ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: s.fond, borderColor: s.bordure, opacity: inactif ? 0.55 : pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.contenu}>
        {chargement && <ActivityIndicator color={s.texte} style={{ marginRight: espace.s }} />}
        <Texte variante="libelle" couleur={s.texte} style={{ textAlign: 'center' }}>
          {titre}
        </Texte>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TACTILE_MIN + 4,
    borderRadius: rayon.m,
    borderWidth: 1,
    paddingHorizontal: espace.l,
    justifyContent: 'center',
  },
  compact: { minHeight: TACTILE_MIN, paddingHorizontal: espace.m },
  contenu: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
