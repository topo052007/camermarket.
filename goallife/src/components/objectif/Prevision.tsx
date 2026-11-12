import { View } from 'react-native';
import { Texte } from '@/components/Texte';
import type { Prevision } from '@/domain/prevision';
import type { Unite } from '@/domain/types';
import { useI18n } from '@/providers/I18n';
import { couleurs } from '@/theme';

/** Estimation de la date d'atteinte, clairement présentée comme une estimation. */
export function ResumePrevision({ prevision, unite }: { prevision: Prevision; unite: Unite | null }) {
  const { t, quantite, date } = useI18n();
  if (prevision.etat === 'atteint') return null;
  return (
    <View style={{ gap: 2 }}>
      <Texte variante="libelle" couleur={couleurs.texteSecondaire}>
        {t('prev.titre')}
      </Texte>
      {prevision.etat === 'pas_assez_de_donnees' ? (
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          {t('prev.pas_assez')}
        </Texte>
      ) : (
        <>
          <Texte variante="petit">
            {t('prev.estimee', { quantite: quantite(Math.round(prevision.rythmeParJour), unite), date: date(prevision.dateEstimee) })}
          </Texte>
          {prevision.avance != null && (
            <Texte variante="petit" couleur={prevision.avance < 0 ? couleurs.avertissement : couleurs.succes}>
              {prevision.avance > 0
                ? t('prev.avance', { nombre: prevision.avance })
                : prevision.avance < 0
                  ? t('prev.retard', { nombre: -prevision.avance })
                  : t('prev.a_temps')}
            </Texte>
          )}
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {t('prev.note')}
          </Texte>
        </>
      )}
    </View>
  );
}
