import { useEffect } from 'react';
import { planifierRappels } from '@/domain/rappels';
import { useObjectifs, usePrefsNotifications } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { ajouterJours } from '@/domain/dates';
import { reprogrammerRappels } from './index';

/** Reprogramme les rappels locaux à chaque changement des objectifs ou des préférences. */
export function useSynchroRappels(): void {
  const { t, aujourdhui } = useI18n();
  const { data: prefs } = usePrefsNotifications();
  const { data: objectifs } = useObjectifs(ajouterJours(aujourdhui(), -60));

  useEffect(() => {
    if (!prefs || !objectifs) return;
    const rappels = planifierRappels(
      prefs,
      objectifs.map((o) => ({
        ...o,
        jours: [...new Set(o.recurrences.filter((r) => r.active).flatMap((r) => r.jours_semaine))],
      })),
      t,
    );
    void reprogrammerRappels(rappels).catch(() => undefined);
  }, [prefs, objectifs, t]);
}
