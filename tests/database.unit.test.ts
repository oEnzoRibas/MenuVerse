import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseCatalog } from "../src/lib/demo-data";
import { quote } from "../src/lib/domain";

const db = new PGlite();
const tenant = "a0000000-0000-4000-8000-000000000001";
const other = "a0000000-0000-4000-8000-000000000002";
const admin = "b0000000-0000-4000-8000-000000000001";
const kitchen = "b0000000-0000-4000-8000-000000000002";
const requestId = "c0000000-0000-4000-8000-000000000001";
const key = "a".repeat(64);
const payload = {
  requestId,
  customer: "Sam",
  mode: "pickup" as const,
  address: "",
  notes: "",
  items: [
    {
      productId: baseCatalog.products[0].id,
      quantity: 1,
      selections: { size: ["single"] },
      removed: [],
      notes: "",
    },
  ],
};
const priced = { ...payload, ...quote(baseCatalog, payload) };
async function asUser(user: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    user,
  ]);
  await db.exec("set role authenticated");
}
beforeAll(async () => {
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; grant usage on schema auth to authenticated;",
  );
  for (const name of [
    "20261119000000_menuverse.sql",
    "20261119000100_catalog_checkout.sql",
  ]) {
    await db.exec(readFileSync("supabase/migrations/" + name, "utf8"));
  }
  await db.query("insert into auth.users values ($1),($2)", [admin, kitchen]);
  await db.query(
    "insert into public.restaurants(id, slug, name, published) values ($1,'brasa','Brasa',true),($2,'vizinho','Vizinho',true)",
    [tenant, other],
  );
  await db.query(
    "insert into public.restaurant_members values ($1,$2,'admin'),($1,$3,'kitchen')",
    [tenant, admin, kitchen],
  );
});
afterAll(() => db.close());

describe("Supabase migrations", () => {
  it("isolates tenants and limits catalog mutations and addresses to admins", async () => {
    await asUser(admin);
    await db.query("select public.save_catalog($1,'category',$2::jsonb)", [
      tenant,
      JSON.stringify(baseCatalog.categories[0]),
    ]);
    await db.query("select public.save_catalog($1,'product',$2::jsonb)", [
      tenant,
      JSON.stringify(baseCatalog.products[0]),
    ]);
    const catalog = await db.query<{ catalog: typeof baseCatalog }>(
      "select public.restaurant_catalog($1) as catalog",
      [tenant],
    );
    expect(catalog.rows[0].catalog.products[0]).toMatchObject(
      baseCatalog.products[0],
    );
    expect(
      (await db.query("select id from public.restaurants where id=$1", [other]))
        .rows,
    ).toEqual([]);
    await expect(
      db.query("select public.save_catalog($1,'settings',$2::jsonb)", [
        other,
        JSON.stringify(baseCatalog.settings),
      ]),
    ).rejects.toThrow("Acesso negado");
    await asUser(kitchen);
    await expect(
      db.query("select public.save_catalog($1,'settings',$2::jsonb)", [
        tenant,
        JSON.stringify(baseCatalog.settings),
      ]),
    ).rejects.toThrow("Acesso negado");
    await expect(db.query("select address from public.orders")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query("select * from public.demo_sessions"),
    ).rejects.toThrow("permission denied");
    await expect(
      db.query("select public.place_order($1,0,$2,$3::jsonb)", [
        tenant,
        key,
        JSON.stringify(priced),
      ]),
    ).rejects.toThrow("permission denied");
  });
  it("locks checkout to a catalog version and stores an idempotent order and ordered status history", async () => {
    await db.exec("reset role; set role service_role");
    const ver = await db.query<{ catalog_version: number }>(
      "select catalog_version from public.restaurants where id=$1",
      [tenant],
    );
    const version = ver.rows[0].catalog_version;
    const place = (v: number) =>
      db.query<{ code: string }>(
        "select public.place_order($1,$2,$3,$4::jsonb) as code",
        [tenant, v, key, JSON.stringify(priced)],
      );
    await expect(place(version - 1)).rejects.toThrow("O cardápio mudou");
    const code = (await place(version)).rows[0].code;
    expect((await place(version)).rows[0].code).toBe(code);
    expect((await db.query("select id,total from public.orders")).rows).toEqual(
      [{ id: code, total: 3290 }],
    );
    await asUser(kitchen);
    expect(
      (
        await db.query(
          "select public.advance_order($1,$2,'received') as changed",
          [tenant, code],
        )
      ).rows,
    ).toEqual([{ changed: true }]);
    expect(
      (
        await db.query(
          "select public.advance_order($1,$2,'received') as changed",
          [tenant, code],
        )
      ).rows,
    ).toEqual([{ changed: false }]);
    await expect(
      db.query("select public.advance_order($1,$2,'preparing')", [other, code]),
    ).rejects.toThrow("Acesso negado");
    expect(
      (
        await db.query(
          "select status from public.order_events where order_id=$1 order by at",
          [code],
        )
      ).rows,
    ).toEqual([{ status: "received" }, { status: "preparing" }]);
  });
});
