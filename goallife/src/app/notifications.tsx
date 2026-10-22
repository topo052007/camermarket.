import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Ecran } from '@/components/Ecran';
import { Chargement, Encart } from '@/components/Etats';
import { LigneReglage } from '@/components/Lignes';
import { ChoixUnique } from '@/components/Puces';
import { SelecteurHeure, SelecteurJours } from '@/components/Selecteurs';
import { Texte } from '@/components/Texte';
import { cles } from '@/data/cles';
import { cleErreur } from '@/data/erreurs';
import { majPrefsNotifications } from '@/data/profil';
import type { PreferencesNotifications } from '@/domain/types';
import { usePrefsNotifications } from '@/hooks/donnees';
import { demanderPermission, etatPermission, nombreRappelsProgrammes, notificationsDisponibles } from '@/notifications';
import { useI18n } from '@/providers/I18n';
import { useUtilisateurId } from '@/providers/Session';
import { couleurs, espace } from '@/theme';

type Brouillon = Omit<PreferencesNotifications, 'user_id'>;

export default function Notifications() {
  const { t } = useI18n();
  const { data: prefs } = usePrefsNotifications();
  if (!notificationsDisponibles) {
    return (
      <Ecran>
        <Encart>{t('notif.web_indisponible')}</Encart>
      </Ecran>
    );
  }
  if (!prefs) return <Chargement />;
  const { user_id: _ignore, ...reste } = prefs;
  return (
    <Formulaire
      initial={{
        ...reste,
        heure_resume: reste.heure_resume?.slice(0, 5) ?? null,
        silence_debut: reste.silence_debut?.slice(0, 5) ?? null,
        silence_fin: reste.silence_fin?.slice(0, 5) ?? null,
      }}
    />
  );
}

function Formulaire({ initial }: { initial: Brouillon }) {
  const { t } = useI18n();
  const client = useQueryClient();
  const userId = useUtilisateurId();
  const permission = useQuery({ queryKey: ['permission-notifications'], queryFn: etatPermission, gcTime: 0 });
  const programmes = useQuery({ queryKey: ['rappels-programmes'], queryFn: nombreRappelsProgrammes, gcTime: 0 });
  const [b, setB] = useState<Brouillon>(initial);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const maj = (champs: Partial<Brouillon>) => setB({ ...b, ...champs });

  async function activer(v: boolean) {
    if (v) {
      const etat = await demanderPermission();
      void permission.refetch();
      if (etat !== 'accordee') return;
    }
    maj({ actives: v });
  }

  async function enregistrer() {
    setEnvoi(true);
    setMessage(null);
    try {
      await majPrefsNotifications(userId, b);
      await client.invalidateQueries({ queryKey: cles.prefsNotifications });
      // Les rappels sont reprogrammés automatiquement (useSynchroRappels) ; on rafraîchit le compteur.
      setTimeout(() => void programmes.refetch(), 1500);
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
      {permission.data === 'refusee' && (
        <Encart ton="avertissement">
          <Texte couleur={couleurs.avertissement}>{t('notif.permission_refusee')}</Texte>
          <Bouton titre={t('notif.ouvrir_reglages')} variante="discret" compact onPress={() => void Linking.openSettings()} />
        </Encart>
      )}
      <LigneReglage titre={t('notif.activer')} valeur={b.actives} onChange={(v) => void activer(v)} desactive={permission.data === 'refusee'} />

      {b.actives && (
        <>
          <View style={{ gap: espace.s }}>
            <Texte variante="libelle">{t('notif.resume')}</Texte>
            <ChoixUnique
              options={[
                { valeur: 'oui', libelle: t('commun.oui') },
                { valeur: 'non', libelle: t('notif.aucun') },
              ]}
              valeur={b.heure_resume ? 'oui' : 'non'}
              onChange={(v) => maj({ heure_resume: v === 'oui' ? '19:00' : null })}
            />
            {b.heure_resume && <SelecteurHeure valeur={b.heure_resume} onChange={(h) => maj({ heure_resume: h })} />}
          </View>
          {b.heure_resume && (
            <View style={{ gap: espace.s }}>
              <Texte variante="libelle">{t('notif.jours')}</Texte>
              <SelecteurJours jours={b.jours} onChange={(j) => maj({ jours: j })} />
            </View>
          )}
          <View style={{ gap: espace.s }}>
            <Texte variante="libelle">{t('notif.silence')}</Texte>
            <SelecteurHeure valeur={b.silence_debut} onChange={(h) => maj({ silence_debut: h })} />
            <SelecteurHeure valeur={b.silence_fin} onChange={(h) => maj({ silence_fin: h })} />
            {b.silence_debut && b.silence_fin && (
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                {t('notif.silence_desc', { debut: b.silence_debut, fin: b.silence_fin })}
              </Texte>
            )}
          </View>
          <LigneReglage titre={t('notif.discretes')} description={t('notif.discretes_desc')} valeur={b.discretes} onChange={(v) => maj({ discretes: v })} />
          <LigneReglage titre={t('notif.bilan')} valeur={b.bilan_hebdomadaire} onChange={(v) => maj({ bilan_hebdomadaire: v })} />
        </>
      )}

      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
        {t('notif.programmes', { nombre: programmes.data ?? 0 })}
      </Texte>
      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
        {t('notif.par_objectif')}
      </Texte>
      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
        {t('notif.non_garanti')}
      </Texte>
    </Ecran>
  );
}
