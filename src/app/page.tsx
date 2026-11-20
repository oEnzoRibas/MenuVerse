import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  ChefHat,
  Check,
  Flame,
  LayoutGrid,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import { Brand, Button, Credit } from "@/components/ui";

const benefits = [
  {
    icon: Smartphone,
    title: "Cardápio que dá vontade",
    text: "Fotos, categorias e personalizações em uma experiência rápida no celular.",
  },
  {
    icon: ChefHat,
    title: "Pedidos no ritmo da cozinha",
    text: "Acompanhe a fila, leia as observações e sinalize quando cada pedido estiver pronto.",
  },
  {
    icon: BarChart3,
    title: "Operação sob controle",
    text: "Edite o catálogo e acompanhe pedidos, faturamento e produtos mais vendidos.",
  },
];

export default function Home() {
  return (
    <>
      <header className="home-header">
        <div className="wrap home-nav">
          <Brand />
          <nav aria-label="Navegação principal">
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
          </nav>
          <Button asChild variant="secondary">
            <Link prefetch={false} href="/demo">
              Experimentar demo
            </Link>
          </Button>
        </div>
      </header>
      <main>
        <section className="home-hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                <Flame size={16} /> TECNOLOGIA PARA RESTAURANTES
              </p>
              <h1>
                Do cardápio
                <br />à <em>cozinha.</em>
              </h1>
              <p>
                Cardápio digital, pedidos online e operação em um só lugar. Uma
                experiência à altura do que você serve.
              </p>
              <div className="hero-actions">
                <Button asChild>
                  <Link prefetch={false} href="/demo">
                    <ShoppingBag size={19} /> Experimentar demonstração
                  </Link>
                </Button>
                <a href="#recursos">Explorar recursos</a>
              </div>
              <span className="hero-note">
                <Check size={16} /> Demonstração aberta, sem cadastro
              </span>
            </div>
            <div className="hero-visual">
              <Image
                src="/food/hero.webp"
                alt="Hambúrguer artesanal no pão brioche"
                fill
                preload
                sizes="(max-width: 760px) 100vw, 52vw"
              />
              <div className="hero-caption">
                <span className="caption-icon">
                  <Flame size={24} />
                </span>
                <div>
                  <strong>Brasa & Co.</strong>
                  <small>Cardápio demonstrativo</small>
                </div>
                <span className="caption-state">
                  <i /> Aberto
                </span>
              </div>
            </div>
          </div>
        </section>
        <section id="recursos" className="wrap home-section">
          <div className="section-heading">
            <p className="eyebrow">FEITO PARA A OPERAÇÃO REAL</p>
            <h2>
              O salão, a cozinha e<br />a gestão conectados.
            </h2>
          </div>
          <div className="benefits">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <span>
                  <Icon size={23} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="como-funciona" className="process">
          <div className="wrap process-grid">
            <div>
              <p className="eyebrow">COMO FUNCIONA</p>
              <h2>
                Três etapas.
                <br />
                Um só pedido.
              </h2>
              <ol>
                <li>
                  <strong>Seu cliente faz o pedido</strong>
                  <p>
                    Ele escolhe os itens, personaliza e confirma pelo cardápio.
                  </p>
                </li>
                <li>
                  <strong>A cozinha entra em ação</strong>
                  <p>O pedido aparece na fila com os detalhes para preparar.</p>
                </li>
                <li>
                  <strong>O cliente acompanha</strong>
                  <p>As mudanças de status aparecem na página do pedido.</p>
                </li>
              </ol>
            </div>
            <div className="dashboard-preview">
              <div>
                <LayoutGrid size={18} /> Visão geral{" "}
                <small>Dados ilustrativos</small>
              </div>
              <div className="preview-metrics">
                <span>
                  Pedidos<strong>24</strong>
                </span>
                <span>
                  Em andamento<strong>6</strong>
                </span>
                <span>
                  Faturamento<strong>R$ 980</strong>
                </span>
              </div>
              <div className="preview-chart" aria-hidden="true">
                {[22, 48, 39, 60, 48, 83, 92, 70, 100, 83, 95, 77].map(
                  (height, i) => (
                    <i key={i} style={{ height: height + "%" }} />
                  ),
                )}
              </div>
              <Button asChild className="preview-link" variant="secondary">
                <Link prefetch={false} href="/demo?para=painel">
                  Abrir painel demonstrativo
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <section className="wrap home-section end-cta">
          <h2>Veja um pedido acontecer.</h2>
          <p>
            Experimente o cardápio do Brasa & Co. e acompanhe o pedido até a
            cozinha.
          </p>
          <Button asChild>
            <Link prefetch={false} href="/demo">
              Experimentar demonstração
            </Link>
          </Button>
        </section>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <Brand inverse />
          <Credit />
          <Link href="/equipe">Acesso da equipe</Link>
        </div>
      </footer>
    </>
  );
}
