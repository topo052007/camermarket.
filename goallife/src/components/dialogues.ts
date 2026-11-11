import { Alert, Platform } from 'react-native';

// Boîtes de dialogue qui fonctionnent partout : sur le web, Alert.alert de React Native
// ne fait RIEN (react-native-web), on utilise donc les fenêtres du navigateur.

export function confirmer(options: {
  titre: string;
  message?: string;
  libelleConfirmer: string;
  libelleAnnuler: string;
  destructif?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    const texte = options.message ? `${options.titre}\n\n${options.message}` : options.titre;
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(texte));
  }
  return new Promise((resoudre) => {
    Alert.alert(
      options.titre,
      options.message,
      [
        { text: options.libelleAnnuler, style: 'cancel', onPress: () => resoudre(false) },
        { text: options.libelleConfirmer, style: options.destructif ? 'destructive' : 'default', onPress: () => resoudre(true) },
      ],
      { cancelable: true, onDismiss: () => resoudre(false) },
    );
  });
}

export function informer(titre: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${titre}\n\n${message}` : titre);
    return;
  }
  Alert.alert(titre, message);
}
