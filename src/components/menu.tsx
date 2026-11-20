"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { motion } from "motion/react";
import {
  Clock3,
  Flame,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Brand, Button } from "./ui";
import { CartProvider, useCart } from "@/lib/cart";
import {
  customerSchema,
  money,
  priceLine,
  type Catalog,
  type Line,
  type Product,
} from "@/lib/domain";
import { sendCommand } from "@/lib/demo-client";

function DialogFrame({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" aria-label="Fechar">
                <X size={22} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function Customize({
  product,
  existing,
  onClose,
  onSave,
}: {
  product: Product;
  existing?: Line;
  onClose: () => void;
  onSave: (line: Line) => void;
}) {
  const [line, setLine] = useState<Line>(() => {
    const selections = Object.fromEntries(
      product.groups.map((group) => {
        const previous = (existing?.selections[group.id] ?? []).filter((id) =>
          group.values.some((value) => value.id === id),
        );
        const values =
          group.mode === "single" ? previous.slice(0, 1) : previous;
        if (!values.length && group.required && group.mode === "single")
          values.push(group.values[0].id);
        return [group.id, values];
      }),
    );
    return {
      productId: product.id,
      quantity: existing?.quantity ?? 1,
      notes: existing?.notes ?? "",
      removed:
        existing?.removed.filter((name) =>
          product.ingredients.includes(name),
        ) ?? [],
      selections,
    };
  });
  const [error, setError] = useState("");
  let total = product.price * line.quantity;
  try {
    total = priceLine(line, product).unit * line.quantity;
  } catch {
    /* Incomplete choice. */
  }
  return (
    <DialogFrame
      title={product.name}
      description={product.description}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            priceLine(line, product);
            onSave(line);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        {product.groups.map((group) => (
          <fieldset key={group.id}>
            <legend>
              {group.name}{" "}
              <small>{group.required ? "Obrigatório" : "Opcional"}</small>
            </legend>
            {group.mode === "single" && !group.required && (
              <label className="choice">
                <input
                  type="radio"
                  name={group.id}
                  checked={!line.selections[group.id]?.length}
                  onChange={() =>
                    setLine({
                      ...line,
                      selections: { ...line.selections, [group.id]: [] },
                    })
                  }
                />{" "}
                Sem adicional
              </label>
            )}
            {group.values.map((value) => (
              <label className="choice" key={value.id}>
                <input
                  type={group.mode === "single" ? "radio" : "checkbox"}
                  name={group.id}
                  checked={
                    line.selections[group.id]?.includes(value.id) ?? false
                  }
                  onChange={(event) => {
                    const picked = line.selections[group.id] ?? [];
                    const selected =
                      group.mode === "single"
                        ? [value.id]
                        : event.target.checked
                          ? [...picked, value.id]
                          : picked.filter((id) => id !== value.id);
                    setLine({
                      ...line,
                      selections: { ...line.selections, [group.id]: selected },
                    });
                  }}
                />
                <span>{value.name}</span>
                <small>{value.price > 0 ? "+" + money(value.price) : ""}</small>
              </label>
            ))}
          </fieldset>
        ))}
        {!!product.ingredients.length && (
          <fieldset>
            <legend>
              Remover ingredientes <small>Opcional</small>
            </legend>
            {product.ingredients.map((name) => (
              <label className="choice" key={name}>
                <input
                  type="checkbox"
                  checked={line.removed.includes(name)}
                  onChange={(event) =>
                    setLine({
                      ...line,
                      removed: event.target.checked
                        ? [...line.removed, name]
                        : line.removed.filter((item) => item !== name),
                    })
                  }
                />{" "}
                Sem {name}
              </label>
            ))}
          </fieldset>
        )}
        <label className="field">
          Observações{" "}
          <textarea
            maxLength={240}
            value={line.notes}
            onChange={(event) =>
              setLine({ ...line, notes: event.target.value })
            }
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <div className="stepper">
            <button
              type="button"
              aria-label="Diminuir quantidade"
              disabled={line.quantity <= 1}
              onClick={() => setLine({ ...line, quantity: line.quantity - 1 })}
            >
              <Minus size={16} />
            </button>
            <output aria-label="Quantidade">{line.quantity}</output>
            <button
              type="button"
              aria-label="Aumentar quantidade"
              disabled={line.quantity >= 20}
              onClick={() => setLine({ ...line, quantity: line.quantity + 1 })}
            >
              <Plus size={16} />
            </button>
          </div>
          <Button>
            {existing ? "Salvar item" : "Adicionar ao carrinho"} ·{" "}
            {money(total)}
          </Button>
        </div>
      </form>
    </DialogFrame>
  );
}

function CheckoutForm({
  catalog,
  onClose,
  endpoint,
  orderPath,
  demo,
}: {
  catalog: Catalog;
  onClose: () => void;
  endpoint: string;
  orderPath: string;
  demo: boolean;
}) {
  const router = useRouter();
  const items = useCart((state) => state.items);
  const clear = useCart((state) => state.clear);
  const [error, setError] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  const { register, handleSubmit, control, formState } = useForm<
    z.infer<typeof customerSchema>
  >({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer: "",
      mode: catalog.settings.pickup ? "pickup" : "delivery",
      address: "",
      notes: "",
    },
  });
  const mode = useWatch({ control, name: "mode" });
  const subtotal = items.reduce(
    (sum, item) => sum + item.preview.unit * item.line.quantity,
    0,
  );
  const fee = mode === "delivery" ? catalog.settings.fee : 0;
  const submit = handleSubmit(async (data) => {
    setError("");
    try {
      const result = await sendCommand(
        {
          action: "checkout",
          data: {
            ...data,
            items: items.map((item) => item.line),
            requestId,
            expectedTotal: subtotal + fee,
          },
        },
        endpoint,
      );
      clear();
      router.push(orderPath + result.id);
    } catch (err) {
      setError((err as Error).message);
    }
  });
  return (
    <DialogFrame
      title="Confirmar pedido"
      description={
        demo
          ? "Use dados fictícios. A demonstração não gera cobrança."
          : "Confira os dados antes de enviar o pedido."
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label className="field">
          Nome do cliente
          <input
            maxLength={80}
            placeholder="Ex.: Alex"
            {...register("customer")}
          />
        </label>
        {formState.errors.customer && (
          <p className="error" role="alert">
            {formState.errors.customer.message}
          </p>
        )}
        <fieldset>
          <legend>Como deseja receber?</legend>
          {catalog.settings.pickup && (
            <label className="choice">
              <input type="radio" value="pickup" {...register("mode")} />{" "}
              Retirada
            </label>
          )}
          {catalog.settings.delivery && (
            <label className="choice">
              <input type="radio" value="delivery" {...register("mode")} />{" "}
              {demo ? "Entrega demonstrativa" : "Entrega"}
            </label>
          )}
        </fieldset>
        {mode === "delivery" && (
          <label className="field">
            {demo ? "Endereço demonstrativo" : "Endereço"}
            <input
              maxLength={220}
              placeholder="Ex.: Rua Exemplo, 123"
              {...register("address")}
            />
            {formState.errors.address && (
              <span className="error">{formState.errors.address.message}</span>
            )}
          </label>
        )}
        <label className="field">
          Observações do pedido
          <textarea maxLength={240} {...register("notes")} />
        </label>
        <ul className="checkout-items">
          {items.map((item) => (
            <li key={item.key}>
              {item.line.quantity} × {item.preview.name}
              <span>{money(item.preview.unit * item.line.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="totals">
          <p>
            Subtotal <span>{money(subtotal)}</span>
          </p>
          {mode === "delivery" && (
            <p>
              {demo ? "Taxa demonstrativa" : "Taxa de entrega"}{" "}
              <span>{money(fee)}</span>
            </p>
          )}
          <strong>
            Total <span>{money(subtotal + fee)}</span>
          </strong>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button
          className="full"
          disabled={formState.isSubmitting || !items.length}
        >
          {formState.isSubmitting
            ? "Enviando…"
            : demo
              ? "Confirmar pedido demonstrativo"
              : "Enviar pedido"}
        </Button>
      </form>
    </DialogFrame>
  );
}

type MenuProps = {
  catalog: Catalog;
  endpoint?: string;
  orderPath?: string;
  namespace?: string;
  demo?: boolean;
};
export function Menu({ namespace = "demo", ...props }: MenuProps) {
  return (
    <CartProvider key={namespace} namespace={namespace}>
      <MenuContent {...props} />
    </CartProvider>
  );
}
function MenuContent({
  catalog,
  endpoint = "/api/demo",
  orderPath = "/pedido/",
  demo = true,
}: MenuProps) {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"cart" | "checkout" | null>(null);
  const [editing, setEditing] = useState<{
    product: Product;
    line?: Line;
    key?: string;
  }>();
  const { items, save, remove } = useCart((state) => state);
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  const categories = catalog.categories
    .filter((item) => item.active)
    .toSorted((a, b) => a.position - b.position);
  const products = catalog.products.filter(
    (product) =>
      categories.some((item) => item.id === product.categoryId) &&
      (!category || product.categoryId === category) &&
      normalize(product.name).includes(normalize(search.trim())),
  );
  const filtered = Boolean(category || search.trim());
  const count = items.reduce((sum, item) => sum + item.line.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.preview.unit * item.line.quantity,
    0,
  );

  function cards(list: Product[]) {
    return (
      <div className="product-grid">
        {list.map((product) => (
          <motion.article
            layout="position"
            className={
              "product-card" + (product.available ? "" : " unavailable")
            }
            key={product.id}
          >
            <div className="product-photo">
              <Image
                src={"/food/" + product.image + ".webp"}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 370px"
              />
              {product.featured && (
                <span className="product-label">
                  <Flame size={14} /> Popular
                </span>
              )}
            </div>
            <div className="product-body">
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div>
                <strong>{money(product.price)}</strong>
                <button
                  className="add-button"
                  aria-label={
                    product.available
                      ? "Personalizar " + product.name
                      : product.name + " indisponível"
                  }
                  disabled={!product.available || items.length >= 40}
                  onClick={() => setEditing({ product })}
                >
                  {product.available ? <Plus size={22} /> : "Indisponível"}
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    );
  }

  return (
    <>
      <header className="menu-header wrap">
        <Brand />
        <Button variant="secondary" onClick={() => setView("cart")}>
          <ShoppingBag size={18} /> Carrinho{" "}
          <span className="count">{count}</span>
        </Button>
      </header>
      <main className="wrap menu-main">
        <section className="restaurant-banner">
          <Image
            src="/food/hero.webp"
            alt=""
            fill
            preload
            sizes="(max-width: 760px) 100vw, 1180px"
          />
          <div>
            <span className="eyebrow">
              <Flame size={16} /> HAMBURGUERIA ARTESANAL
            </span>
            <h1>{catalog.settings.name}</h1>
            <p>Smash, fumaça e sabor de verdade.</p>
            <span className="restaurant-hours">
              <Clock3 size={17} /> {catalog.settings.hours}
            </span>
          </div>
        </section>
        <div className="menu-tools">
          <div className="section-heading">
            <p className="eyebrow">ESCOLHA O SEU PEDIDO</p>
            <h2>Cardápio</h2>
          </div>
          <label className="search">
            <Search size={20} />
            <input
              type="search"
              aria-label="Buscar por nome"
              placeholder="Buscar no cardápio"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        <nav className="filters" aria-label="Filtrar por categoria">
          <button aria-pressed={!category} onClick={() => setCategory("")}>
            Todos
          </button>
          {categories.map((item) => (
            <button
              aria-pressed={category === item.id}
              key={item.id}
              onClick={() => setCategory(item.id)}
            >
              {item.name}
            </button>
          ))}
        </nav>
        {!products.length && (
          <p className="empty">Nenhum produto encontrado.</p>
        )}
        {filtered ? (
          cards(products)
        ) : (
          <>
            {products.some((item) => item.featured) && (
              <section className="catalog-section">
                <h2>Os mais pedidos</h2>
                {cards(products.filter((item) => item.featured))}
              </section>
            )}
            {categories.map((item) => {
              const list = products.filter(
                (product) =>
                  product.categoryId === item.id && !product.featured,
              );
              return list.length ? (
                <section className="catalog-section" key={item.id}>
                  <h2>{item.name}</h2>
                  {cards(list)}
                </section>
              ) : null;
            })}
          </>
        )}
      </main>
      {!!count && (
        <div className="floating-cart">
          <Button onClick={() => setView("cart")}>
            <ShoppingBag size={19} /> Ver carrinho{" "}
            <span>
              {count} · {money(subtotal)}
            </span>
          </Button>
        </div>
      )}
      {editing && (
        <Customize
          product={editing.product}
          existing={editing.line}
          onClose={() => setEditing(undefined)}
          onSave={(line) => {
            save(line, priceLine(line, editing.product), editing.key);
            setEditing(undefined);
            if (editing.key) setView("cart");
          }}
        />
      )}
      {!editing && view === "cart" && (
        <DialogFrame
          title="Seu carrinho"
          description={
            count
              ? count + (count === 1 ? " item" : " itens")
              : "Escolha seus itens no cardápio."
          }
          onClose={() => setView(null)}
        >
          {!count && (
            <Button onClick={() => setView(null)}>Voltar ao cardápio</Button>
          )}
          {items.map((item) => (
            <div className="cart-line" key={item.key}>
              <div>
                <strong>
                  {item.line.quantity} × {item.preview.name}
                </strong>
                <small>{item.preview.options.join(" · ")}</small>
                {!!item.line.removed.length && (
                  <small>Sem {item.line.removed.join(", ")}</small>
                )}
                {item.line.notes && <small>{item.line.notes}</small>}
                <span>{money(item.preview.unit * item.line.quantity)}</span>
              </div>
              <div>
                <Button
                  variant="quiet"
                  disabled={
                    !catalog.products.some(
                      (product) =>
                        product.id === item.line.productId && product.available,
                    )
                  }
                  onClick={() => {
                    const product = catalog.products.find(
                      (entry) => entry.id === item.line.productId,
                    );
                    if (product)
                      setEditing({ product, line: item.line, key: item.key });
                  }}
                >
                  Editar
                </Button>
                <button
                  className="icon-button"
                  aria-label={"Remover " + item.preview.name}
                  onClick={() => remove(item.key)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {!!count && (
            <>
              <div className="totals">
                <strong>
                  Subtotal <span>{money(subtotal)}</span>
                </strong>
              </div>
              <Button className="full" onClick={() => setView("checkout")}>
                Ir para checkout
              </Button>
            </>
          )}
        </DialogFrame>
      )}
      {view === "checkout" && (
        <CheckoutForm
          catalog={catalog}
          endpoint={endpoint}
          orderPath={orderPath}
          demo={demo}
          onClose={() => setView("cart")}
        />
      )}
    </>
  );
}
