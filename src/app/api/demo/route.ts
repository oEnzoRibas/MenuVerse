import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDemoId, readDemo, updateDemo } from "@/lib/demo-store";
import {
  categorySchema,
  checkoutSchema,
  nextStatus,
  productSchema,
  quote,
  settingsSchema,
  statuses,
  type Order,
} from "@/lib/domain";

import { privateJson as reply, readJson, sameOrigin } from "@/lib/http";
const commands = z.discriminatedUnion("action", [
  z.object({ action: z.literal("checkout"), data: checkoutSchema }),
  z.object({
    action: z.literal("advance"),
    id: z.string().regex(/^MV-[A-F0-9]{4,12}$/),
    from: z.enum(statuses),
  }),
  z.object({ action: z.literal("product"), data: productSchema }),
  z.object({ action: z.literal("category"), data: categorySchema }),
  z.object({ action: z.literal("settings"), data: settingsSchema }),
]);
export async function GET(request: Request) {
  const id = await getDemoId();
  const snapshot = id ? await readDemo(id) : null;
  if (!snapshot) return reply({ error: "Sessão indisponível." }, 401);
  const code = new URL(request.url).searchParams.get("pedido");
  if (code) {
    const order = snapshot.payload.orders.find(
      (item) => item.id === code.toUpperCase(),
    );
    if (!order)
      return reply({ error: "Pedido não encontrado nesta sessão." }, 404);
    return reply({
      id: order.id,
      status: order.status,
      history: order.history,
      mode: order.mode,
      total: order.total,
    });
  }
  return reply(snapshot.payload);
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Origem inválida." }, 403);
  const id = await getDemoId();
  if (!id) return reply({ error: "Reabra a demonstração." }, 401);
  const command = commands.safeParse(await readJson(request));
  if (!command.success)
    return reply(
      { error: command.error.issues[0]?.message ?? "Dados inválidos." },
      400,
    );
  const input = command.data;
  try {
    const result = await updateDemo(id, (state) => {
      switch (input.action) {
        case "checkout": {
          const previous = state.orders.find(
            (order) => order.requestId === input.data.requestId,
          );
          if (previous) return { id: previous.id };
          if (state.orders.length >= 100)
            throw new Error("Esta sessão atingiu o limite de pedidos.");
          const now = new Date().toISOString();
          const { customer, mode, address, notes, requestId } = input.data;
          const order: Order = {
            customer,
            mode,
            notes,
            requestId,
            ...quote(state, input.data),
            address: mode === "delivery" ? address : "",
            id:
              "MV-" +
              randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase(),
            createdAt: now,
            status: "received",
            history: [{ status: "received", at: now }],
          };
          state.orders.unshift(order);
          return { id: order.id };
        }
        case "advance": {
          const order = state.orders.find((order) => order.id === input.id);
          const status = order && nextStatus(order.status);
          if (!order || order.status !== input.from || !status)
            throw new Error("O pedido já foi atualizado ou está finalizado.");
          order.status = status;
          order.history.push({ status, at: new Date().toISOString() });
          return { ok: true };
        }
        case "product": {
          if (
            !state.categories.some(
              (category) => category.id === input.data.categoryId,
            )
          )
            throw new Error("Categoria inválida.");
          const exists = state.products.some(
            (product) => product.id === input.data.id,
          );
          if (!exists && state.products.length >= 60)
            throw new Error("Limite de produtos atingido.");
          state.products = exists
            ? state.products.map((item) =>
                item.id === input.data.id ? input.data : item,
              )
            : [...state.products, input.data];
          return { ok: true };
        }
        case "category": {
          const exists = state.categories.some(
            (category) => category.id === input.data.id,
          );
          if (!exists && state.categories.length >= 30)
            throw new Error("Limite de categorias atingido.");
          state.categories = exists
            ? state.categories.map((item) =>
                item.id === input.data.id ? input.data : item,
              )
            : [...state.categories, input.data];
          return { ok: true };
        }
        case "settings":
          state.settings = input.data;
          return { ok: true };
      }
    });
    return reply(result);
  } catch (error) {
    if (error instanceof Error) return reply({ error: error.message }, 409);
    console.error("Demo storage error", error);
    return reply({ error: "Não foi possível salvar agora." }, 503);
  }
}
