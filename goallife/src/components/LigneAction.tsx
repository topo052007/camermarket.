import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ActionAvecObjectif } from '@/data/actions';
import { ecartJours } from '@/domain/dates';
import { useChangerStatutAction } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace, TACTILE_MIN } from '@/theme';
import { Texte } from './Texte';

/** Une action avec sa case « fait ». Toucher la ligne ouvre le détail (reporter, ignorer…). */
export function LigneAction({ action, afficherObjectif = true }: { action: ActionAvecObjectif; afficherObjectif?: boolean }) {
  const { t, quantite, aujourdhui } = useI18n();
  const changer = useChangerStatutAction();
  const faite = action.statut === 'terminee';
  const enRetard = action.statut === 'a_faire' && ecartJours(action.date_prevue, aujourdhui()) > 0;
  const inactive = action.statut === 'annulee' || action.statut === 'ignoree' || action.statut === 'reportee';
  const unite = action.objectifs?.unite ?? null;

  const details = [
    action.quantite_prevue != null ? quantite(faite && action.quantite_realisee != null ? action.quantite_realisee : action.quantite_prevue, unite) : null,
    action.minutes_prevues != null ? t('unite.minutes_court', { nombre: action.minutes_prevues }) : null,
    afficherObjectif && action.objectifs ? action.objectifs.titre : null,
  ].filter(Boolean);

  return (
    <View style={[styles.ligne, inactive && { opacity: 0.55 }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: faite, disabled: inactive }}
        accessibilityLabel={`${t('act.terminer')} : ${action.titre}`}
        disabled={inactive}
        hitSlop={8}
        onPress={() => changer.mutate({ actionId: action.id, statut: faite ? 'a_faire' : 'terminee' })}
        style={styles.case}
      >
        <Ionicons
          name={faite ? 'checkmark-circle' : 'ellipse-outline'}
          size={30}
          color={faite ? couleurs.succes : enRetard ? couleurs.avertissement : couleurs.primaire}
        />
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.texte} onPress={() => router.push(`/actions/${action.id}`)}>
        <Texte variante="libelle" style={faite ? styles.barre : undefined}>
          {action.titre}
        </Texte>
        {details.length > 0 && (
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {details.join(' · ')}
          </Texte>
        )}
        {(enRetard || inactive) && (
          <Texte variante="petit" couleur={enRetard ? couleurs.avertissement : couleurs.texteSecondaire}>
            {enRetard ? t('statut_action.en_retard') : t(`statut_action.${action.statut}`)}
          </Texte>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: espace.s, minHeight: TACTILE_MIN + 8 },
  case: { width: TACTILE_MIN, height: TACTILE_MIN, alignItems: 'center', justifyContent: 'center' },
  texte: { flex: 1, paddingVertical: espace.s, gap: 2 },
  barre: { textDecorationLine: 'line-through', color: couleurs.texteSecondaire },
});
