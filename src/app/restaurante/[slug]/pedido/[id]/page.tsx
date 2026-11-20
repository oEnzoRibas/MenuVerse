import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Brand, Button } from "@/components/ui";
import { Tracker } from "@/components/tracker";
import { findRestaurant, productionClient } from "@/lib/production";
import { orderCode, trackingCookie, trackOrder } from "@/lib/production-order";
export const metadata = { title: "Acompanhar pedido" };
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id: raw } = await params;
  const id = raw.toUpperCase();
  const client = productionClient();
  if (!client || !orderCode.test(id)) notFound();
  const restaurant = await findRestaurant(client, slug);
  if (!restaurant) notFound();
  const order = await trackOrder(
    client,
    restaurant.id,
    id,
    (await cookies()).get(trackingCookie(id))?.value,
  );
  if (!order) notFound();
  const route = "/restaurante/" + slug;
  return (
    <>
      <header className="wrap menu-header">
        <Brand />
        <Button variant="secondary" asChild>
          <Link href={route}>Voltar ao cardápio</Link>
        </Button>
      </header>
      <main className="tracker">
        <Tracker initial={order} endpoint={"/api" + route} demo={false} />
      </main>
    </>
  );
}
