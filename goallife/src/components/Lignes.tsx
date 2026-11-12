import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { couleurs, espace, TACTILE_MIN } from '@/theme';
import { Texte } from './Texte';

export function Section({ titre, children, action }: { titre: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.entete}>
        <Texte variante="titre3" accessibilityRole="header" style={{ flex: 1 }}>
          {titre}
        </Texte>
        {action}
      </View>
      {children}
    </View>
  );
}

export function LigneReglage({
  titre,
  description,
  valeur,
  onChange,
  desactive,
}: {
  titre: string;
  description?: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
  desactive?: boolean;
}) {
  return (
    <View style={styles.ligne}>
      <View style={{ flex: 1, gap: 2 }}>
        <Texte variante="libelle">{titre}</Texte>
        {description && (
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {description}
          </Texte>
        )}
      </View>
      <Switch
        accessibilityLabel={titre}
        value={valeur}
        onValueChange={onChange}
        disabled={desactive}
        trackColor={{ true: couleurs.primaire, false: couleurs.bordure }}
        thumbColor={couleurs.surface}
      />
    </View>
  );
}

export function LigneLien({ titre, sousTitre, icone, onPress }: { titre: string; sousTitre?: string; icone: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icone} size={22} color={couleurs.primaire} />
      <View style={{ flex: 1 }}>
        <Texte variante="libelle">{titre}</Texte>
        {sousTitre && (
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {sousTitre}
          </Texte>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={couleurs.texteSecondaire} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: espace.s },
  entete: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: espace.m, minHeight: TACTILE_MIN + 8, paddingVertical: espace.s },
});
