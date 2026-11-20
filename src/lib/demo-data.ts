import {
  type Catalog,
  type Demo,
  type Product,
  type Status,
  quote,
  statuses,
} from "./domain";

const id = (n: number) =>
  "699a9000-1f42-462d-9cdf-" + String(n).padStart(12, "0");
const size = {
  id: "size",
  name: "Escolha o tamanho",
  mode: "single" as const,
  required: true,
  values: [
    { id: "single", name: "Simples", price: 0 },
    { id: "double", name: "Duplo", price: 1000 },
  ],
};
const extras = {
  id: "extra",
  name: "Complementos",
  mode: "multiple" as const,
  required: false,
  values: [
    { id: "bacon", name: "Bacon crocante", price: 600 },
    { id: "cheese", name: "Queijo extra", price: 400 },
  ],
};
function product(
  n: number,
  category: number,
  name: string,
  description: string,
  price: number,
  image: Product["image"],
  options: Partial<Product> = {},
): Product {
  return {
    id: id(n),
    categoryId: id(category),
    name,
    description,
    price,
    image,
    available: true,
    featured: false,
    groups: [],
    ingredients: [],
    ...options,
  };
}
export const baseCatalog: Catalog = {
  settings: {
    name: "Brasa & Co.",
    hours: "Ter a dom · 18h às 23h",
    pickup: true,
    delivery: true,
    fee: 790,
  },
  categories: ["Burgers", "Acompanhamentos", "Bebidas", "Sobremesas"].map(
    (name, i) => ({ id: id(i + 1), name, position: i, active: true }),
  ),
  products: [
    product(
      11,
      1,
      "Brasa Original",
      "Smash de 120 g na chapa, cheddar derretido, picles e molho da casa no brioche tostado.",
      3290,
      "smash",
      {
        featured: true,
        groups: [size, extras],
        ingredients: ["Cheddar", "Picles", "Molho da casa"],
      },
    ),
    product(
      12,
      1,
      "Bacon & Fumaça",
      "Smash de 120 g, bacon crocante, cebola caramelizada e barbecue defumado.",
      3890,
      "bacon",
      {
        featured: true,
        groups: [size, extras],
        ingredients: ["Bacon", "Cebola caramelizada", "Barbecue"],
      },
    ),
    product(
      13,
      2,
      "Fritas da Casa",
      "Batatas douradas, flor de sal e uma pitada de páprica defumada.",
      1690,
      "fries",
      {
        groups: [
          {
            ...size,
            name: "Porção",
            values: [
              { id: "single", name: "Individual", price: 0 },
              { id: "double", name: "Para compartilhar", price: 800 },
            ],
          },
        ],
      },
    ),
    product(
      14,
      2,
      "Frango Crocante",
      "Pedaços de frango empanado e maionese cítrica da casa.",
      2490,
      "chicken",
      { ingredients: ["Maionese cítrica"] },
    ),
    product(
      15,
      3,
      "Refrigerante",
      "Lata de 350 ml servida bem gelada.",
      790,
      "soda",
      {
        groups: [
          {
            id: "sabor",
            name: "Sabor",
            mode: "single",
            required: true,
            values: [
              { id: "cola", name: "Cola", price: 0 },
              { id: "zero", name: "Cola zero", price: 0 },
            ],
          },
        ],
      },
    ),
    product(
      16,
      4,
      "Brownie de Chocolate",
      "Chocolate intenso, casquinha fina e centro macio.",
      1490,
      "brownie",
      { available: false },
    ),
  ],
};

export function seedDemo(): Demo {
  const catalog = structuredClone(baseCatalog);
  const names = ["Alex", "Dani", "Chris", "Gabi", "Cris", "Bia", "Fran", "Jo"];
  const orders = names.map((customer, i) => {
    const status: Status = i < 3 ? statuses[i] : "finished";
    const elapsed = i < 3 ? (i + 1) * 3 * 60000 : (i - 2) * 86400000;
    const placed = Date.now() - elapsed;
    const createdAt = new Date(placed).toISOString();
    const requestId = id(101 + i);
    const input = {
      requestId,
      customer,
      mode: "pickup" as const,
      address: "",
      notes: "",
      items: [
        {
          productId: id(11 + (i % 2)),
          quantity: (i % 3) + 1,
          selections: { size: ["single"] },
          removed: [],
          notes: "",
        },
      ],
    };
    return {
      ...input,
      ...quote(catalog, input),
      id: "MV-" + (1001 + i),
      status,
      createdAt,
      history: statuses
        .slice(0, statuses.indexOf(status) + 1)
        .map((step, index) => ({
          status: step,
          at: new Date(placed + index * 60000).toISOString(),
        })),
    };
  });
  return { ...catalog, orders };
}
