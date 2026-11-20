"use client";
import { Brand, Button } from "@/components/ui";
export default function PageError({ reset }: { reset: () => void }) {
  return (
    <main className="auth-shell admin-box">
      <Brand />
      <h1>Algo saiu do esperado</h1>
      <p>Tente carregar a página novamente.</p>
      <p>
        <Button onClick={reset}>Tentar novamente</Button>
      </p>
    </main>
  );
}
