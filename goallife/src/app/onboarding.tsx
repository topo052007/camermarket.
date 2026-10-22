import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Encart } from '@/components/Etats';
import { ChoixMultiple, ChoixUnique } from '@/components/Puces';
import { SelecteurHeure } from '@/components/Selecteurs';
import { Texte } from '@/components/Texte';
import { NOM_APP } from '@/config/env';
import { cles } from '@/data/cles';
import { cleErreur } from '@/data/erreurs';
import { majPrefsNotifications, majProfil } from '@/data/profil';
import { CATEGORIES, type CodeCategorie, type Devise, type Langue } from '@/domain/types';
import { LANGUES } from '@/i18n';
import { demanderPermission } from '@/notifications';
import { fuseauAppareil, langueAppareil, useI18n } from '@/providers/I18n';
import { useUtilisateurId } from '@/providers/Session';
import { couleurs, espace } from '@/theme';

const DEVISES: Devise[] = ['XAF', 'XOF', 'EUR', 'USD'];
const TOTAL = 5;

/** Parcours de première utilisation : 5 écrans courts, tout est facultatif sauf la fin. */
export default function Onboarding() {
  const { t } = useI18n();
  const client = useQueryClient();
  const userId = useUtilisateurId();
  const [etape, setEtape] = useState(1);
  const [prenom, setPrenom] = useState('');
  const [domaines, setDomaines] = useState<CodeCategorie[]>([]);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [rappel, setRappel] = useState<string | null>('19:00');
  const [langue, setLangue] = useState<Langue>(langueAppareil());
  const [devise, setDevise] = useState<Devise>('XAF');
  const fuseau = fuseauAppareil();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function terminer(versCreation: boolean) {
    setEnvoi(true);
    setErreur(null);
    try {
      if (rappel) await demanderPermission().catch(() => undefined);
      await majPrefsNotifications(userId, { actives: Boolean(rappel), heure_resume: rappel });
      await majProfil(userId, {
        prenom: prenom.trim() || null,
        domaines,
        minutes_par_jour: minutes,
        langue,
        devise,
        fuseau_horaire: fuseau,
        module_spiritualite: domaines.includes('spiritualite'),
        onboarding_termine_le: new Date().toISOString(),
      });
      await client.invalidateQueries({ queryKey: cles.profil });
      await client.invalidateQueries({ queryKey: cles.prefsNotifications });
      if (versCreation) router.replace('/objectifs/nouveau');
      else router.replace('/');
    } catch (e) {
      setErreur(t(cleErreur(e)));
    } finally {
      setEnvoi(false);
    }
  }

  const suivant = () => setEtape((e) => Math.min(TOTAL, e + 1));
  const passer = (
    <Bouton titre={t('commun.passer')} variante="discret" onPress={suivant} />
  );

  return (
    <Ecran
      bas={
        etape < TOTAL ? (
          <View style={{ gap: espace.s }}>
            <Bouton titre={t('commun.continuer')} onPress={suivant} />
            {etape > 1 && passer}
          </View>
        ) : (
          <View style={{ gap: espace.s }}>
            <Bouton titre={t('onb.commencer')} onPress={() => terminer(true)} chargement={envoi} />
            <Bouton titre={t('onb.plus_tard')} variante="discret" onPress={() => terminer(false)} desactive={envoi} />
          </View>
        )
      }
    >
      <View style={{ marginTop: espace.xxl }}>
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          {t('onb.etape', { n: etape, total: TOTAL })}
        </Texte>
      </View>

      {etape > 1 && <Bouton titre={t('commun.retour')} variante="discret" compact onPress={() => setEtape(etape - 1)} />}

      {etape === 1 && (
        <>
          <Texte variante="titre1">{t('onb.bienvenue_titre', { app: NOM_APP })}</Texte>
          <Texte>{t('onb.bienvenue_texte')}</Texte>
          <Champ libelle={t('onb.prenom_question')} placeholder={t('onb.prenom_placeholder')} value={prenom} onChangeText={setPrenom} maxLength={60} autoComplete="given-name" />
        </>
      )}

      {etape === 2 && (
        <>
          <Texte variante="titre2">{t('onb.domaines_question')}</Texte>
          <ChoixMultiple options={CATEGORIES.filter((c) => c !== 'autre').map((c) => ({ valeur: c, libelle: t(`cat.${c}`) }))} valeurs={domaines} onChange={setDomaines} />
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {t('onb.spiritualite_note')}
          </Texte>
        </>
      )}

      {etape === 3 && (
        <>
          <Texte variante="titre2">{t('onb.temps_question')}</Texte>
          <ChoixUnique
            options={[10, 20, 30, 60, 90].map((m) => ({ valeur: m as number | null, libelle: t('onb.temps_minutes', { nombre: m }) }))}
            valeur={minutes}
            onChange={setMinutes}
          />
        </>
      )}

      {etape === 4 && (
        <>
          <Texte variante="titre2">{t('onb.rappel_question')}</Texte>
          <ChoixUnique
            options={[
              { valeur: 'oui', libelle: t('commun.oui') },
              { valeur: 'non', libelle: t('onb.rappel_aucun') },
            ]}
            valeur={rappel ? 'oui' : 'non'}
            onChange={(v) => setRappel(v === 'oui' ? (rappel ?? '19:00') : null)}
          />
          {rappel && <SelecteurHeure valeur={rappel} onChange={setRappel} />}
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            {t('notif.non_garanti')}
          </Texte>
        </>
      )}

      {etape === 5 && (
        <>
          <Texte variante="titre2">{t('onb.reglages_titre')}</Texte>
          <Texte variante="libelle">{t('param.langue')}</Texte>
          <ChoixUnique options={LANGUES.map((l) => ({ valeur: l, libelle: t(`langue.${l}`) }))} valeur={langue} onChange={setLangue} />
          <Texte variante="libelle">{t('param.devise')}</Texte>
          <ChoixUnique options={DEVISES.map((d) => ({ valeur: d, libelle: t(`devise.${d}`) }))} valeur={devise} onChange={setDevise} />
          <Texte variante="libelle">{t('param.fuseau')}</Texte>
          <Texte couleur={couleurs.texteSecondaire}>{fuseau}</Texte>
          {erreur && <Encart ton="danger">{erreur}</Encart>}
        </>
      )}
    </Ecran>
  );
}
