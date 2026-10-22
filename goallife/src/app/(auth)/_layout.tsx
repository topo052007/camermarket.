import { Stack } from 'expo-router';
import { useI18n } from '@/providers/I18n';
import { couleurs } from '@/theme';

export default function MiseEnPageAuth() {
  const { t } = useI18n();
  return (
    <Stack
      screenOptions={{
        headerTintColor: couleurs.primaire,
        contentStyle: { backgroundColor: couleurs.fond },
        headerBackTitle: t('commun.retour'),
      }}
    >
      <Stack.Screen name="connexion" options={{ headerShown: false }} />
      <Stack.Screen name="inscription" options={{ title: t('auth.inscription_titre') }} />
      <Stack.Screen name="mot-de-passe-oublie" options={{ title: t('auth.oubli_titre') }} />
    </Stack>
  );
}
