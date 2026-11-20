import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

test.skip(
  process.env.MENUVERSE_E2E_SUPABASE !== "1",
  "Requer a pilha local do Supabase.",
);

test("processa pedido real da aplicação com funções de equipe distintas", async ({
  page,
  browser,
}) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const secret = process.env.SUPABASE_ORDER_SECRET_KEY ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!["127.0.0.1", "localhost"].includes(new URL(supabaseUrl).hostname))
    throw new Error("Use uma instância Supabase local.");
  const service = createClient(supabaseUrl, secret, {
    auth: { persistSession: false },
  });
  const kitchenBrowser = await browser.newContext();
  const adminBrowser = await browser.newContext();
  const tenant = randomUUID();
  const slug = "teste-" + tenant;
  const password = randomBytes(24).toString("base64url");
  const adminIds: string[] = [];
  const users: Record<"admin" | "kitchen", { email: string }> = {
    admin: { email: "admin-" + tenant + "@example.com" },
    kitchen: { email: "cozinha-" + tenant + "@example.com" },
  };
  try {
    const restaurant = await service
      .from("restaurants")
      .insert({ id: tenant, slug, name: "Cozinha Teste", published: true });
    if (restaurant.error) throw restaurant.error;
    for (const role of ["admin", "kitchen"] as const) {
      const { email } = users[role];
      const created = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error) throw created.error;
      adminIds.push(created.data.user.id);
      const membership = await service
        .from("restaurant_members")
        .insert({ restaurant_id: tenant, user_id: created.data.user.id, role });
      if (membership.error) throw membership.error;
    }
    const adminApi = createClient(supabaseUrl, key, {
      auth: { persistSession: false },
    });
    const signIn = await adminApi.auth.signInWithPassword({
      email: users.admin.email,
      password,
    });
    if (signIn.error) throw signIn.error;
    const category = randomUUID();
    const catalog = [
      [
        "category",
        { id: category, name: "Lanches", position: 0, active: true },
      ],
      [
        "product",
        {
          id: randomUUID(),
          categoryId: category,
          name: "Smash de teste",
          description: "Hambúrguer do teste.",
          price: 3200,
          image: "smash",
          available: true,
          featured: true,
          ingredients: [],
          groups: [],
        },
      ],
    ] as const;
    for (const [resource, payload] of catalog) {
      const saved = await adminApi.rpc("save_catalog", {
        tenant,
        resource,
        payload,
      });
      if (saved.error) throw saved.error;
    }
    await page.goto("/restaurante/" + slug);
    await page
      .getByRole("button", { name: "Personalizar Smash de teste" })
      .click();
    await page.getByRole("button", { name: /Adicionar ao carrinho/ }).click();
    await page.getByRole("button", { name: /Ver carrinho/ }).click();
    await page.getByRole("button", { name: "Ir para checkout" }).click();
    await page.getByLabel("Nome do cliente").fill("Alex Operação");
    await page.getByRole("button", { name: "Enviar pedido" }).click();
    await expect(
      page.getByRole("heading", { name: "Recebido", exact: true }),
    ).toBeVisible();

    const kitchen = await kitchenBrowser.newPage();
    const admin = await adminBrowser.newPage();
    for (const staff of [
      { page: admin, role: "admin", panel: "Abrir painel" },
      { page: kitchen, role: "kitchen", panel: "Abrir cozinha" },
    ] as const) {
      await staff.page.goto(new URL("/equipe", page.url()).href);
      await staff.page.getByLabel("E-mail").fill(users[staff.role].email);
      await staff.page.getByLabel("Senha").fill(password);
      await staff.page.getByRole("button", { name: "Entrar" }).click();
      await staff.page.getByRole("link", { name: staff.panel }).click();
    }
    await expect(
      admin.getByRole("row", { name: /Alex Operação/ }),
    ).toBeVisible();
    await expect(
      admin.getByRole("button", { name: "Produtos", exact: true }),
    ).toBeVisible();
    await expect(
      kitchen.getByRole("button", { name: "Produtos", exact: true }),
    ).toHaveCount(0);
    await kitchen
      .locator("article")
      .filter({ hasText: "Alex Operação" })
      .getByRole("button", { name: "Iniciar preparação" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Em preparação" }),
    ).toBeVisible({ timeout: 10000 });
    const anonymous = await adminBrowser.request.get(page.url());
    expect(anonymous.status()).toBe(404);
  } finally {
    await kitchenBrowser.close();
    await adminBrowser.close();
    const removed = await service.from("restaurants").delete().eq("id", tenant);
    if (removed.error) throw removed.error;
    for (const id of adminIds) await service.auth.admin.deleteUser(id);
  }
});
