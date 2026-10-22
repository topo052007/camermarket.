import { router } from 'expo-router';
import { useState } from 'react';
import { Share } from 'react-native';
import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { Ecran } from '@/components/Ecran';
import { Encart } from '@/components/Etats';
import { Section } from '@/components/Lignes';
import { Texte } from '@/components/Texte';
import { NOM_APP } from '@/config/env';
import { exporterDonnees, supprimerCompte } from '@/data/compte';
import { cleErreur } from '@/data/erreurs';
import { supabase } from '@/data/supabase';
import { useI18n } from '@/providers/I18n';
import { useSession } from '@/providers/Session';
import { couleurs } from '@/theme';

export default function Confidentialite() {
  const { t } = useI18n();
  const { session } = useSession();
  const [etape, setEtape] = useState<'texte' | 'confirmer'>('texte');
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [export_, setExport] = useState(false);
  const mot = t('conf.mot_confirmation');

  async function exporter() {
    setExport(true);
    setErreur(null);
    try {
      const donnees = await exporterDonnees();
      await Share.share({ title: t('conf.export_titre', { app: NOM_APP }), message: JSON.stringify(donnees, null, 2) });
    } catch (e) {
      setErreur(t(cleErreur(e)));
    } finally {
      setExport(false);
    }
  }

  async function supprimer() {
    setEnvoi(true);
    setErreur(null);
    try {
      await supprimerCompte();
      await supabase.auth.signOut({ scope: 'local' });
      router.replace('/');
    } catch {
      setErreur(t('conf.erreur_suppression'));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Ecran>
      {(['conf.p1', 'conf.p2', 'conf.p3', 'conf.p4'] as const).map((cle) => (
        <Texte key={cle}>{t(cle)}</Texte>
      ))}
      {erreur && <Encart ton="danger">{erreur}</Encart>}
      {session && (
        <>
          <Bouton titre={t('conf.exporter')} variante="secondaire" onPress={exporter} chargement={export_} />
          <Section titre={t('conf.supprimer_compte')}>
            <Texte couleur={couleurs.danger}>{t('conf.supprimer_texte')}</Texte>
            {etape === 'texte' ? (
              <Bouton titre={t('conf.supprimer_compte')} variante="danger" onPress={() => setEtape('confirmer')} />
            ) : (
              <>
                <Champ libelle={t('conf.taper', { mot })} value={saisie} onChangeText={setSaisie} autoCapitalize="characters" />
                <Bouton titre={t('conf.supprimer_compte')} variante="danger" onPress={supprimer} chargement={envoi} desactive={saisie.trim().toUpperCase() !== mot} />
                <Bouton titre={t('commun.annuler')} variante="discret" onPress={() => setEtape('texte')} />
              </>
            )}
          </Section>
        </>
      )}
    </Ecran>
  );
}
