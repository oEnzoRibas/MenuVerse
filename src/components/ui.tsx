import { Flame } from "lucide-react";
import Link from "next/link";

export { Button } from "./ui/button";
export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={"brand" + (inverse ? " brand-inverse" : "")} href="/">
      <span className="brand-icon">
        <Flame size={20} fill="currentColor" />
      </span>
      Menu<span>Verse</span>
    </Link>
  );
}
export function Credit() {
  return (
    <span>
      Developed by{" "}
      <a href="https://github.com/oEnzoRibas" target="_blank" rel="noreferrer">
        oEnzoRibas
      </a>
    </span>
  );
}
export function DemoNav() {
  return (
    <div className="demo-bar">
      <div className="wrap demo-inner">
        <span>
          <i /> Ambiente demonstrativo
        </span>
        <nav aria-label="Navegação da demonstração">
          <Link href="/cardapio">Cardápio</Link>
          <Link href="/painel">Painel</Link>
          <Link href="/cozinha">Cozinha</Link>
        </nav>
      </div>
    </div>
  );
}
