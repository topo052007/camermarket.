import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart } from '@/components/Etats';
import { LigneReglage } from '@/components/Lignes';
import { ChoixMultiple, ChoixUnique } from '@/components/Puces';
import { Texte } from '@/components/Texte';
import { cles } from '@/data/cles';
import { cleErreur } from '@/data/erreurs';
import { majProfil, type MajProfil, type ProfilComplet } from '@/data/profil';
import { CATEGORIES, type Devise } from '@/domain/types';
import { LANGUES } from '@/i18n';
import { fuseauAppareil, useI18n } from '@/providers/I18n';
import { useProfil } from '@/hooks/donnees';
import { couleurs, espace } from '@/theme';

const DEVISES: Devise[] = ['XAF', 'XOF', 'EUR', 'USD'];
const FUSEAUX = ['Africa/Douala', 'Africa/Abidjan', 'Africa/Dakar', 'Africa/Lagos', 'Africa/Kinshasa', 'Africa/Nairobi', 'Europe/Paris', 'UTC'];

export default function Parametres() {
  const { data: profil } = useProfil();
  if (!profil) return <Chargement />;
  return <Formulaire profil={profil} />;
}

function Formulaire({ profil }: { profil: ProfilComplet }) {
  const { t } = useI18n();
  const client = useQueryClient();
  const [brouillon, setBrouillon] = useState<MajProfil>({
    prenom: profil.prenom,
    langue: profil.langue,
    devise: profil.devise,
    fuseau_horaire: profil.fuseau_horaire,
    minutes_par_jour: profil.minutes_par_jour,
    domaines: profil.domaines,
    module_spiritualite: profil.module_spiritualite,
    partage_objectifs_ia: profil.partage_objectifs_ia,
  });
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const b = brouillon;
  const maj = (champs: MajProfil) => setBrouillon({ ...b, ...champs });
  const fuseauTel = fuseauAppareil();
  const fuseaux = [...new Set([fuseauTel, b.fuseau_horaire ?? profil.fuseau_horaire, ...FUSEAUX])];

  async function enregistrer() {
    setEnvoi(true);
    setMessage(null);
    try {
      await majProfil(profil.id, { ...b, prenom: b.prenom?.trim() || null });
      await client.invalidateQueries({ queryKey: cles.profil });
      setMessage({ ton: 'succes', texte: t('commun.enregistre') });
    } catch (e) {
      setMessage({ ton: 'danger', texte: t(cleErreur(e)) });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Ecran
      bas={
        <>
          {message && <Encart ton={message.ton}>{message.texte}</Encart>}
          <Bouton titre={t('commun.enregistrer')} onPress={enregistrer} chargement={envoi} />
        </>
      }
    >
      <Champ libelle={t('profil.prenom')} value={b.prenom ?? ''} onChangeText={(v) => maj({ prenom: v })} maxLength={60} />
      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('param.langue')}</Texte>
        <ChoixUnique options={LANGUES.map((l) => ({ valeur: l, libelle: t(`langue.${l}`) }))} valeur={b.langue ?? 'fr'} onChange={(v) => maj({ langue: v })} />
      </View>
      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('param.devise')}</Texte>
        <ChoixUnique options={DEVISES.map((d) => ({ valeur: d, libelle: t(`devise.${d}`) }))} valeur={b.devise ?? 'XAF'} onChange={(v) => maj({ devise: v })} />
      </View>
      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('param.fuseau')}</Texte>
        <ChoixUnique options={fuseaux.map((f) => ({ valeur: f, libelle: f }))} valeur={b.fuseau_horaire ?? profil.fuseau_horaire} onChange={(v) => maj({ fuseau_horaire: v })} />
        {fuseauTel !== b.fuseau_horaire && (
          <Bouton titre={t('param.fuseau_appareil', { fuseau: fuseauTel })} variante="discret" compact onPress={() => maj({ fuseau_horaire: fuseauTel })} />
        )}
      </View>
      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('param.temps')}</Texte>
        <ChoixUnique
          options={[10, 20, 30, 60, 90].map((m) => ({ valeur: m as number | null, libelle: t('onb.temps_minutes', { nombre: m }) }))}
          valeur={b.minutes_par_jour ?? null}
          onChange={(v) => maj({ minutes_par_jour: v })}
        />
      </View>
      <View style={{ gap: espace.s }}>
        <Texte variante="libelle">{t('param.domaines')}</Texte>
        <ChoixMultiple
          options={CATEGORIES.filter((c) => c !== 'autre' && (c !== 'spiritualite' || b.module_spiritualite)).map((c) => ({ valeur: c, libelle: t(`cat.${c}`) }))}
          valeurs={b.domaines ?? []}
          onChange={(v) => maj({ domaines: v })}
        />
      </View>
      <LigneReglage
        titre={t('param.spiritualite')}
        description={t('param.spiritualite_desc')}
        valeur={b.module_spiritualite ?? false}
        onChange={(v) => maj({ module_spiritualite: v, domaines: v ? b.domaines : (b.domaines ?? []).filter((d) => d !== 'spiritualite') })}
      />
      <LigneReglage titre={t('param.partage_ia')} description={t('param.partage_ia_desc')} valeur={b.partage_objectifs_ia ?? true} onChange={(v) => maj({ partage_objectifs_ia: v })} />
      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
        {t('notif.par_objectif')}
      </Texte>
    </Ecran>
  );
}
