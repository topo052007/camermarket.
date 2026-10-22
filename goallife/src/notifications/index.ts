import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/data/supabase';
import { versJourExpo, type RappelPlanifie } from '@/domain/rappels';

// Rappels LOCAUX : programmés sur le téléphone, ils fonctionnent sans Internet.
// Rien n'est garanti : l'utilisateur ou le système (économie de batterie) peut les bloquer.

export const notificationsDisponibles = Platform.OS !== 'web';
const CANAL = 'rappels';

export function configurerNotifications(): void {
  if (!notificationsDisponibles) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Rappels',
      importance: AndroidImportance.DEFAULT,
      // Contenu masqué sur l'écran verrouillé si l'utilisateur l'a configuré dans Android.
      lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
    });
  }
}

export type EtatPermission = 'accordee' | 'refusee' | 'a_demander' | 'indisponible';

export async function etatPermission(): Promise<EtatPermission> {
  if (!notificationsDisponibles) return 'indisponible';
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'accordee';
  return canAskAgain ? 'a_demander' : 'refusee';
}

export async function demanderPermission(): Promise<EtatPermission> {
  if (!notificationsDisponibles) return 'indisponible';
  const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') return 'accordee';
  return canAskAgain ? 'a_demander' : 'refusee';
}

/** Remplace tous les rappels programmés par la nouvelle liste. Renvoie le nombre programmé. */
export async function reprogrammerRappels(rappels: RappelPlanifie[]): Promise<number> {
  if (!notificationsDisponibles) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await etatPermission()) !== 'accordee') return 0;
  let n = 0;
  for (const r of rappels) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.cle,
      content: { title: r.titre, body: r.corps, data: r.objectifId ? { objectifId: r.objectifId } : {} },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: versJourExpo(r.jourIso),
        hour: r.heure,
        minute: r.minute,
        channelId: CANAL,
      },
    });
    n++;
  }
  return n;
}

export async function nombreRappelsProgrammes(): Promise<number> {
  if (!notificationsDisponibles) return 0;
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}

/**
 * Notifications PUSH (envoyées par le serveur) : préparées mais facultatives.
 * Il faut un projet EAS (EAS_PROJECT_ID) et un vrai téléphone ; sinon on ne fait rien.
 */
export async function enregistrerJetonPush(): Promise<void> {
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!notificationsDisponibles || !Device.isDevice || !projectId) return;
  if ((await etatPermission()) !== 'accordee') return;
  try {
    const { data: jeton } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('jetons_push').upsert({ jeton, plateforme: Platform.OS === 'ios' ? 'ios' : 'android' }, { onConflict: 'user_id,jeton' });
  } catch {
    // Pas bloquant : les rappels locaux continuent de fonctionner.
  }
}
