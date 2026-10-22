import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ecran } from '@/components/Ecran';
import { Chargement } from '@/components/Etats';
import { Texte } from '@/components/Texte';
import { ajouterJours, debutSemaine } from '@/domain/dates';
import { useActionsPeriode } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace, rayon, TACTILE_MIN } from '@/theme';

const SEMAINES = 5;

/** Vue sur 5 semaines : pour chaque jour, actions faites / prévues. Toucher un jour ouvre le planning. */
export default function Calendrier() {
  const { t, aujourdhui, date } = useI18n();
  const jour = aujourdhui();
  const [decalage, setDecalage] = useState(0);
  const debut = ajouterJours(debutSemaine(jour), -14 + decalage * 7 * SEMAINES);
  const fin = ajouterJours(debut, SEMAINES * 7 - 1);
  const actions = useActionsPeriode(debut, fin);
  const liste = (actions.data ?? []).filter((a) => a.statut !== 'reportee' && a.statut !== 'annulee');

  return (
    <Ecran>
      <View style={styles.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel="-" onPress={() => setDecalage(decalage - 1)} style={styles.fleche}>
          <Ionicons name="chevron-back" size={24} color={couleurs.primaire} />
        </Pressable>
        <Texte variante="libelle" style={{ flex: 1, textAlign: 'center' }}>
          {date(debut, { day: 'numeric', month: 'short' })} – {date(fin, { day: 'numeric', month: 'short' })}
        </Texte>
        <Pressable accessibilityRole="button" accessibilityLabel="+" onPress={() => setDecalage(decalage + 1)} style={styles.fleche}>
          <Ionicons name="chevron-forward" size={24} color={couleurs.primaire} />
        </Pressable>
      </View>
      <View style={styles.ligne}>
        {[1, 2, 3, 4, 5, 6, 7].map((j) => (
          <Texte key={j} variante="petit" couleur={couleurs.texteSecondaire} style={styles.entete}>
            {t(`jour.${j}` as 'jour.1')}
          </Texte>
        ))}
      </View>
      {actions.isLoading ? (
        <Chargement />
      ) : (
        Array.from({ length: SEMAINES }, (_, s) => (
          <View key={s} style={styles.ligne}>
            {Array.from({ length: 7 }, (_, j) => {
              const d = ajouterJours(debut, s * 7 + j);
              const du = liste.filter((a) => a.date_prevue === d);
              const faites = du.filter((a) => a.statut === 'terminee').length;
              const complet = du.length > 0 && faites === du.length;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityLabel={`${date(d)} ${faites}/${du.length}`}
                  onPress={() => router.push(`/planning?date=${d}`)}
                  style={[styles.case, complet && styles.complete, d === jour && styles.aujourdhui]}
                >
                  <Texte variante="petit" couleur={complet ? couleurs.texteInverse : couleurs.texte}>
                    {Number(d.slice(8))}
                  </Texte>
                  <Texte variante="petit" couleur={complet ? couleurs.texteInverse : couleurs.texteSecondaire}>
                    {du.length > 0 ? `${faites}/${du.length}` : ''}
                  </Texte>
                </Pressable>
              );
            })}
          </View>
        ))
      )}
      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
        {t('cal.legende')}
      </Texte>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  navigation: { flexDirection: 'row', alignItems: 'center' },
  fleche: { width: TACTILE_MIN, height: TACTILE_MIN, alignItems: 'center', justifyContent: 'center' },
  ligne: { flexDirection: 'row', gap: espace.xs },
  entete: { flex: 1, textAlign: 'center' },
  case: { flex: 1, minHeight: 52, borderRadius: rayon.s, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure, alignItems: 'center', justifyContent: 'center' },
  complete: { backgroundColor: couleurs.succes, borderColor: couleurs.succes },
  aujourdhui: { borderColor: couleurs.accent, borderWidth: 2 },
});
