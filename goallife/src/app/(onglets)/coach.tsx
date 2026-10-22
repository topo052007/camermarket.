import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Carte } from '@/components/Carte';
import { Champ } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Encart } from '@/components/Etats';
import { Texte } from '@/components/Texte';
import { cles } from '@/data/cles';
import { chargerMessagesCoach, demanderAuCoach, effacerMessagesCoach, statutCoach } from '@/data/coach';
import { cleErreur } from '@/data/erreurs';
import { conseilsSansIa } from '@/domain/coach-regles';
import { ajouterJours } from '@/domain/dates';
import { useActionsPeriode, useObjectifs, useProfil } from '@/hooks/donnees';
import { resumeObjectif } from '@/hooks/progression';
import { useI18n } from '@/providers/I18n';
import { useUtilisateurId } from '@/providers/Session';
import { couleurs, espace, rayon } from '@/theme';

export default function Coach() {
  const { t, langue, aujourdhui } = useI18n();
  const jour = aujourdhui();
  const client = useQueryClient();
  const userId = useUtilisateurId();
  const { data: profil } = useProfil();
  const objectifs = useObjectifs(ajouterJours(jour, -60));
  const actionsJour = useActionsPeriode(jour, jour);
  const statut = useQuery({ queryKey: cles.coachStatut, queryFn: statutCoach, retry: 1 });
  const iaActive = statut.data?.ia_configuree === true;
  const messages = useQuery({ queryKey: cles.messagesCoach, queryFn: chargerMessagesCoach, enabled: iaActive });
  const [question, setQuestion] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  // Analyse automatique : règles simples sur les données enregistrées, toujours disponible.
  const conseils = useMemo(() => {
    const actifs = (objectifs.data ?? []).filter((o) => o.statut === 'actif');
    const aFaire = (actionsJour.data ?? []).filter((a) => a.statut === 'a_faire').length;
    return conseilsSansIa(
      actifs.map((o) => {
        const r = resumeObjectif(o, jour);
        return { titre: o.titre, progression: r.progression, retard: r.retard, tempsEcoule: r.tempsEcoule };
      }),
      aFaire,
      t,
    );
  }, [objectifs.data, actionsJour.data, jour, t]);

  const envoyer = useMutation({
    mutationFn: (q: string) => demanderAuCoach(q, langue),
    onSuccess: (r) => {
      if (!r.ok) setErreur(r.raison === 'quota_epuise' ? t('coach.quota_epuise') : t('coach.erreur'));
      else setQuestion('');
      void client.invalidateQueries({ queryKey: cles.messagesCoach });
      void client.invalidateQueries({ queryKey: cles.coachStatut });
    },
    onError: (e) => setErreur(t(cleErreur(e)) === t('commun.erreur_reseau') ? t('coach.hors_ligne') : t('coach.erreur')),
  });

  function effacer() {
    Alert.alert(t('coach.effacer_historique'), '', [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
        style: 'destructive',
        onPress: () => void effacerMessagesCoach(userId).then(() => client.invalidateQueries({ queryKey: cles.messagesCoach })),
      },
    ]);
  }

  const quotaEpuise = statut.data != null && statut.data.utilise >= statut.data.quota;

  return (
    <Ecran
      bas={
        iaActive ? (
          <View style={{ gap: espace.s }}>
            <Champ
              libelle={t('coach.placeholder')}
              value={question}
              onChangeText={setQuestion}
              maxLength={1000}
              multiline
              editable={!quotaEpuise}
            />
            <Bouton
              titre={t('coach.envoyer')}
              onPress={() => {
                setErreur(null);
                if (!onlineManager.isOnline()) return setErreur(t('coach.hors_ligne'));
                envoyer.mutate(question.trim());
              }}
              chargement={envoyer.isPending}
              desactive={question.trim().length < 2 || quotaEpuise}
            />
          </View>
        ) : undefined
      }
    >
      <Carte>
        <Texte variante="libelle" couleur={couleurs.primaire}>
          {t('coach.analyse_auto')}
        </Texte>
        {conseils.map((c, i) => (
          <Texte key={i}>• {c}</Texte>
        ))}
      </Carte>

      {!statut.isLoading && !iaActive && <Encart>{t('coach.ia_non_configuree')}</Encart>}

      {iaActive && (
        <>
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {t('coach.ia_active')} · {t('coach.quota', { utilise: statut.data?.utilise ?? 0, quota: statut.data?.quota ?? 0 })}
          </Texte>
          {quotaEpuise && <Encart ton="avertissement">{t('coach.quota_epuise')}</Encart>}
          {profil && !profil.partage_objectifs_ia && <Encart>{t('coach.partage_desactive')}</Encart>}
          {(messages.data ?? []).map((m) => (
            <View key={m.id} style={[styles.bulle, m.role === 'utilisateur' ? styles.utilisateur : styles.coach]}>
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                {m.role === 'utilisateur' ? t('coach.vous') : t('coach.titre')}
              </Texte>
              <Texte>{m.contenu}</Texte>
            </View>
          ))}
          {erreur && <Encart ton="avertissement">{erreur}</Encart>}
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {t('coach.avertissement')}
          </Texte>
          {(messages.data ?? []).length > 0 && <Bouton titre={t('coach.effacer_historique')} variante="discret" onPress={effacer} />}
        </>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bulle: { borderRadius: rayon.l, padding: espace.m, gap: 2, maxWidth: '90%' },
  utilisateur: { alignSelf: 'flex-end', backgroundColor: couleurs.primaireClair },
  coach: { alignSelf: 'flex-start', backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure },
});
