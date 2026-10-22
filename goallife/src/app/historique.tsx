import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BandeauConnexion } from '@/components/Ecran';
import { Chargement, EtatErreur, EtatVide } from '@/components/Etats';
import { Texte } from '@/components/Texte';
import type { EntreeHistorique } from '@/data/historique';
import type { StatutAction } from '@/domain/types';
import { useHistorique } from '@/hooks/donnees';
import { useI18n } from '@/providers/I18n';
import { couleurs, espace } from '@/theme';

export default function Historique() {
  const { t, quantite } = useI18n();
  const historique = useHistorique();

  const libelle = (e: EntreeHistorique): string => {
    if (e.genre === 'evenement') {
      return e.type === 'contribution'
        ? t('hist.contribution', { quantite: quantite(e.valeur ?? 0, e.unite), titre: e.titre })
        : t('hist.reprise', { titre: e.titre });
    }
    if (e.ancien == null) return t('hist.cree', { titre: e.titre });
    return t('hist.changement', { titre: e.titre, statut: t(`statut_action.${e.nouveau as StatutAction}`) });
  };

  if (historique.isLoading) return <Chargement />;
  if (historique.isError && !historique.data) return <EtatErreur erreur={historique.error} onReessayer={() => void historique.refetch()} />;

  // On n'affiche pas les créations automatiques d'actions (trop nombreuses) : seulement ce que l'utilisateur a fait.
  const lignes = (historique.data ?? []).filter((e) => e.genre === 'evenement' || e.ancien != null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: couleurs.fond }} edges={['bottom']}>
      <BandeauConnexion />
      <FlatList
        data={lignes}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: espace.l, gap: espace.m }}
        onRefresh={() => void historique.refetch()}
        refreshing={historique.isRefetching}
        ListEmptyComponent={<EtatVide titre={t('hist.vide')} />}
        renderItem={({ item }) => (
          <View style={{ gap: 2 }}>
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              {new Date(item.date).toLocaleString()}
            </Texte>
            <Texte>{libelle(item)}</Texte>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
