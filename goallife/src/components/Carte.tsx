import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { couleurs, espace, rayon } from '@/theme';

export function Carte({ onPress, style, children, ...props }: ViewProps & { onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.carte, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View {...props} style={[styles.carte, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.surface,
    borderRadius: rayon.l,
    padding: espace.l,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    gap: espace.s,
  },
});
