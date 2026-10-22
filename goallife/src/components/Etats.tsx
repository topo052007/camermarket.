import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { cleErreur } from '@/data/erreurs';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace, rayon } from '@/theme';
import { Bouton } from './Bouton';
import { Texte } from './Texte';

export function Chargement() {
  const { t } = useI18n();
  return (
    <View style={styles.centre} accessibilityLabel={t('commun.chargement')}>
      <ActivityIndicator size="large" color={couleurs.primaire} />
    </View>
  );
}

export function EtatErreur({ erreur, onReessayer }: { erreur: unknown; onReessayer?: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.centre}>
      <Texte style={{ textAlign: 'center' }}>{t(cleErreur(erreur))}</Texte>
      {onReessayer && <Bouton titre={t('commun.reessayer')} variante="secondaire" onPress={onReessayer} />}
    </View>
  );
}

export function EtatVide({ titre, texte, action }: { titre: string; texte?: string; action?: { titre: string; onPress: () => void } }) {
  return (
    <View style={styles.vide}>
      <Texte variante="titre3" style={{ textAlign: 'center' }}>
        {titre}
      </Texte>
      {texte && (
        <Texte couleur={couleurs.texteSecondaire} style={{ textAlign: 'center' }}>
          {texte}
        </Texte>
      )}
      {action && <Bouton titre={action.titre} onPress={action.onPress} />}
    </View>
  );
}

type Ton = 'info' | 'succes' | 'avertissement' | 'danger';
const TONS: Record<Ton, { fond: string; texte: string }> = {
  info: { fond: couleurs.primaireClair, texte: couleurs.primaireFonce },
  succes: { fond: couleurs.succesClair, texte: couleurs.succes },
  avertissement: { fond: couleurs.avertissementClair, texte: couleurs.avertissement },
  danger: { fond: couleurs.dangerClair, texte: couleurs.danger },
};

/** Encadré de message (information, succès, avertissement, erreur). */
export function Encart({ ton = 'info', children }: { ton?: Ton; children: React.ReactNode }) {
  return (
    <View style={[styles.encart, { backgroundColor: TONS[ton].fond }]} accessibilityLiveRegion="polite">
      {typeof children === 'string' ? <Texte couleur={TONS[ton].texte}>{children}</Texte> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: espace.l, padding: espace.xl },
  vide: { alignItems: 'stretch', gap: espace.m, paddingVertical: espace.xl },
  encart: { borderRadius: rayon.m, padding: espace.m, gap: espace.s },
});
