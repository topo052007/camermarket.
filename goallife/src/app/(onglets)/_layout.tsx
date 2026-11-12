import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useI18n } from '@/providers/I18n';
import { couleurs } from '@/theme';

type Icone = keyof typeof Ionicons.glyphMap;

export default function Onglets() {
  const { t } = useI18n();
  const icone = (nom: Icone) =>
    function IconeOnglet({ color, size }: { color: ColorValue; size: number }) {
      return <Ionicons name={nom} color={String(color)} size={size} />;
    };
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: couleurs.primaire,
        tabBarInactiveTintColor: couleurs.texteSecondaire,
        headerTintColor: couleurs.texte,
        sceneStyle: { backgroundColor: couleurs.fond },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('onglet.accueil'), headerShown: false, tabBarIcon: icone('home-outline') }} />
      <Tabs.Screen name="objectifs" options={{ title: t('onglet.objectifs'), tabBarIcon: icone('flag-outline') }} />
      <Tabs.Screen name="coach" options={{ title: t('onglet.coach'), tabBarIcon: icone('chatbubble-ellipses-outline') }} />
      <Tabs.Screen name="progression" options={{ title: t('onglet.progression'), tabBarIcon: icone('stats-chart-outline') }} />
      <Tabs.Screen name="profil" options={{ title: t('onglet.profil'), tabBarIcon: icone('person-circle-outline') }} />
    </Tabs>
  );
}
