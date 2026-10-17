// Langues du site et textes de l'interface.

export const langues = ["fr", "en"] as const;
export type Lang = (typeof langues)[number];
export const langueParDefaut: Lang = "fr";

export function estLangue(valeur: string): valeur is Lang {
  return (langues as readonly string[]).includes(valeur);
}

export type Dictionnaire = {
  nav: { boutique: string; formations: string; digital: string };
  hero: { titre: string; texte: string; bouton: string };
  accueil: { nosProduits: string };
  boutique: { titre: string; tout: string };
  produit: {
    acheter: string;
    disponible: string;
    livraisonPays: string;
    prixIndisponible: string;
  };
  types: { physique: string; digital: string; formation: string };
  pied: { droits: string };
  selecteurs: { langue: string; pays: string };
  introuvable: { titre: string; texte: string; retour: string };
  achat: {
    nom: string;
    email: string;
    telephone: string;
    adresse: string;
    pays: string;
    payer: string;
    annuler: string;
    enCours: string;
    erreur: string;
    erreurPays: string;
  };
  retour: {
    titreOk: string;
    texteOk: string;
    titreAttente: string;
    texteAttente: string;
    titreEchec: string;
    texteEchec: string;
    versBoutique: string;
    voirAchat: string;
    whatsapp: string;
  };
  acces: {
    titre: string;
    garder: string;
    telecharger: string;
    formation: string;
    lecon: string;
    physique: string;
  };
};

export const dictionnaires: Record<Lang, Dictionnaire> = {
  fr: {
    nav: { boutique: "Boutique", formations: "Formations", digital: "Digital" },
    hero: {
      titre: "Produits, formations et ressources digitales, au même endroit.",
      texte:
        "Achetez en quelques clics, payez par Mobile Money et recevez votre commande ou votre accès immédiatement.",
      bouton: "Voir la boutique",
    },
    accueil: { nosProduits: "Nos produits" },
    boutique: { titre: "Boutique", tout: "Tout" },
    produit: {
      acheter: "Acheter maintenant",
      disponible: "Disponible dans :",
      livraisonPays: "Livraison disponible vers :",
      prixIndisponible: "Prix bientôt disponible",
    },
    types: {
      physique: "Produit physique",
      digital: "Produit digital",
      formation: "Formation",
    },
    pied: { droits: "Tous droits réservés." },
    selecteurs: { langue: "Langue", pays: "Pays" },
    introuvable: {
      titre: "Page introuvable",
      texte: "Cette page n'existe pas ou a été déplacée.",
      retour: "Retour à l'accueil",
    },
    achat: {
      nom: "Nom complet",
      email: "Adresse e-mail",
      telephone: "Téléphone / WhatsApp (avec l'indicatif du pays)",
      adresse: "Adresse de livraison",
      pays: "Pays",
      payer: "Payer maintenant",
      annuler: "Annuler",
      enCours: "Redirection vers le paiement…",
      erreur: "Une erreur est survenue. Vérifiez vos informations et réessayez.",
      erreurPays: "Ce produit n'est pas disponible dans ce pays.",
    },
    retour: {
      titreOk: "Paiement confirmé",
      texteOk:
        "Merci pour votre achat ! Vous allez recevoir un e-mail avec votre lien d'accès. Vous pouvez aussi y accéder tout de suite ci-dessous.",
      titreAttente: "Paiement en cours de vérification",
      texteAttente:
        "Nous n'avons pas encore reçu la confirmation de votre paiement. Si vous avez été débité, votre commande sera validée automatiquement dans quelques minutes.",
      titreEchec: "Paiement non abouti",
      texteEchec: "Le paiement n'a pas été finalisé. Vous pouvez réessayer depuis la boutique.",
      versBoutique: "Retour à la boutique",
      voirAchat: "Accéder à mon achat",
      whatsapp: "Envoyer le lien sur WhatsApp",
    },
    acces: {
      titre: "Votre achat",
      garder: "Gardez cette page : c'est votre accès personnel. Ne partagez pas son adresse.",
      telecharger: "Télécharger",
      formation: "Votre formation",
      lecon: "Regarder la leçon",
      physique: "Votre commande est en cours de préparation. Nous vous contacterons pour la livraison.",
    },
  },
  en: {
    nav: { boutique: "Shop", formations: "Courses", digital: "Digital" },
    hero: {
      titre: "Products, courses and digital resources, all in one place.",
      texte:
        "Buy in a few clicks, pay with Mobile Money and get your order or your access right away.",
      bouton: "Browse the shop",
    },
    accueil: { nosProduits: "Our products" },
    boutique: { titre: "Shop", tout: "All" },
    produit: {
      acheter: "Buy now",
      disponible: "Available in:",
      livraisonPays: "Shipping available to:",
      prixIndisponible: "Price coming soon",
    },
    types: {
      physique: "Physical product",
      digital: "Digital product",
      formation: "Course",
    },
    pied: { droits: "All rights reserved." },
    selecteurs: { langue: "Language", pays: "Country" },
    introuvable: {
      titre: "Page not found",
      texte: "This page does not exist or has been moved.",
      retour: "Back to home",
    },
    achat: {
      nom: "Full name",
      email: "Email address",
      telephone: "Phone / WhatsApp (with country code)",
      adresse: "Delivery address",
      pays: "Country",
      payer: "Pay now",
      annuler: "Cancel",
      enCours: "Redirecting to payment…",
      erreur: "Something went wrong. Please check your details and try again.",
      erreurPays: "This product is not available in this country.",
    },
    retour: {
      titreOk: "Payment confirmed",
      texteOk:
        "Thank you for your purchase! You will receive an email with your access link. You can also open it right away below.",
      titreAttente: "Payment being verified",
      texteAttente:
        "We have not received the confirmation of your payment yet. If you were charged, your order will be validated automatically within a few minutes.",
      titreEchec: "Payment not completed",
      texteEchec: "The payment was not completed. You can try again from the shop.",
      versBoutique: "Back to the shop",
      voirAchat: "Access my purchase",
      whatsapp: "Send the link on WhatsApp",
    },
    acces: {
      titre: "Your purchase",
      garder: "Keep this page: it is your personal access. Do not share its address.",
      telecharger: "Download",
      formation: "Your course",
      lecon: "Watch the lesson",
      physique: "Your order is being prepared. We will contact you about delivery.",
    },
  },
};
