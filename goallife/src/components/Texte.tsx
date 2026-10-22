import { Text, type TextProps } from 'react-native';
import { couleurs, texte } from '@/theme';

type Variante = keyof typeof texte;

export function Texte({
  variante = 'corps',
  couleur = couleurs.texte,
  style,
  ...props
}: TextProps & { variante?: Variante; couleur?: string }) {
  return <Text {...props} style={[texte[variante], { color: couleur }, style]} />;
}
