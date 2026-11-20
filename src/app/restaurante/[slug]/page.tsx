import { notFound } from "next/navigation";
import { Menu } from "@/components/menu";
import { Credit } from "@/components/ui";
import {
  findRestaurant,
  loadCatalog,
  productionClient,
} from "@/lib/production";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = productionClient();
  if (!client) notFound();
  const restaurant = await findRestaurant(client, slug);
  if (!restaurant) notFound();
  const catalog = await loadCatalog(client, restaurant.id);
  const route = "/restaurante/" + slug;
  return (
    <>
      <Menu
        catalog={catalog}
        endpoint={"/api" + route}
        orderPath={route + "/pedido/"}
        namespace={"restaurant-" + slug}
        demo={false}
      />
      <footer className="site-footer">
        <div className="wrap">
          <strong>{catalog.settings.name}</strong>
          <Credit />
        </div>
      </footer>
    </>
  );
}
