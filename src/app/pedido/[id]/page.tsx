import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand, Button, DemoNav } from "@/components/ui";
import { Tracker } from "@/components/tracker";
import { getDemoId, readDemo } from "@/lib/demo-store";
export const metadata = { title: "Acompanhar pedido" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getDemoId();
  const demo = session ? await readDemo(session) : null;
  const order = demo?.payload.orders.find(
    (item) => item.id === id.toUpperCase(),
  );
  if (!order) notFound();
  const { status, history, total, mode } = order;
  return (
    <>
      <DemoNav />
      <header className="wrap menu-header">
        <Brand />
        <Button variant="secondary" asChild>
          <Link href="/cardapio">Voltar ao cardápio</Link>
        </Button>
      </header>
      <main className="tracker">
        <Tracker initial={{ id, status, history, total, mode }} />
      </main>
    </>
  );
}
