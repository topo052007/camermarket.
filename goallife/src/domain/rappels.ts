import type { Traduire } from '@/i18n';
import { formaterHeure, minutesDepuisMinuit } from './dates';
import { normaliserJours } from './recurrence';
import { CATEGORIES_SENSIBLES, type Objectif, type PreferencesNotifications } from './types';

// Calcule la liste des rappels LOCAUX à programmer sur l'appareil (fonction pure, testée).
// src/notifications/ se charge ensuite de les programmer avec expo-notifications.

export const MAX_RAPPELS = 50; // iOS limite à 64 notifications programmées par application

export type RappelPlanifie = {
  cle: string;
  titre: string;
  corps: string;
  jourIso: number; // 1 = lundi … 7 = dimanche
  heure: number;
  minute: number;
  objectifId: string | null;
};

export type ObjectifAvecJours = Pick<Objectif, 'id' | 'titre' | 'categorie' | 'statut' | 'rappel_actif' | 'rappel_heure'> & {
  jours: number[];
};

/** Déplace une heure tombant dans la période silencieuse à la fin de cette période. */
export function horsPeriodeSilencieuse(minutes: number, debut: string | null, fin: string | null): number {
  const d = minutesDepuisMinuit(debut);
  const f = minutesDepuisMinuit(fin);
  if (d == null || f == null || d === f) return minutes;
  const dedans = d < f ? minutes >= d && minutes < f : minutes >= d || minutes < f;
  return dedans ? f : minutes;
}

/** expo-notifications (déclencheur WEEKLY) : 1 = dimanche … 7 = samedi. */
export function versJourExpo(jourIso: number): number {
  return jourIso === 7 ? 1 : jourIso + 1;
}

export function planifierRappels(
  prefs: PreferencesNotifications | null,
  objectifs: ObjectifAvecJours[],
  t: Traduire,
): RappelPlanifie[] {
  if (!prefs || !prefs.actives) return [];
  const rappels: RappelPlanifie[] = [];
  const ajouter = (r: Omit<RappelPlanifie, 'heure' | 'minute'> & { minutes: number }) => {
    const m = horsPeriodeSilencieuse(r.minutes, prefs.silence_debut, prefs.silence_fin);
    const [heure, minute] = formaterHeure(m).split(':').map(Number) as [number, number];
    rappels.push({ cle: r.cle, titre: r.titre, corps: r.corps, jourIso: r.jourIso, objectifId: r.objectifId, heure, minute });
  };

  const resume = minutesDepuisMinuit(prefs.heure_resume);
  if (resume != null) {
    for (const jour of normaliserJours(prefs.jours)) {
      ajouter({
        cle: `resume-${jour}`,
        titre: t('notif.resume_titre'),
        corps: t('notif.resume_corps'),
        jourIso: jour,
        objectifId: null,
        minutes: resume,
      });
    }
  }

  if (prefs.bilan_hebdomadaire) {
    ajouter({ cle: 'bilan', titre: t('notif.bilan_titre'), corps: t('notif.bilan_corps'), jourIso: 7, objectifId: null, minutes: 18 * 60 });
  }

  for (const o of objectifs) {
    if (o.statut !== 'actif' || !o.rappel_actif) continue;
    const minutes = minutesDepuisMinuit(o.rappel_heure);
    if (minutes == null) continue;
    const discret = prefs.discretes || CATEGORIES_SENSIBLES.includes(o.categorie);
    for (const jour of normaliserJours(o.jours)) {
      ajouter({
        cle: `obj-${o.id}-${jour}`,
        titre: discret ? t('notif.discret_titre') : o.titre,
        corps: discret ? t('notif.discret_corps') : t('notif.objectif_corps'),
        jourIso: jour,
        objectifId: o.id,
        minutes,
      });
    }
  }

  return rappels.slice(0, MAX_RAPPELS);
}
