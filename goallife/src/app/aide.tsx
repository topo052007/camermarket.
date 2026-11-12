import { Carte } from '@/components/Carte';
import { Ecran } from '@/components/Ecran';
import { Texte } from '@/components/Texte';
import { useI18n } from '@/providers/I18n';
import { couleurs } from '@/theme';

export default function Aide() {
  const { t } = useI18n();
  return (
    <Ecran>
      {([1, 2, 3, 4] as const).map((n) => (
        <Carte key={n}>
          <Texte variante="libelle">{t(`aide.q${n}`)}</Texte>
          <Texte couleur={couleurs.texteSecondaire}>{t(`aide.r${n}`)}</Texte>
        </Carte>
      ))}
    </Ecran>
  );
}
