import type { ExpoConfig } from 'expo/config';

// Nom et identifiants modifiables sans toucher au code (voir .env.example).
const nom = process.env.APP_NAME ?? 'GoalLife';
const identifiant = process.env.APP_BUNDLE_ID ?? 'com.goallife.app';
const schema = process.env.APP_SCHEME ?? 'goallife';
const projetEas = process.env.EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: nom,
  slug: process.env.APP_SLUG ?? 'goallife',
  scheme: schema,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: identifiant,
    supportsTablet: false,
  },
  android: {
    package: identifiant,
    adaptiveIcon: {
      backgroundColor: '#E8F3EF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        backgroundColor: '#FFFFFF',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#1F6F5C',
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: projetEas ? { eas: { projectId: projetEas } } : {},
};

export default config;
