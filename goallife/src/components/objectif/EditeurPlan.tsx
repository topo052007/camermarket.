import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Carte } from '@/components/Carte';
import { Champ, ChampNombre } from '@/components/Champ';
import { Bouton } from '@/components/Bouton';
import { Encart } from '@/components/Etats';
import { Section } from '@/components/Lignes';
import { SelecteurJours } from '@/components/Selecteurs';
import { Texte } from '@/components/Texte';
import type { Explication, PlanPropose } from '@/domain/plan';
import type { Unite } from '@/domain/types';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace, TACTILE_MIN } from '@/theme';

/** Aperçu modifiable d'un plan, avant activation. */
export function EditeurPlan({ plan, unite, onChange }: { plan: PlanPropose; unite: Unite | null; onChange: (p: PlanPropose) => void }) {
  const { t, quantite, date } = useI18n();

  const texteExplication = (e: Explication) =>
    'texte' in e
      ? e.texte
      : t(e.cle, {
          ...(e.quantite != null ? { quantite: quantite(e.quantite, e.unite ?? null) } : {}),
          ...(e.nombre != null ? { nombre: e.nombre } : {}),
        });

  const majRecurrence = (i: number, champs: Partial<PlanPropose['recurrences'][number]>) =>
    onChange({ ...plan, recurrences: plan.recurrences.map((r, j) => (j === i ? { ...r, ...champs } : r)) });
  const majEtape = (i: number, titre: string) => onChange({ ...plan, etapes: plan.etapes.map((e, j) => (j === i ? { ...e, titre } : e)) });
  const supprimerEtape = (i: number) => onChange({ ...plan, etapes: plan.etapes.filter((_, j) => j !== i) });
  const ajouterEtape = () => onChange({ ...plan, etapes: [...plan.etapes, { titre: t('plan.nouvelle_etape'), dateCible: null, valeurCible: null }] });

  return (
    <View style={{ gap: espace.l }}>
      <Encart ton={plan.source === 'ia' ? 'avertissement' : 'info'}>{plan.source === 'ia' ? t('plan.source_ia') : t('plan.source_regles')}</Encart>

      <Carte>
        {plan.explications.map((e, i) => (
          <Texte key={i}>• {texteExplication(e)}</Texte>
        ))}
      </Carte>

      <Section titre={t('plan.seances')}>
        {plan.recurrences.map((r, i) => (
          <Carte key={i}>
            <Champ libelle={t('act.titre')} value={r.titre} onChangeText={(v) => majRecurrence(i, { titre: v })} maxLength={160} />
            <SelecteurJours jours={r.joursSemaine} onChange={(v) => majRecurrence(i, { joursSemaine: v })} />
            {r.quantite != null && (
              <ChampNombre
                libelle={t('plan.par_seance')}
                valeur={r.quantite}
                aide={quantite(r.quantite, unite)}
                onValide={(n) => majRecurrence(i, { quantite: n })}
              />
            )}
            {r.minutes != null && (
              <ChampNombre libelle={t('form.minutes_seance')} valeur={r.minutes} entier max={600} onValide={(n) => majRecurrence(i, { minutes: n })} />
            )}
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              {r.dateFin ? t('plan.jusqu_au', { date: date(r.dateFin) }) : t('plan.sans_fin')}
            </Texte>
          </Carte>
        ))}
      </Section>

      <Section titre={t('plan.etapes')}>
        {plan.etapes.map((e, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: espace.s }}>
            <View style={{ flex: 1 }}>
              <Champ
                libelle={e.dateCible ? date(e.dateCible) : `${i + 1}`}
                value={e.titre}
                onChangeText={(v) => majEtape(i, v)}
                maxLength={160}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('commun.supprimer')}
              onPress={() => supprimerEtape(i)}
              style={{ width: TACTILE_MIN, height: TACTILE_MIN, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="trash-outline" size={20} color={couleurs.danger} />
            </Pressable>
          </View>
        ))}
        <Bouton titre={t('plan.ajouter_etape')} variante="discret" onPress={ajouterEtape} />
      </Section>
    </View>
  );
}
