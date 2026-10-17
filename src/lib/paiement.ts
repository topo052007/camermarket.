// Confirmation d'un paiement. Appelée à la fois par la notification CinetPay et par la page
// de retour : elle peut donc être exécutée deux fois pour la même commande sans risque.

import { verifierPaiement } from "./cinetpay";
import { livrerCommande } from "./livraison";
import { supabaseAdmin } from "./supabase-admin";

export type ResultatPaiement = "payee" | "en_attente" | "echec" | "introuvable";

const statutsDejaPayes = ["payee", "en_preparation", "expediee", "livree"];

// Le paiement est confirmé même si l'e-mail échoue : l'erreur est notée, et l'envoi sera
// retenté à la prochaine confirmation (nouvelle notification CinetPay, page de retour
// rechargée). Le client peut aussi accéder à son achat depuis la page de retour.
async function livrerSansBloquer(commandeId: string): Promise<void> {
  try {
    await livrerCommande(commandeId);
  } catch (e) {
    console.error(`Livraison par e-mail impossible pour la commande ${commandeId} :`, e);
  }
}

export async function confirmerPaiement(commandeId: string): Promise<ResultatPaiement> {
  // La référence est un identifiant de commande (uuid) : tout le reste est refusé.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commandeId)) {
    return "introuvable";
  }

  const db = supabaseAdmin();
  const { data: commande, error } = await db
    .from("commandes")
    .select("id, statut, devise, total, livraison_envoyee_le")
    .eq("id", commandeId)
    .maybeSingle();

  if (error) throw error;
  if (!commande) return "introuvable";

  if (statutsDejaPayes.includes(commande.statut)) {
    if (!commande.livraison_envoyee_le) await livrerSansBloquer(commande.id);
    return "payee";
  }
  if (commande.statut !== "en_attente") return "echec"; // annulée ou remboursée

  const transaction = await verifierPaiement(commande.id);
  if (!transaction) return "en_attente"; // le client n'a pas (encore) payé
  if (transaction.statut === "REFUSED") return "echec";
  // WAITING_FOR_CUSTOMER : le client n'a pas encore validé sur son téléphone. Ce n'est pas un échec.
  if (transaction.statut !== "ACCEPTED") return "en_attente";

  // Le montant et la devise payés doivent correspondre à la commande.
  if (transaction.devise !== commande.devise || transaction.montant < Number(commande.total)) {
    console.error(
      `Paiement suspect pour la commande ${commande.id} : attendu ${commande.total} ${commande.devise}, ` +
        `reçu ${transaction.montant} ${transaction.devise}. À vérifier à la main.`
    );
    return "echec";
  }

  // Le "eq statut en_attente" évite de traiter deux fois la même commande.
  // Le passage à "payee" déclenche, dans la base, la baisse du stock des produits physiques.
  const { error: erreurMaj } = await db
    .from("commandes")
    .update({ statut: "payee", reference_paiement: transaction.reference || null })
    .eq("id", commande.id)
    .eq("statut", "en_attente");

  if (erreurMaj) throw erreurMaj;

  await livrerSansBloquer(commande.id);
  return "payee";
}
