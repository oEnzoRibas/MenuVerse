import { expect, test } from "@playwright/test";

test("personalizes a burger, confirms checkout, and follows kitchen changes", async ({
  page,
  context,
  browser,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Experimentar demonstração", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Brasa & Co." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bebidas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Refrigerante" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  await page.getByRole("searchbox", { name: "Buscar por nome" }).fill("Brasa");
  await expect(
    page.getByRole("heading", { name: "Bacon & Fumaça" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Personalizar Brasa Original" })
    .click();
  const custom = page.getByRole("dialog", { name: "Brasa Original" });
  await custom.getByRole("radio", { name: "Duplo" }).check();
  await custom.getByRole("checkbox", { name: "Bacon crocante" }).check();
  await custom.getByRole("checkbox", { name: "Sem Picles" }).check();
  await custom.getByLabel("Observações").fill("Cortar ao meio");
  await custom.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(
    custom.getByRole("button", { name: /Adicionar ao carrinho/ }),
  ).toContainText("97,80");
  await custom.getByRole("button", { name: /Adicionar ao carrinho/ }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Ver carrinho", exact: false })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Sem Picles");
  await page.getByRole("button", { name: "Ir para checkout" }).click();
  await page.getByLabel("Nome do cliente").fill("Sam Teste");
  await page.getByRole("radio", { name: "Entrega demonstrativa" }).check();
  await page.getByLabel("Endereço demonstrativo").fill("Rua Teste, 123");
  await expect(page.getByRole("dialog")).toContainText("105,70");
  await page
    .getByRole("button", { name: "Confirmar pedido demonstrativo" })
    .click();
  await expect(page.getByRole("heading", { name: "Recebido" })).toBeVisible();
  const tracking = page.url();
  const admin = await context.newPage();
  await admin.goto("/painel");
  await expect(admin.getByRole("row", { name: /Sam Teste/ })).toBeVisible();

  const kitchen = await context.newPage();
  await kitchen.goto("/cozinha");
  const order = kitchen.locator("article").filter({ hasText: "Sam Teste" });
  await expect(order).toContainText("Cortar ao meio");
  await order.getByRole("button", { name: "Iniciar preparação" }).click();
  await expect(
    page.getByRole("heading", { name: "Em preparação" }),
  ).toBeVisible({ timeout: 10000 });
  await order.getByRole("button", { name: "Marcar como pronto" }).click();
  await expect(page.getByRole("heading", { name: "Pronto" })).toBeVisible({
    timeout: 10000,
  });
  await order.getByRole("button", { name: "Finalizar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Finalizado" })).toBeVisible({
    timeout: 10000,
  });

  const other = await browser.newContext();
  await other.request.get(new URL("/demo", tracking).href);
  const response = await other.request.get(tracking);
  expect(response.status()).toBe(404);
  await other.close();
});

test("persists an administrative availability change", async ({ page }) => {
  await page.goto("/painel");
  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  await page.getByRole("button", { name: "Editar Brasa Original" }).click();
  await page
    .getByRole("checkbox", { name: "Disponível", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();
  await page.getByRole("link", { name: "Cardápio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Brasa Original indisponível" }),
  ).toBeDisabled();
});
