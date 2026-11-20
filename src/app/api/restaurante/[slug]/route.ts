import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkoutSchema, quote } from "@/lib/domain";
import { privateJson, readJson, requestProtocol, sameOrigin } from "@/lib/http";
import {
  findRestaurant,
  loadCatalog,
  productionClient,
} from "@/lib/production";
import {
  orderCode,
  trackingCookie,
  trackingKey,
  trackOrder,
} from "@/lib/production-order";

type Context = { params: Promise<{ slug: string }> };
const checkout = z.object({
  action: z.literal("checkout"),
  data: checkoutSchema,
});

export async function GET(request: NextRequest, context: Context) {
  const code = request.nextUrl.searchParams.get("pedido")?.toUpperCase();
  const { slug } = await context.params;
  const client = productionClient();
  const restaurant = client && (await findRestaurant(client, slug));
  if (!client || !restaurant || !code || !orderCode.test(code))
    return privateJson({ error: "Pedido indisponível." }, 404);
  const result = await trackOrder(
    client,
    restaurant.id,
    code,
    request.cookies.get(trackingCookie(code))?.value,
  );
  return result
    ? privateJson(result)
    : privateJson({ error: "Pedido indisponível." }, 404);
}
export async function POST(request: NextRequest, context: Context) {
  if (!sameOrigin(request))
    return privateJson({ error: "Origem inválida." }, 403);
  const input = checkout.safeParse(await readJson(request));
  if (!input.success)
    return privateJson({ error: "Revise os dados do pedido." }, 400);
  const { slug } = await context.params;
  const client = productionClient();
  const restaurant = client && (await findRestaurant(client, slug));
  if (!client || !restaurant)
    return privateJson({ error: "Restaurante indisponível." }, 404);
  const data = input.data.data;
  const { token, keyHash } = trackingKey(restaurant.id, data.requestId);
  const previous = await client
    .from("orders")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("request_id", data.requestId)
    .eq("tracking_hash", keyHash)
    .maybeSingle();
  if (previous.error)
    return privateJson({ error: "Não foi possível confirmar agora." }, 503);
  let id = previous.data?.id;
  if (!id) {
    const catalog = await loadCatalog(client, restaurant.id);
    let priced;
    try {
      priced = quote(catalog, data);
    } catch (err) {
      return privateJson(
        { error: err instanceof Error ? err.message : "Revise o carrinho." },
        409,
      );
    }
    const result = await client.rpc("place_order", {
      tenant: restaurant.id,
      version: catalog.version,
      key_hash: keyHash,
      payload: {
        ...data,
        ...priced,
        address: data.mode === "delivery" ? data.address : "",
      },
    });
    if (
      result.error ||
      typeof result.data !== "string" ||
      !orderCode.test(result.data)
    )
      return privateJson(
        {
          error:
            result.error?.code === "40001"
              ? "O cardápio mudou. Atualize a página."
              : "Não foi possível confirmar agora.",
        },
        result.error?.code === "40001" ? 409 : 503,
      );
    id = result.data;
  }
  const response = NextResponse.json(
    { id },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  response.cookies.set(trackingCookie(id), token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: requestProtocol(request) === "https:",
    maxAge: 7 * 86400,
  });
  return response;
}
