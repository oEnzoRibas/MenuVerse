import "server-only";
import { createHash, createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order } from "./domain";

type Tracking = Pick<Order, "id" | "status" | "mode" | "total" | "history">;
export const orderCode = /^MV-[A-F0-9]{12}$/;
export const trackingCookie = (id: string) => "mv_order_" + id;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function trackingKey(tenant: string, requestId: string) {
  const secret = process.env.MENUVERSE_TRACKING_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Configure MENUVERSE_TRACKING_SECRET.");
  const token = createHmac("sha256", secret)
    .update(tenant + ":" + requestId)
    .digest("hex");
  return { token, keyHash: hash(token) };
}
export async function trackOrder(
  client: SupabaseClient,
  tenant: string,
  id: string,
  token: string | undefined,
): Promise<Tracking | null> {
  if (!orderCode.test(id) || !token || !/^[a-f0-9]{64}$/.test(token))
    return null;
  const result = await client
    .from("orders")
    .select("id,status,mode,total,order_events(status,at)")
    .eq("restaurant_id", tenant)
    .eq("id", id)
    .eq("tracking_hash", hash(token))
    .maybeSingle<
      Omit<Tracking, "history"> & { order_events: Tracking["history"] }
    >();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const { order_events, ...order } = result.data;
  return { ...order, history: order_events };
}
