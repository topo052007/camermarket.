import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Bouton } from '@/components/Bouton';
import { Carte } from '@/components/Carte';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart, EtatVide } from '@/components/Etats';
import { ChoixUnique } from '@/components/Puces';
import { Texte } from '@/components/Texte';
import { cles } from '@/data/cles';
import { cleErreur } from '@/data/erreurs';
import { reprendreObjectif, type OptionReprise } from '@/data/objectifs';
import { analyserRetard } from '@/domain/reprise';
import { useObjectif } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs } from '@/theme';

const DIFFICULTES = ['temps', 'fatigue', 'oubli', 'motivation', 'imprevu'] as const;
type Difficulte = (typeof DIFFICULTES)[number];
const JOURS_DECALAGE = 14;

/** Reprise après un retard : l'utilisateur choisit, rien n'est appliqué sans confirmation. */
export default function Reprise() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, aujourdhui } = useI18n();
  const client = useQueryClient();
  const { data: o, isLoading } = useObjectif(id);
  const [difficulte, setDifficulte] = useState<Difficulte | null>(null);
  const [option, setOption] = useState<OptionReprise | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  if (isLoading) return <Chargement />;
  if (!o) return <EtatVide titre={t('det.introuvable')} />;

  const analyse = analyserRetard(o.actions, aujourdhui(), Boolean(o.date_echeance));
  const options = analyse.options.length > 0 ? analyse.options : (['action_minimale', 'reduire_effort', 'nouveau_planning'] as OptionReprise[]);
  const description: Record<OptionReprise, string> = {
    action_minimale: t('rep.action_minimale_desc'),
    reduire_effort: t('rep.reduire_effort_desc'),
    decaler_echeance: t('rep.decaler_echeance_desc', { nombre: JOURS_DECALAGE }),
    nouveau_planning: t('rep.nouveau_planning_desc'),
  };

  async function appliquer() {
    if (!option || !o) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await reprendreObjectif(o.id, option, t('rep.titre_action_minimale', { titre: o.titre }), option === 'decaler_echeance' ? JOURS_DECALAGE : 7);
      await Promise.all([
        client.invalidateQueries({ queryKey: cles.objectif(o.id) }),
        client.invalidateQueries({ queryKey: cles.objectifs }),
        client.invalidateQueries({ queryKey: cles.actions }),
      ]);
      router.back();
    } catch (e) {
      setErreur(t(cleErreur(e)));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Ecran
      bas={
        <>
          {erreur && <Encart ton="danger">{erreur}</Encart>}
          <Bouton titre={t('rep.appliquer')} onPress={appliquer} chargement={envoi} desactive={!option} />
        </>
      }
    >
      <Texte variante="titre2">{o.titre}</Texte>
      <Texte>{t('rep.intro', { nombre: analyse.manquees })}</Texte>

      <Texte variante="libelle">{t('rep.bilan_question')}</Texte>
      <ChoixUnique
        options={DIFFICULTES.map((d) => ({ valeur: d as Difficulte | null, libelle: t(`rep.diff_${d}`) }))}
        valeur={difficulte}
        onChange={setDifficulte}
      />
      {(difficulte === 'temps' || difficulte === 'fatigue') && <Encart>{t('rep.conseil_temps')}</Encart>}
      {difficulte === 'oubli' && <Encart>{t('rep.conseil_oubli')}</Encart>}

      {options.map((op) => (
        <Carte key={op} onPress={() => setOption(op)} style={option === op ? { borderColor: couleurs.primaire, borderWidth: 2 } : undefined}>
          <Texte variante="libelle" couleur={option === op ? couleurs.primaire : couleurs.texte}>
            {t(`rep.${op}`)}
          </Texte>
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {description[op]}
          </Texte>
        </Carte>
      ))}
      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
        {t('rep.note')}
      </Texte>
    </Ecran>
  );
}
