import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Ecran } from '@/components/Ecran';
import { Encart } from '@/components/Etats';
import { EditeurPlan } from '@/components/objectif/EditeurPlan';
import { DUREE_PERSO, FormulaireObjectif, type BrouillonObjectif } from '@/components/objectif/FormulaireObjectif';
import { Texte } from '@/components/Texte';
import { HORIZON_JOURS } from '@/config/env';
import { cles } from '@/data/cles';
import { demanderPlanIa, statutCoach } from '@/data/coach';
import { cleErreur } from '@/data/erreurs';
import { creerObjectifAvecPlan } from '@/data/objectifs';
import { ajouterJours } from '@/domain/dates';
import { peutCreerObjectif, LIMITES } from '@/domain/offres';
import { genererPlan, type PlanPropose } from '@/domain/plan';
import { joursParDefaut } from '@/domain/recurrence';
import { erreursParChamp, lireNombre, schemaObjectif, type SaisieObjectif } from '@/domain/validation';
import { useAbonnement, useObjectifs, useProfil } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs } from '@/theme';

export default function NouvelObjectif() {
  const { t, langue, aujourdhui, quantite } = useI18n();
  const client = useQueryClient();
  const { data: profil } = useProfil();
  const { offre } = useAbonnement();
  const objectifs = useObjectifs(ajouterJours(aujourdhui(), -60));
  const statut = useQuery({ queryKey: cles.coachStatut, queryFn: statutCoach, retry: 0 });

  const [brouillon, setBrouillon] = useState<BrouillonObjectif>({
    type: 'quantitatif',
    titre: '',
    description: '',
    categorie: profil?.domaines[0] ?? 'finances',
    unite: 'argent',
    cible: '',
    deja: '',
    debutDemain: false,
    duree: 30,
    dureePerso: '',
    jours: [1, 2, 3, 4, 5, 6, 7],
    minutes: profil?.minutes_par_jour ? String(profil.minutes_par_jour) : '',
    quantiteSeance: '',
    priorite: 2,
    rappelActif: false,
    rappelHeure: '19:00',
  });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [saisie, setSaisie] = useState<SaisieObjectif | null>(null);
  const [planRegles, setPlanRegles] = useState<PlanPropose | null>(null);
  const [plan, setPlan] = useState<PlanPropose | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargementIa, setChargementIa] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const actifs = (objectifs.data ?? []).filter((o) => o.statut === 'actif').length;
  const limiteAtteinte = !peutCreerObjectif(offre, actifs);

  function changerBrouillon(b: BrouillonObjectif) {
    // Valeurs par défaut adaptées au type choisi.
    if (b.type !== brouillon.type) {
      if (b.type === 'recurrent') b = { ...b, jours: joursParDefaut(3), unite: null };
      if (b.type === 'quantitatif') b = { ...b, jours: [1, 2, 3, 4, 5, 6, 7], unite: 'argent' };
      if (b.type === 'echeance') b = { ...b, jours: joursParDefaut(2), unite: null };
    }
    setBrouillon(b);
  }

  function construireSaisie(): SaisieObjectif | null {
    const b = brouillon;
    const debut = b.debutDemain ? ajouterJours(aujourdhui(), 1) : aujourdhui();
    const duree = b.duree === DUREE_PERSO ? lireNombre(b.dureePerso) : b.duree;
    const brut = {
      titre: b.titre,
      description: b.description.trim() || null,
      categorie: b.categorie,
      type: b.type,
      priorite: b.priorite,
      dateDebut: debut,
      dateEcheance: duree && duree > 0 ? ajouterJours(debut, Math.round(duree) - 1) : null,
      valeurCible: b.type === 'quantitatif' ? lireNombre(b.cible) : null,
      valeurInitiale: b.type === 'quantitatif' ? (lireNombre(b.deja) ?? 0) : 0,
      unite: b.type === 'echeance' ? null : b.unite,
      jours: b.jours,
      minutesParSeance: lireNombre(b.minutes) ? Math.round(lireNombre(b.minutes)!) : null,
      quantiteParSeance: b.type === 'recurrent' ? lireNombre(b.quantiteSeance) : null,
      rappelActif: b.rappelActif,
      rappelHeure: b.rappelActif ? b.rappelHeure : null,
    };
    const r = schemaObjectif.safeParse(brut);
    if (!r.success) {
      setErreurs(erreursParChamp(r.error));
      return null;
    }
    setErreurs({});
    return r.data;
  }

  function voirPlan() {
    setErreur(null);
    const s = construireSaisie();
    if (!s) return;
    const r = genererPlan(
      {
        titre: s.titre,
        categorie: s.categorie,
        type: s.type,
        dateDebut: s.dateDebut,
        dateEcheance: s.dateEcheance,
        valeurCible: s.valeurCible,
        valeurInitiale: s.valeurInitiale,
        unite: s.unite,
        jours: s.jours,
        minutesParSeance: s.minutesParSeance,
        quantiteParSeance: s.quantiteParSeance,
      },
      { t, quantite },
    );
    if (!r.ok) return setErreur(t(r.erreur));
    setSaisie(s);
    setPlanRegles(r.plan);
    setPlan(r.plan);
  }

  async function proposerIa() {
    if (!saisie) return;
    setChargementIa(true);
    setErreur(null);
    try {
      const r = await demanderPlanIa(saisie, langue);
      if (r.ok) setPlan(r.plan);
      else setErreur(r.raison === 'quota_epuise' ? t('coach.quota_epuise') : r.raison === 'non_configuree' ? t('plan.ia_non_configuree') : t('coach.erreur'));
    } catch {
      setErreur(t('coach.erreur'));
    } finally {
      setChargementIa(false);
      void client.invalidateQueries({ queryKey: cles.coachStatut });
    }
  }

  async function activer() {
    if (!saisie || !plan) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const id = await creerObjectifAvecPlan(saisie, plan, ajouterJours(aujourdhui(), HORIZON_JOURS));
      await Promise.all([
        client.invalidateQueries({ queryKey: cles.objectifs }),
        client.invalidateQueries({ queryKey: cles.actions }),
      ]);
      Alert.alert(t('plan.cree'));
      router.replace(`/objectifs/${id}`);
    } catch (e) {
      setErreur(t(cleErreur(e)));
    } finally {
      setEnvoi(false);
    }
  }

  if (plan && saisie) {
    return (
      <Ecran
        bas={
          <>
            {erreur && <Encart ton="danger">{erreur}</Encart>}
            <Bouton titre={t('plan.activer')} onPress={activer} chargement={envoi} desactive={plan.recurrences.some((r) => r.joursSemaine.length === 0)} />
            <Bouton titre={t('commun.modifier')} variante="discret" onPress={() => setPlan(null)} />
          </>
        }
      >
        <Texte variante="titre2">{saisie.titre}</Texte>
        <EditeurPlan plan={plan} unite={saisie.unite} onChange={setPlan} />
        {statut.data?.ia_configuree ? (
          plan.source === 'ia' ? (
            <Bouton titre={t('plan.revenir_regles')} variante="secondaire" onPress={() => setPlan(planRegles)} />
          ) : (
            <View>
              <Bouton titre={chargementIa ? t('plan.ia_en_cours') : t('plan.proposer_ia')} variante="secondaire" onPress={proposerIa} chargement={chargementIa} />
            </View>
          )
        ) : (
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {t('plan.ia_non_configuree')}
          </Texte>
        )}
      </Ecran>
    );
  }

  return (
    <Ecran
      bas={
        <>
          {erreur && <Encart ton="danger">{erreur}</Encart>}
          {limiteAtteinte && (
            <Encart ton="avertissement">
              <Texte couleur={couleurs.avertissement}>{t('obj.limite_atteinte', { max: LIMITES[offre].maxObjectifsActifs })}</Texte>
              <Bouton titre={t('obj.voir_offres')} variante="discret" compact onPress={() => router.push('/abonnement')} />
            </Encart>
          )}
          <Bouton titre={t('form.generer_plan')} onPress={voirPlan} desactive={limiteAtteinte} />
        </>
      }
    >
      <FormulaireObjectif brouillon={brouillon} onChange={changerBrouillon} erreurs={erreurs} moduleSpiritualite={profil?.module_spiritualite ?? false} />
    </Ecran>
  );
}
