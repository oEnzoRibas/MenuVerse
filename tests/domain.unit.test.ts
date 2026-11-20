import { describe, expect, it } from "vitest";
import { baseCatalog } from "../src/lib/demo-data";
import {
  checkoutSchema,
  nextStatus,
  quote,
  type Checkout,
} from "../src/lib/domain";

const input: Checkout = {
  requestId: "699a9000-1f42-462d-9cdf-000000000099",
  customer: "Sam",
  mode: "delivery",
  address: "Rua Exemplo, 123",
  notes: "",
  items: [
    {
      productId: baseCatalog.products[0].id,
      quantity: 2,
      selections: { size: ["double"], extra: ["bacon"] },
      removed: ["Picles"],
      notes: "",
    },
  ],
};
describe("checkout", () => {
  it("derives integer totals from catalog options and delivery", () => {
    const parsed = checkoutSchema.parse({
      ...input,
      total: 1,
      items: [{ ...input.items[0], unit: 1 }],
    });
    expect(quote(baseCatalog, parsed)).toMatchObject({
      subtotal: 9780,
      fee: 790,
      total: 10570,
      items: [{ unit: 4890 }],
    });
  });
  it("rejects missing size, duplicate extras and unknown ingredients", () => {
    const line = input.items[0];
    expect(() =>
      quote(baseCatalog, { ...input, items: [{ ...line, selections: {} }] }),
    ).toThrow();
    expect(() =>
      quote(baseCatalog, {
        ...input,
        items: [
          {
            ...line,
            selections: { size: ["double"], extra: ["bacon", "bacon"] },
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      quote(baseCatalog, {
        ...input,
        items: [{ ...line, removed: ["Alface"] }],
      }),
    ).toThrow();
  });
  it("rejects unavailable items, hidden categories and delivery without address", () => {
    const catalog = structuredClone(baseCatalog);
    catalog.categories[0].active = false;
    expect(() => quote(catalog, input)).toThrow("indisponível");
    catalog.categories[0].active = true;
    catalog.products[0].available = false;
    expect(() => quote(catalog, input)).toThrow("indisponível");
    expect(checkoutSchema.safeParse({ ...input, address: "" }).success).toBe(
      false,
    );
  });
  it("enforces the forward status order", () => {
    expect(nextStatus("received")).toBe("preparing");
    expect(nextStatus("preparing")).toBe("ready");
    expect(nextStatus("ready")).toBe("finished");
    expect(nextStatus("finished")).toBeUndefined();
  });
});
