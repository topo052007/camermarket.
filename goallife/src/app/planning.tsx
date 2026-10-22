import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Carte } from '@/components/Carte';
import { Ecran } from '@/components/Ecran';
import { Chargement, EtatErreur } from '@/components/Etats';
import { LigneAction } from '@/components/LigneAction';
import { Texte } from '@/components/Texte';
import { ajouterJours, debutSemaine, estDateValide } from '@/domain/dates';
import { useActionsPeriode } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace, rayon, TACTILE_MIN } from '@/theme';

/** Planning quotidien, avec une bande de 7 jours pour naviguer dans la semaine. */
export default function Planning() {
  const { t, aujourdhui, date } = useI18n();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const [jour, setJour] = useState(dateParam && estDateValide(dateParam) ? dateParam : aujourdhui());
  const lundi = debutSemaine(jour);
  const dimanche = ajouterJours(lundi, 6);
  const actions = useActionsPeriode(lundi, dimanche);

  const liste = (actions.data ?? []).filter((a) => a.statut !== 'reportee');
  const duJour = liste.filter((a) => a.date_prevue === jour);

  return (
    <Ecran>
      <View style={styles.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('planning.precedent')} onPress={() => setJour(ajouterJours(jour, -1))} style={styles.fleche}>
          <Ionicons name="chevron-back" size={24} color={couleurs.primaire} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setJour(aujourdhui())} style={{ flex: 1, alignItems: 'center' }}>
          <Texte variante="titre3">{date(jour, { weekday: 'long', day: 'numeric', month: 'long' })}</Texte>
          {jour !== aujourdhui() && (
            <Texte variante="petit" couleur={couleurs.primaire}>
              {t('commun.aujourdhui')}
            </Texte>
          )}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('planning.suivant')} onPress={() => setJour(ajouterJours(jour, 1))} style={styles.fleche}>
          <Ionicons name="chevron-forward" size={24} color={couleurs.primaire} />
        </Pressable>
      </View>

      <View style={styles.semaine}>
        {Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i)).map((d, i) => {
          const duJourD = liste.filter((a) => a.date_prevue === d && a.statut !== 'annulee');
          const faites = duJourD.filter((a) => a.statut === 'terminee').length;
          const choisi = d === jour;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityState={{ selected: choisi }}
              onPress={() => setJour(d)}
              style={[styles.jour, choisi && styles.jourChoisi]}
            >
              <Texte variante="petit" couleur={choisi ? couleurs.texteInverse : couleurs.texteSecondaire}>
                {t(`jour.${i + 1}` as 'jour.1')}
              </Texte>
              <Texte variante="libelle" couleur={choisi ? couleurs.texteInverse : couleurs.texte}>
                {Number(d.slice(8))}
              </Texte>
              <Texte variante="petit" couleur={choisi ? couleurs.texteInverse : couleurs.texteSecondaire}>
                {duJourD.length > 0 ? `${faites}/${duJourD.length}` : '·'}
              </Texte>
            </Pressable>
          );
        })}
      </View>

      {actions.isLoading ? (
        <Chargement />
      ) : actions.isError && !actions.data ? (
        <EtatErreur erreur={actions.error} onReessayer={() => void actions.refetch()} />
      ) : (
        <Carte>
          {duJour.length === 0 ? (
            <Texte couleur={couleurs.texteSecondaire}>{t('planning.aucune')}</Texte>
          ) : (
            duJour.map((a) => <LigneAction key={a.id} action={a} />)
          )}
        </Carte>
      )}
      <Pressable accessibilityRole="link" onPress={() => router.push('/calendrier')}>
        <Texte couleur={couleurs.primaire} style={{ textAlign: 'center' }}>
          {t('cal.titre')}
        </Texte>
      </Pressable>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  navigation: { flexDirection: 'row', alignItems: 'center' },
  fleche: { width: TACTILE_MIN, height: TACTILE_MIN, alignItems: 'center', justifyContent: 'center' },
  semaine: { flexDirection: 'row', gap: espace.xs },
  jour: { flex: 1, alignItems: 'center', paddingVertical: espace.s, borderRadius: rayon.m, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure },
  jourChoisi: { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
});
