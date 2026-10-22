import { View } from 'react-native';
import { Carte } from '@/components/Carte';
import { Puce } from '@/components/Puces';
import { Texte } from '@/components/Texte';
import { cleTitreModele, modelesDisponibles, type ModeleObjectif } from '@/domain/modeles';
import { CATEGORIES } from '@/domain/types';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';

/** Exemples d'objectifs par domaine : un toucher pré-remplit le formulaire. */
export function ChoixModele({ moduleSpiritualite, onChoisir }: { moduleSpiritualite: boolean; onChoisir: (m: ModeleObjectif) => void }) {
  const { t } = useI18n();
  const modeles = modelesDisponibles(moduleSpiritualite);
  return (
    <Carte>
      <Texte variante="titre3">{t('form.modeles')}</Texte>
      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
        {t('form.modeles_aide')}
      </Texte>
      {CATEGORIES.map((c) => {
        const duDomaine = modeles.filter((m) => m.categorie === c);
        if (duDomaine.length === 0) return null;
        return (
          <View key={c} style={{ gap: espace.xs, marginTop: espace.s }}>
            <Texte variante="libelle" couleur={couleurs.texteSecondaire}>
              {t(`cat.${c}`)}
            </Texte>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espace.s }}>
              {duDomaine.map((m) => (
                <Puce key={m.id} libelle={t(cleTitreModele(m))} choisie={false} onPress={() => onChoisir(m)} />
              ))}
            </View>
          </View>
        );
      })}
    </Carte>
  );
}
