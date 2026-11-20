import { z } from "zod";
import { getTeam, teamConfigured } from "@/lib/team";
import { loadCatalog, loadOrders } from "@/lib/production";
import {
  categorySchema,
  productSchema,
  settingsSchema,
  statuses,
} from "@/lib/domain";
import { privateJson, readJson, sameOrigin } from "@/lib/http";

type Context = { params: Promise<{ tenant: string }> };
const changes = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("advance"),
    id: z.string().regex(/^MV-[A-F0-9]{12}$/),
    from: z.enum(statuses),
  }),
  z.object({ action: z.literal("product"), data: productSchema }),
  z.object({ action: z.literal("category"), data: categorySchema }),
  z.object({ action: z.literal("settings"), data: settingsSchema }),
]);
async function authorized(context: Context) {
  const { tenant } = await context.params;
  if (!teamConfigured || !z.uuid().safeParse(tenant).success) return null;
  const auth = await getTeam();
  const membership = auth?.memberships.find(
    (item) => item.restaurant_id === tenant,
  );
  if (!auth || !membership) return null;
  return { tenant, client: auth.client, admin: membership.role === "admin" };
}
export async function GET(_request: Request, context: Context) {
  const access = await authorized(context);
  if (!access) return privateJson({ error: "Acesso negado." }, 403);
  const { client, tenant, admin } = access;
  const [catalog, orders] = await Promise.all([
    loadCatalog(client, tenant),
    loadOrders(client, tenant, admin),
  ]);
  return privateJson({
    settings: catalog.settings,
    categories: admin ? catalog.categories : [],
    products: admin ? catalog.products : [],
    orders,
  });
}
export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request))
    return privateJson({ error: "Origem inválida." }, 403);
  const access = await authorized(context);
  if (!access) return privateJson({ error: "Acesso negado." }, 403);
  const parsed = changes.safeParse(await readJson(request));
  if (!parsed.success) return privateJson({ error: "Dados inválidos." }, 400);
  const input = parsed.data;
  const { client, tenant, admin } = access;
  if (input.action === "advance") {
    const result = await client.rpc("advance_order", {
      tenant,
      code: input.id,
      current_status: input.from,
    });
    if (result.error || !result.data)
      return privateJson(
        { error: "O pedido já foi atualizado ou está indisponível." },
        409,
      );
  } else {
    if (!admin) return privateJson({ error: "Acesso negado." }, 403);
    const result = await client.rpc("save_catalog", {
      tenant,
      resource: input.action,
      payload: input.data,
    });
    if (result.error)
      return privateJson(
        { error: "Não foi possível salvar. Revise os dados." },
        409,
      );
  }
  return privateJson({ ok: true });
}
