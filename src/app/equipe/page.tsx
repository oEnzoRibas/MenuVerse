import Link from "next/link";
import { Brand, Button } from "@/components/ui";
import { getTeam, teamConfigured } from "@/lib/team";
import { signIn, signOut } from "./actions";
export const metadata = { title: "Acesso da equipe" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const auth = teamConfigured ? await getTeam() : null;
  const invalid = (await searchParams).erro === "1";
  return (
    <main className="auth-shell admin-box">
      <Brand />
      <h1>Acesso da equipe</h1>
      {!teamConfigured ? (
        <>
          <p>O acesso da equipe requer configuração do Supabase.</p>
          <Button asChild>
            <Link prefetch={false} href="/demo?para=painel">
              Abrir painel demonstrativo
            </Link>
          </Button>
        </>
      ) : auth ? (
        <>
          <ul className="editor-list">
            {auth.memberships.map((item) => (
              <li key={item.restaurant_id}>
                <strong>{item.restaurants.name}</strong>
                <Button asChild>
                  <Link href={"/equipe/" + item.restaurant_id}>
                    {item.role === "admin" ? "Abrir painel" : "Abrir cozinha"}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
          {!auth.memberships.length && (
            <p>Esta conta ainda não está vinculada a um restaurante.</p>
          )}
          <form action={signOut}>
            <Button variant="secondary">Sair</Button>
          </form>
        </>
      ) : (
        <form action={signIn}>
          <label className="field">
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            Senha
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {invalid && (
            <p className="error" role="alert">
              Confira seu e-mail e sua senha.
            </p>
          )}
          <Button>Entrar</Button>
        </form>
      )}
    </main>
  );
}
