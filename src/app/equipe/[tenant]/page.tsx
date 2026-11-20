import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Operations } from "@/components/operations";
import { Brand, Button } from "@/components/ui";
import { loadCatalog, loadOrders } from "@/lib/production";
import { getTeam, teamConfigured } from "@/lib/team";
import Link from "next/link";

export const metadata = { title: "Operação do restaurante" };
export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  if (!teamConfigured) redirect("/equipe");
  if (!z.uuid().safeParse(tenant).success) notFound();
  const auth = await getTeam();
  if (!auth) redirect("/equipe");
  const member = auth.memberships.find((item) => item.restaurant_id === tenant);
  if (!member) notFound();
  const admin = member.role === "admin";
  const [catalog, orders] = await Promise.all([
    loadCatalog(auth.client, tenant),
    loadOrders(auth.client, tenant, admin),
  ]);
  return (
    <>
      <header className="wrap menu-header">
        <Brand />
        <Button asChild variant="secondary">
          <Link href="/equipe">Meus restaurantes</Link>
        </Button>
      </header>
      <Operations
        initial={{
          settings: catalog.settings,
          categories: admin ? catalog.categories : [],
          products: admin ? catalog.products : [],
          orders,
        }}
        mode={admin ? "admin" : "kitchen"}
        endpoint={"/api/equipe/" + tenant}
        demo={false}
      />
    </>
  );
}
