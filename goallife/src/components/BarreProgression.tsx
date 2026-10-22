import { StyleSheet, View } from 'react-native';
import { couleurs, rayon } from '@/theme';

export function BarreProgression({ pourcentage, couleur = couleurs.primaire }: { pourcentage: number; couleur?: string }) {
  const p = Math.max(0, Math.min(100, pourcentage));
  return (
    <View
      style={styles.fond}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p) }}
    >
      <View style={[styles.barre, { width: `${p}%`, backgroundColor: couleur }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { height: 8, borderRadius: rayon.rond, backgroundColor: couleurs.primaireClair, overflow: 'hidden' },
  barre: { height: '100%', borderRadius: rayon.rond },
});
