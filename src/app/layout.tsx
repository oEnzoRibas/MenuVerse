import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "MenuVerse — Do cardápio à cozinha",
    template: "%s | MenuVerse",
  },
  description:
    "Cardápio digital, pedidos e operação de cozinha em uma única plataforma.",
  authors: [{ name: "oEnzoRibas", url: "https://github.com/oEnzoRibas" }],
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
