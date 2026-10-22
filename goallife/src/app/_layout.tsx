import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Bouton } from '@/components/Bouton';
import { Chargement, EtatErreur } from '@/components/Etats';
import { Texte } from '@/components/Texte';
import { configurationComplete, NOM_APP } from '@/config/env';
import { useProfil } from '@/hooks/donnees';
import { useSynchroArrierePlan } from '@/hooks/synchro';
import { configurerNotifications } from '@/notifications';
import { clientRequetes, persisteur } from '@/offline/client-requetes';
import { useI18n } from '@/providers/I18n';
import { FournisseurSession, useSession } from '@/providers/Session';
import { supabase } from '@/data/supabase';
import { couleurs, espace } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
configurerNotifications();

export default function Racine() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={clientRequetes}
        persistOptions={{ persister: persisteur, maxAge: 1000 * 60 * 60 * 24 * 7 }}
        onSuccess={() => void clientRequetes.resumePausedMutations()}
      >
        <FournisseurSession>
          <StatusBar style="dark" />
          <Navigation />
        </FournisseurSession>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

// Écrans accessibles sans être connecté.
const ROUTES_PUBLIQUES = new Set(['(auth)', 'auth-retour', 'reinitialiser', 'confidentialite', 'aide']);

/**
 * Les gardes Stack.Protected empêchent d'afficher un écran interdit ; ce composant envoie en plus
 * l'utilisateur au bon endroit au démarrage (sinon l'adresse « / » mène à « introuvable »).
 */
function Redirection({ connecte, onboardingFini }: { connecte: boolean; onboardingFini: boolean }) {
  const segments = useSegments();
  const premier = segments[0] ?? '';
  useEffect(() => {
    if (!connecte && !ROUTES_PUBLIQUES.has(premier)) router.replace('/connexion');
    else if (connecte && !onboardingFini && premier !== 'onboarding' && !ROUTES_PUBLIQUES.has(premier)) router.replace('/onboarding');
    else if (connecte && onboardingFini && (premier === '(auth)' || premier === 'onboarding')) router.replace('/');
  }, [connecte, onboardingFini, premier]);
  return null;
}

function SynchroArrierePlan() {
  useSynchroArrierePlan();
  return null;
}

function Navigation() {
  const { t } = useI18n();
  const { session, chargement } = useSession();
  const profil = useProfil();
  const pret = !chargement && (!session || profil.data != null || profil.isError);

  useEffect(() => {
    if (pret || !configurationComplete) void SplashScreen.hideAsync().catch(() => undefined);
  }, [pret]);

  if (!configurationComplete) {
    return (
      <View style={styles.centre}>
        <Texte variante="titre2">{t('config.manquante_titre')}</Texte>
        <Texte>{t('config.manquante_texte')}</Texte>
      </View>
    );
  }
  if (!pret) return <EcranDemarrage />;
  if (session && !profil.data) {
    // Profil illisible (pas de réseau et rien en cache, ou session invalide).
    return (
      <View style={styles.centre}>
        <EtatErreur erreur={profil.error} onReessayer={() => void profil.refetch()} />
        <Bouton titre={t('profil.deconnexion')} variante="discret" onPress={() => void supabase.auth.signOut()} />
      </View>
    );
  }

  const connecte = Boolean(session);
  const onboardingFini = Boolean(profil.data?.onboarding_termine_le);
  const entete = {
    headerTintColor: couleurs.primaire,
    headerStyle: { backgroundColor: couleurs.surface },
    headerTitleStyle: { color: couleurs.texte },
    contentStyle: { backgroundColor: couleurs.fond },
    headerBackTitle: t('commun.retour'),
  };

  return (
    <>
      {connecte && onboardingFini && <SynchroArrierePlan />}
      <Redirection connecte={connecte} onboardingFini={onboardingFini} />
      <Stack screenOptions={entete}>
        <Stack.Protected guard={!connecte}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={connecte && !onboardingFini}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={connecte && onboardingFini}>
          <Stack.Screen name="(onglets)" options={{ headerShown: false, title: NOM_APP }} />
          <Stack.Screen name="objectifs/nouveau" options={{ title: t('form.titre_ecran') }} />
          <Stack.Screen name="objectifs/[id]/index" options={{ title: '' }} />
          <Stack.Screen name="objectifs/[id]/modifier" options={{ title: t('mod.titre_ecran') }} />
          <Stack.Screen name="objectifs/[id]/reprise" options={{ title: t('rep.titre') }} />
          <Stack.Screen name="actions/[id]" options={{ title: t('act.titre_ecran') }} />
          <Stack.Screen name="planning" options={{ title: t('planning.titre') }} />
          <Stack.Screen name="calendrier" options={{ title: t('cal.titre') }} />
          <Stack.Screen name="historique" options={{ title: t('hist.titre') }} />
          <Stack.Screen name="parametres" options={{ title: t('param.titre') }} />
          <Stack.Screen name="notifications" options={{ title: t('notif.titre_ecran') }} />
          <Stack.Screen name="abonnement" options={{ title: t('abo.titre') }} />
          <Stack.Screen name="candidatures/index" options={{ title: t('cand.titre') }} />
          <Stack.Screen name="candidatures/[id]" options={{ title: t('cand.nouvelle') }} />
        </Stack.Protected>
        <Stack.Screen name="confidentialite" options={{ title: t('conf.titre') }} />
        <Stack.Screen name="aide" options={{ title: t('aide.titre') }} />
        <Stack.Screen name="auth-retour" options={{ headerShown: false }} />
        <Stack.Screen name="reinitialiser" options={{ title: t('auth.nouveau_mot_de_passe_titre') }} />
        <Stack.Screen name="+not-found" options={{ title: '' }} />
      </Stack>
    </>
  );
}

/** Écran de démarrage affiché pendant la lecture de la session et du profil. */
function EcranDemarrage() {
  const { t } = useI18n();
  return (
    <View style={styles.demarrage}>
      <Texte variante="titre1" couleur={couleurs.texteInverse}>
        {NOM_APP}
      </Texte>
      <Texte couleur={couleurs.primaireClair}>{t('app.slogan')}</Texte>
      <View style={{ height: espace.xl }} />
      <Chargement />
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, justifyContent: 'center', padding: espace.xl, gap: espace.l, backgroundColor: couleurs.fond },
  demarrage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: couleurs.primaire, padding: espace.xl, gap: espace.s },
});
