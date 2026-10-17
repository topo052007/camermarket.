// Toute adresse inconnue sous /fr ou /en affiche la page « introuvable » avec l'en-tête du site.

import { notFound } from "next/navigation";

export default function AdresseInconnue() {
  notFound();
}
