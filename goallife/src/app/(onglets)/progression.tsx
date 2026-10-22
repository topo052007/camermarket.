import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarreProgression } from '@/components/BarreProgression';
import { Bouton } from '@/components/Bouton';
import { Carte } from '@/components/Carte';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart, EtatErreur } from '@/components/Etats';
import { Section } from '@/components/Lignes';
import { ResumeProgression } from '@/components/ResumeProgression';
import { Texte } from '@/components/Texte';
import { ajouterJours, debutSemaine, ecartJours } from '@/domain/dates';
import { LIMITES } from '@/domain/offres';
import { actionsComptees, serieActuelle, tendanceHebdomadaire } from '@/domain/progression';
import type { CodeCategorie } from '@/domain/types';
import { useAbonnement, useActionsPeriode, useObjectifs } from '@/hooks/donnees';
import { resumeObjectif } from '@/hooks/progression';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace, rayon } from '@/theme';

// Toutes les statistiques sont calculées sur les actions réellement enregistrées
// (règles : docs/progression-et-plans.md).

export default function Progression() {
  const { t, aujourdhui, date } = useI18n();
  const jour = aujourdhui();
  const debut = ajouterJours(debutSemaine(jour), -35); // 6 semaines
  const actions = useActionsPeriode(debut, jour);
  const objectifs = useObjectifs(ajouterJours(jour, -60));
  const { offre } = useAbonnement();

  const stats = useMemo(() => {
    const liste = (actions.data ?? []).filter((a) => a.statut !== 'reportee');
    const periode = (jours: number) => {
      const dans = actionsComptees(liste, jour).filter((a) => ecartJours(a.date_prevue, jour) < jours);
      return { terminees: dans.filter((a) => a.statut === 'terminee').length, prevues: dans.length };
    };
    const joursActifs = new Set(liste.filter((a) => a.statut === 'terminee').map((a) => a.date_prevue));
    const semaines = Array.from({ length: 6 }, (_, i) => ajouterJours(debutSemaine(jour), -7 * (5 - i)));
    const parCategorie = new Map<CodeCategorie, { terminees: number; prevues: number }>();
    for (const a of actionsComptees(liste, jour)) {
      const c = a.objectifs?.categorie;
      if (!c) continue;
      const v = parCategorie.get(c) ?? { terminees: 0, prevues: 0 };
      v.prevues++;
      if (a.statut === 'terminee') v.terminees++;
      parCategorie.set(c, v);
    }
    return {
      sept: periode(7),
      trente: periode(30),
      serie: serieActuelle(joursActifs, jour, (d) => ajouterJours(d, -1)),
      tendance: tendanceHebdomadaire(liste, semaines, jour),
      parCategorie: [...parCategorie.entries()],
    };
  }, [actions.data, jour]);

  if (actions.isLoading || objectifs.isLoading) return <Chargement />;
  if (actions.isError && !actions.data) return <EtatErreur erreur={actions.error} onReessayer={() => void actions.refetch()} />;

  const maxPrevues = Math.max(1, ...stats.tendance.map((s) => s.prevues));
  const aucune = stats.trente.prevues === 0;

  return (
    <Ecran>
      {aucune ? (
        <Encart>{t('prog.aucune_donnee')}</Encart>
      ) : (
        <>
          <View style={styles.ligne}>
            {[
              { titre: t('prog.7_jours'), v: stats.sept },
              { titre: t('prog.30_jours'), v: stats.trente },
            ].map(({ titre, v }) => (
              <Carte key={titre} style={{ flex: 1 }}>
                <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                  {titre}
                </Texte>
                <Texte variante="titre2">{v.prevues > 0 ? `${Math.round((v.terminees / v.prevues) * 100)} %` : '—'}</Texte>
                <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                  {t('prog.actions_faites', { terminees: v.terminees, prevues: v.prevues })}
                </Texte>
              </Carte>
            ))}
          </View>

          <Carte>
            <Texte variante="titre3">{t('prog.serie', { nombre: stats.serie })}</Texte>
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              {t('prog.serie_note')}
            </Texte>
          </Carte>

          <Section titre={t('prog.tendance')}>
            <Carte>
              <View style={styles.graphique} accessibilityRole="image" accessibilityLabel={t('prog.tendance')}>
                {stats.tendance.map((s) => (
                  <View key={s.semaine} style={styles.colonne}>
                    <View style={styles.zoneBarre}>
                      <View style={[styles.barrePrevue, { height: `${(s.prevues / maxPrevues) * 100}%` }]}>
                        <View style={[styles.barreFaite, { height: s.prevues > 0 ? `${(s.terminees / s.prevues) * 100}%` : 0 }]} />
                      </View>
                    </View>
                    <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                      {date(s.semaine, { day: 'numeric', month: 'numeric' })}
                    </Texte>
                    <Texte variante="petit">{s.prevues > 0 ? `${s.terminees}/${s.prevues}` : '—'}</Texte>
                  </View>
                ))}
              </View>
            </Carte>
          </Section>
        </>
      )}

      <Section titre={t('prog.par_objectif')}>
        {(objectifs.data ?? [])
          .filter((o) => o.statut === 'actif')
          .map((o) => (
            <Carte key={o.id} onPress={() => router.push(`/objectifs/${o.id}`)}>
              <Texte variante="libelle">{o.titre}</Texte>
              <ResumeProgression progression={resumeObjectif(o, jour).progression} unite={o.unite} />
            </Carte>
          ))}
      </Section>

      <Section titre={t('prog.par_categorie')}>
        {LIMITES[offre].statistiquesDetaillees ? (
          stats.parCategorie.map(([c, v]) => (
            <View key={c} style={{ gap: espace.xs }}>
              <Texte variante="libelle">
                {t(`cat.${c}`)} · {t('prog.actions_faites', { terminees: v.terminees, prevues: v.prevues })}
              </Texte>
              <BarreProgression pourcentage={(v.terminees / Math.max(1, v.prevues)) * 100} />
            </View>
          ))
        ) : (
          <Encart>
            <Texte couleur={couleurs.primaireFonce}>{t('prog.premium_detail')}</Texte>
            <Bouton titre={t('obj.voir_offres')} variante="discret" compact onPress={() => router.push('/abonnement')} />
          </Encart>
        )}
      </Section>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', gap: espace.m },
  graphique: { flexDirection: 'row', alignItems: 'flex-end', gap: espace.s, height: 170 },
  colonne: { flex: 1, alignItems: 'center', gap: 2 },
  zoneBarre: { height: 110, width: '70%', justifyContent: 'flex-end' },
  barrePrevue: { width: '100%', backgroundColor: couleurs.primaireClair, borderRadius: rayon.s, justifyContent: 'flex-end', overflow: 'hidden' },
  barreFaite: { width: '100%', backgroundColor: couleurs.primaire },
});
