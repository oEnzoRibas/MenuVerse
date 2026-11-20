import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  categorySchema,
  productSchema,
  settingsSchema,
  type OperationalOrder,
  type Status,
} from "./domain";

const snapshot = z.object({
  version: z.number().int(),
  settings: settingsSchema,
  categories: z.array(categorySchema),
  products: z.array(productSchema),
});

export function productionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ORDER_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function loadCatalog(client: SupabaseClient, tenant: string) {
  const result = await client.rpc("restaurant_catalog", { tenant });
  if (result.error) throw result.error;
  if (!result.data) throw new Error("Restaurante indisponível.");
  return snapshot.parse(result.data);
}
export async function loadOrders(
  client: SupabaseClient,
  tenant: string,
  admin: boolean,
): Promise<OperationalOrder[]> {
  const orders = client
    .from("orders")
    .select(
      "id,created_at,customer,mode,notes,status,subtotal,fee,total," +
        "order_events(status,at),order_items(id,product_id,name,unit,quantity,removed,notes,order_item_options(id,name))",
    )
    .eq("restaurant_id", tenant)
    .order("created_at", { ascending: false })
    .limit(150)
    .returns<DbOrder[]>();
  const [result, addresses] = await Promise.all([
    orders,
    admin ? client.rpc("order_addresses", { tenant }) : null,
  ]);
  if (result.error) throw result.error;
  if (addresses?.error) throw addresses.error;
  const addressById = new Map(
    (addresses?.data ?? []).map(
      (item: { id: string; address: string }) =>
        [item.id, item.address] as const,
    ),
  );
  return result.data.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    customer: row.customer,
    mode: row.mode,
    address: String(addressById.get(row.id) ?? ""),
    notes: row.notes,
    status: row.status,
    subtotal: row.subtotal,
    fee: row.fee,
    total: row.total,
    history: row.order_events.toSorted((a, b) => a.at.localeCompare(b.at)),
    items: row.order_items
      .toSorted((a, b) => a.id - b.id)
      .map((item) => ({
        productId: item.product_id,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        removed: item.removed,
        notes: item.notes,
        selections: {},
        options: item.order_item_options
          .toSorted((a, b) => a.id - b.id)
          .map((value) => value.name),
      })),
  }));
}
type DbOrder = Pick<
  OperationalOrder,
  "id" | "customer" | "mode" | "notes" | "status" | "subtotal" | "fee" | "total"
> & {
  created_at: string;
  order_events: { status: Status; at: string }[];
  order_items: {
    id: number;
    product_id: string;
    name: string;
    unit: number;
    quantity: number;
    removed: string[];
    notes: string;
    order_item_options: { id: number; name: string }[];
  }[];
};
export async function findRestaurant(client: SupabaseClient, slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 90) return null;
  const result = await client
    .from("restaurants")
    .select("id,slug")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}
