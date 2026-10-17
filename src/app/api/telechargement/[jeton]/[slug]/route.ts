// Téléchargement d'un produit digital. Le fichier est dans un espace PRIVÉ de Supabase :
// on vérifie d'abord que le jeton correspond à une commande payée contenant ce produit,
// puis on redirige vers un lien temporaire (60 secondes).

import { NextResponse } from "next/server";
import { chargerAcces } from "@/lib/acces";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ jeton: string; slug: string }> }
) {
  const { jeton, slug } = await params;

  const acces = await chargerAcces(jeton);
  const produit = acces?.produits.find((p) => p.slug === slug && p.type === "digital");

  if (!produit?.fichier_chemin) {
    return new NextResponse("Introuvable", { status: 404 });
  }

  const { data, error } = await supabaseAdmin()
    .storage.from("produits-digitaux")
    .createSignedUrl(produit.fichier_chemin, 60, { download: true });

  if (error || !data) {
    console.error(`Lien de téléchargement impossible pour ${slug} :`, error);
    return new NextResponse("Erreur", { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
