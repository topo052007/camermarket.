import { View } from 'react-native';
import type { Progression } from '@/domain/progression';
import type { Unite } from '@/domain/types';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';
import { BarreProgression } from './BarreProgression';
import { Texte } from './Texte';

/** Affiche une progression selon son mode, sans jamais inventer de pourcentage. */
export function ResumeProgression({ progression, unite }: { progression: Progression; unite: Unite | null }) {
  const { t, quantite } = useI18n();
  switch (progression.mode) {
    case 'quantite':
      return (
        <View style={{ gap: espace.xs }}>
          <BarreProgression pourcentage={progression.pourcentage} />
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {progression.pourcentage} % · {t('det.atteint', { atteint: quantite(progression.atteint, unite), cible: quantite(progression.cible, unite) })}
          </Texte>
        </View>
      );
    case 'etapes':
      return (
        <View style={{ gap: espace.xs }}>
          <BarreProgression pourcentage={progression.pourcentage} />
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {t('det.etapes_progress', { terminees: progression.terminees, total: progression.total })}
          </Texte>
        </View>
      );
    case 'regularite':
      return progression.pourcentage == null ? (
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          {t('det.pas_de_mesure')}
        </Texte>
      ) : (
        <View style={{ gap: espace.xs }}>
          <BarreProgression pourcentage={progression.pourcentage} couleur={couleurs.accent} />
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {t('det.regularite', { terminees: progression.terminees, prevues: progression.prevues })}
          </Texte>
        </View>
      );
    case 'aucun':
      return (
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          {t('det.pas_de_mesure')}
        </Texte>
      );
  }
}
