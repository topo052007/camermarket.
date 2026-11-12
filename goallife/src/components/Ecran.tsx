import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModificationsEnAttente } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';
import { Texte } from './Texte';

function useEnLigne(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
  );
}

/** Bandeau affiché hors connexion ou quand des modifications attendent d'être envoyées. */
export function BandeauConnexion() {
  const { t } = useI18n();
  const enLigne = useEnLigne();
  const enAttente = useModificationsEnAttente();
  if (enLigne && enAttente === 0) return null;
  return (
    <View style={styles.bandeau} accessibilityLiveRegion="polite">
      {!enLigne && <Texte variante="petit" couleur={couleurs.avertissement}>{t('commun.hors_connexion')}</Texte>}
      {enAttente > 0 && (
        <Texte variante="petit" couleur={couleurs.avertissement}>
          {t('commun.en_attente_synchro', { nombre: enAttente })}
        </Texte>
      )}
    </View>
  );
}

export function Ecran({
  titre,
  children,
  defilement = true,
  bas,
  avecMarges = true,
}: {
  titre?: string;
  children: ReactNode;
  defilement?: boolean;
  /** Zone fixe en bas (bouton principal). */
  bas?: ReactNode;
  avecMarges?: boolean;
}) {
  const contenu = (
    <>
      {titre && (
        <Texte variante="titre1" accessibilityRole="header" style={styles.titre}>
          {titre}
        </Texte>
      )}
      {children}
    </>
  );
  return (
    <SafeAreaView style={styles.racine} edges={['bottom', 'left', 'right']}>
      <BandeauConnexion />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {defilement ? (
          <ScrollView contentContainerStyle={[avecMarges && styles.marges, styles.defilement]} keyboardShouldPersistTaps="handled">
            {contenu}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, avecMarges && styles.marges]}>{contenu}</View>
        )}
        {bas && <View style={styles.bas}>{bas}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1, backgroundColor: couleurs.fond },
  marges: { padding: espace.l },
  defilement: { gap: espace.l, paddingBottom: espace.xxl },
  titre: { marginBottom: espace.xs },
  bas: { padding: espace.l, borderTopWidth: 1, borderTopColor: couleurs.bordure, backgroundColor: couleurs.surface, gap: espace.s },
  bandeau: { backgroundColor: couleurs.avertissementClair, paddingHorizontal: espace.l, paddingVertical: espace.s },
});
