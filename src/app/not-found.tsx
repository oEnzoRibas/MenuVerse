import Link from "next/link";
import { Brand, Button } from "@/components/ui";
export default function NotFound() {
  return (
    <main className="auth-shell admin-box">
      <Brand />
      <h1>Página indisponível</h1>
      <p>Confira o endereço ou volte ao início.</p>
      <p>
        <Button asChild>
          <Link href="/">Voltar ao início</Link>
        </Button>
      </p>
    </main>
  );
}
