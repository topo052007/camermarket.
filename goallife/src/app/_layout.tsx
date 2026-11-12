import { onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Bouton } from '@/components/Bouton';
import { Chargement, EtatErreur } from '@/components/Etats';
import { Texte } from '@/components/Texte';
import { configurationComplete, NOM_APP } from '@/config/env';
import { useProfil } from '@/hooks/donnees';
import { useSynchroArrierePlan } from '@/hooks/synchro';
import { prendreEcranApresOnboarding } from '@/navigation/apres-onboarding';
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
          {/* Sur ordinateur (web), l'application reste dans une colonne de la taille d'un téléphone. */}
          <View style={styles.exterieur}>
            <View style={styles.cadre}>
              <Navigation />
            </View>
          </View>
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
// Dernière connexion déjà traitée (au niveau du module : survit au remontage de la navigation).
let derniereConnexionTraitee = 0;

/**
 * Les gardes Stack.Protected empêchent d'afficher un écran interdit ; ce composant envoie en plus
 * l'utilisateur au bon endroit :
 * - non connecté : vers la connexion (sauf pages publiques : aide, confidentialité, liens e-mail) ;
 * - connecté sans onboarding : toujours vers l'onboarding (sinon on peut rester bloqué sur « Aide ») ;
 * - juste après une connexion : vers l'onboarding ou le tableau de bord, où qu'on soit.
 */
function Redirection({ connecte, onboardingFini, connexions }: { connecte: boolean; onboardingFini: boolean; connexions: number }) {
  const segments = useSegments();
  const premier = segments[0] ?? '';
  useEffect(() => {
    if (!connecte) {
      if (!ROUTES_PUBLIQUES.has(premier)) router.replace('/connexion');
      return;
    }
    const liensEmail = premier === 'auth-retour' || premier === 'reinitialiser';
    if (!onboardingFini) {
      if (premier !== 'onboarding' && !liensEmail) router.replace('/onboarding');
      return;
    }
    const vientDeSeConnecter = connexions !== derniereConnexionTraitee;
    derniereConnexionTraitee = connexions;
    if (premier === 'onboarding') {
      // L'écran d'onboarding vient de disparaître (gardes) : on rejoint l'accueil d'abord ;
      // l'écran demandé à la fin de l'onboarding est ouvert au passage suivant, une fois l'accueil affiché.
      router.replace('/');
      return;
    }
    const suite = prendreEcranApresOnboarding();
    if (suite && suite !== '/') {
      router.replace(suite);
    } else if (premier === '(auth)' || (vientDeSeConnecter && !liensEmail && ROUTES_PUBLIQUES.has(premier))) {
      router.replace('/');
    }
  }, [connecte, onboardingFini, connexions, premier]);
  return null;
}

function SynchroArrierePlan() {
  useSynchroArrierePlan();
  return null;
}

function Navigation() {
  const { t } = useI18n();
  const { session, chargement, connexions } = useSession();
  const profil = useProfil();
  // Au début de chaque session, le profil est relu UNE fois auprès du serveur : une copie locale ancienne
  // (« onboarding pas fini ») ferait sinon réapparaître l'onboarding. Hors connexion, on garde la copie.
  const [profilVerifiePour, setProfilVerifiePour] = useState<string | null>(null);
  const userId = session?.user.id ?? null;
  const { refetch: relireProfil } = profil;
  useEffect(() => {
    if (!userId) return;
    let actif = true;
    void relireProfil().finally(() => {
      if (actif) setProfilVerifiePour(userId);
    });
    return () => {
      actif = false;
    };
  }, [userId, relireProfil]);
  const verificationEnCours =
    userId != null && profilVerifiePour !== userId && onlineManager.isOnline() && profil.data != null && !profil.data.onboarding_termine_le;
  const pret = !chargement && (!session || profil.data != null || profil.isError) && !verificationEnCours;

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
      <Redirection connecte={connecte} onboardingFini={onboardingFini} connexions={connexions} />
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

const estWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  exterieur: { flex: 1, backgroundColor: estWeb ? couleurs.primaireClair : couleurs.fond },
  cadre: estWeb
    ? { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: couleurs.fond, borderLeftWidth: 1, borderRightWidth: 1, borderColor: couleurs.bordure }
    : { flex: 1 },
  centre: { flex: 1, justifyContent: 'center', padding: espace.xl, gap: espace.l, backgroundColor: couleurs.fond },
  demarrage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: couleurs.primaire, padding: espace.xl, gap: espace.s },
});
