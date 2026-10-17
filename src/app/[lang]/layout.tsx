import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../globals.css";
import Selecteurs from "@/components/Selecteurs";
import { lirePays } from "@/lib/devise-serveur";
import { Lang, dictionnaires, estLangue } from "@/lib/i18n";
import { optionsPays, paysActifs } from "@/lib/pays";

const descriptions: Record<Lang, string> = {
  fr: "Produits, formations et ressources digitales pour l'Afrique, payables par Mobile Money.",
  en: "Products, courses and digital resources for Africa, payable by Mobile Money.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: "CamerMarket",
    description: estLangue(lang) ? descriptions[lang] : undefined,
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!estLangue(lang)) notFound();

  const dict = dictionnaires[lang];
  const pays = await lirePays();

  return (
    <html lang={lang}>
      <body>
        <header className="entete">
          <div className="conteneur">
            <Link href={`/${lang}`} className="logo">
              Camer<span>Market</span>
            </Link>
            <nav className="nav">
              <Link href={`/${lang}/produits`}>{dict.nav.boutique}</Link>
              <Link href={`/${lang}/produits?type=formation`}>{dict.nav.formations}</Link>
              <Link href={`/${lang}/produits?type=digital`}>{dict.nav.digital}</Link>
            </nav>
            <Selecteurs
              lang={lang}
              pays={pays}
              optionsPays={optionsPays(paysActifs(), lang)}
              libelleLangue={dict.selecteurs.langue}
              libellePays={dict.selecteurs.pays}
            />
          </div>
        </header>
        <main>{children}</main>
        <footer className="pied">
          <div className="conteneur">
            © {new Date().getFullYear()} CamerMarket. {dict.pied.droits}
          </div>
        </footer>
      </body>
    </html>
  );
}
