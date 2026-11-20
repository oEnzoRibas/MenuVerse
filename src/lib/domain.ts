import { z } from "zod";

export const statuses = ["received", "preparing", "ready", "finished"] as const;
export type Status = (typeof statuses)[number];
export const statusText: Record<Status, string> = {
  received: "Recebido",
  preparing: "Em preparação",
  ready: "Pronto",
  finished: "Finalizado",
};
export function nextStatus(status: Status) {
  return statuses[statuses.indexOf(status) + 1];
}

export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(60),
  position: z.number().int().min(0).max(999),
  active: z.boolean(),
});
export const groupSchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(60),
    mode: z.enum(["single", "multiple"]),
    required: z.boolean(),
    values: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          name: z.string().trim().min(1).max(60),
          price: z.number().int().min(0).max(100000),
        }),
      )
      .min(1)
      .max(20),
  })
  .refine(
    (group) =>
      new Set(group.values.map((value) => value.id)).size ===
      group.values.length,
    "Opções duplicadas.",
  );
export const images = [
  "hero",
  "smash",
  "bacon",
  "fries",
  "chicken",
  "soda",
  "brownie",
] as const;
export const productSchema = z
  .object({
    id: z.uuid(),
    categoryId: z.uuid(),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().min(2).max(280),
    price: z.number().int().min(1).max(1000000),
    image: z.enum(images),
    available: z.boolean(),
    featured: z.boolean(),
    groups: z.array(groupSchema).max(12),
    ingredients: z.array(z.string().trim().min(1).max(60)).max(20),
  })
  .refine(
    (product) =>
      new Set(product.groups.map((group) => group.id)).size ===
      product.groups.length,
    "Grupos duplicados.",
  );
export const settingsSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    hours: z.string().trim().min(2).max(120),
    pickup: z.boolean(),
    delivery: z.boolean(),
    fee: z.number().int().min(0).max(100000),
  })
  .refine(
    (settings) => settings.pickup || settings.delivery,
    "Ative uma modalidade de atendimento.",
  );

export const lineSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(20),
  selections: z.record(z.string().max(80), z.array(z.string().max(80)).max(20)),
  removed: z.array(z.string().max(60)).max(20),
  notes: z.string().trim().max(240),
});
export const customerSchema = z
  .object({
    customer: z.string().trim().min(2, "Informe um nome.").max(80),
    mode: z.enum(["pickup", "delivery"]),
    address: z.string().trim().max(220),
    notes: z.string().trim().max(240),
  })
  .refine((input) => input.mode === "pickup" || input.address.length >= 6, {
    path: ["address"],
    message: "Informe um endereço demonstrativo.",
  });
export const checkoutSchema = customerSchema.and(
  z.object({
    items: z.array(lineSchema).min(1).max(40),
    requestId: z.uuid(),
    expectedTotal: z.number().int().min(0).optional(),
  }),
);
export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Line = z.infer<typeof lineSchema>;
export type Checkout = z.infer<typeof checkoutSchema>;
export type PricedLine = Line & {
  name: string;
  unit: number;
  options: string[];
};
export type Order = Omit<Checkout, "items" | "requestId" | "expectedTotal"> & {
  id: string;
  requestId: string;
  createdAt: string;
  status: Status;
  items: PricedLine[];
  subtotal: number;
  fee: number;
  total: number;
  history: { status: Status; at: string }[];
};
export type Catalog = {
  categories: Category[];
  products: Product[];
  settings: Settings;
};
export type Demo = Catalog & { orders: Order[] };
export type OperationalOrder = Omit<Order, "requestId">;
export type OperationsData = Catalog & { orders: OperationalOrder[] };

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const money = (cents: number) => brl.format(cents / 100);

/** Resolves item options against the current product catalog and returns a price snapshot. */
export function priceLine(line: Line, product: Product): PricedLine {
  let unit = product.price;
  const options: string[] = [];
  const invalid = () =>
    new Error("Revise a personalização de " + product.name + ".");
  if (
    Object.keys(line.selections).some(
      (id) => !product.groups.some((group) => group.id === id),
    )
  )
    throw invalid();
  for (const group of product.groups) {
    const selected = line.selections[group.id] ?? [];
    if (
      (group.required && !selected.length) ||
      (group.mode === "single" && selected.length > 1) ||
      new Set(selected).size !== selected.length
    )
      throw invalid();
    for (const id of selected) {
      const value = group.values.find((option) => option.id === id);
      if (!value) throw invalid();
      unit += value.price;
      options.push(value.name);
    }
  }
  if (
    new Set(line.removed).size !== line.removed.length ||
    line.removed.some((name) => !product.ingredients.includes(name))
  )
    throw invalid();
  return { ...line, name: product.name, unit, options };
}

export function quote(catalog: Catalog, input: Checkout) {
  if (!catalog.settings[input.mode])
    throw new Error("Essa modalidade de atendimento está indisponível.");
  const items = input.items.map((line) => {
    const product = catalog.products.find(
      (item) => item.id === line.productId && item.available,
    );
    if (
      !product ||
      !catalog.categories.some(
        (category) => category.id === product.categoryId && category.active,
      )
    ) {
      throw new Error(
        "Um item do carrinho está indisponível. Revise seu pedido.",
      );
    }
    return priceLine(line, product);
  });
  const subtotal = items.reduce(
    (total, line) => total + line.unit * line.quantity,
    0,
  );
  const fee = input.mode === "delivery" ? catalog.settings.fee : 0;
  const total = subtotal + fee;
  if (input.expectedTotal !== undefined && input.expectedTotal !== total)
    throw new Error(
      "Os valores mudaram. Atualize o cardápio e revise o carrinho.",
    );
  return { items, subtotal, fee, total };
}
