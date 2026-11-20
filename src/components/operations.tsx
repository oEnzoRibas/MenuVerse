"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ChefHat,
  ClipboardList,
  Flame,
  Layers3,
  Package,
  Settings2,
} from "lucide-react";
import { Brand, Button } from "./ui";
import { CatalogEditor } from "./catalog-editor";
import {
  categorySchema,
  money,
  nextStatus,
  productSchema,
  settingsSchema,
  statuses,
  statusText,
  type OperationsData,
  type OperationalOrder,
  type Status,
} from "@/lib/domain";
import { sendCommand } from "@/lib/demo-client";

const sections = [
  { id: "overview", label: "Visão geral", icon: BarChart3 },
  { id: "orders", label: "Pedidos", icon: ClipboardList },
  { id: "products", label: "Produtos", icon: Package },
  { id: "categories", label: "Categorias", icon: Layers3 },
  { id: "settings", label: "Configurações", icon: Settings2 },
] as const;
const advanceLabels = {
  received: "Iniciar preparação",
  preparing: "Marcar como pronto",
  ready: "Finalizar pedido",
  finished: "",
};
const localDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function OrderCard({
  order,
  now,
  advance,
  kitchen = false,
}: {
  order: OperationalOrder;
  now: number;
  advance: (order: OperationalOrder) => Promise<void>;
  kitchen?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const minutes = Math.max(
    0,
    Math.floor((now - Date.parse(order.createdAt)) / 60000),
  );
  return (
    <article
      className={
        "order-card " + (order.status === "received" ? "order-new" : "")
      }
    >
      <header>
        <div>
          <small>{order.id}</small>
          <h3>{order.customer}</h3>
        </div>
        <span className={"status status-" + order.status}>
          {statusText[order.status]}
        </span>
      </header>
      <p>
        {order.mode === "pickup" ? "Retirada" : "Entrega"} ·{" "}
        {kitchen
          ? "há " + minutes + " min"
          : dateTime.format(Date.parse(order.createdAt))}
      </p>
      {!kitchen && order.address && <p>{order.address}</p>}
      <ul>
        {order.items.map((item, index) => (
          <li key={index}>
            <strong>
              {item.quantity} × {item.name}
            </strong>
            {!!item.options.length && <small>{item.options.join(" · ")}</small>}
            {!!item.removed.length && (
              <small>Sem {item.removed.join(", ")}</small>
            )}
            {item.notes && <small>{item.notes}</small>}
          </li>
        ))}
      </ul>
      {order.notes && <p className="order-notes">{order.notes}</p>}
      {!kitchen && (
        <>
          <p>
            Total <strong>{money(order.total)}</strong>
          </p>
          <details>
            <summary>Histórico</summary>
            <ol>
              {order.history.map((step) => (
                <li key={step.status}>
                  {statusText[step.status]} ·{" "}
                  {dateTime.format(Date.parse(step.at))}
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {nextStatus(order.status) && (
        <Button
          className="full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await advance(order);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Falha na atualização.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Atualizando…" : advanceLabels[order.status]}
        </Button>
      )}
    </article>
  );
}

function Overview({
  orders,
  now,
  showOrders,
  demo,
}: {
  orders: OperationalOrder[];
  now: number;
  showOrders: () => void;
  demo: boolean;
}) {
  const active = orders.filter((order) => order.status !== "finished").length;
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const stats = [
    ["Pedidos recebidos", orders.length],
    ["Em andamento", active],
    [demo ? "Faturamento demonstrativo" : "Valor dos pedidos", money(revenue)],
    ["Ticket médio", money(Math.round(revenue / (orders.length || 1)))],
  ];
  const counts = new Map<string, number>();
  for (const order of orders)
    for (const item of order.items)
      counts.set(item.name, (counts.get(item.name) ?? 0) + item.quantity);
  const popular = [...counts].toSorted((a, b) => b[1] - a[1]).slice(0, 5);
  const dateCounts = new Map<string, number>();
  for (const order of orders) {
    const day = localDate.format(Date.parse(order.createdAt));
    dateCounts.set(day, (dateCounts.get(day) ?? 0) + 1);
  }
  const days = Array.from({ length: 7 }, (_, index) =>
    localDate.format(now - (6 - index) * 86400000),
  );
  const max = Math.max(1, ...days.map((day) => dateCounts.get(day) ?? 0));
  return (
    <>
      <div className="stats">
        {stats.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="overview-grid">
        <article className="admin-box">
          <h2>Evolução dos pedidos</h2>
          <p>Últimos sete dias</p>
          <div className="data-chart">
            {days.map((day) => {
              const count = dateCounts.get(day) ?? 0;
              return (
                <div key={day}>
                  <strong>{count}</strong>
                  <i style={{ height: Math.max(2, (count / max) * 90) }} />
                  <small>{day}</small>
                </div>
              );
            })}
          </div>
        </article>
        <article className="admin-box">
          <h2>Produtos mais pedidos</h2>
          <ul className="popular-list">
            {popular.map(([name, count]) => (
              <li key={name}>
                <span>{name}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </article>
      </div>
      <article className="admin-box recent">
        <div>
          <h2>Pedidos recentes</h2>
          <Button variant="secondary" onClick={showOrders}>
            Ver todos
          </Button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customer}</td>
                  <td>
                    <span className={"status status-" + order.status}>
                      {statusText[order.status]}
                    </span>
                  </td>
                  <td>{money(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}

export function Operations({
  initial,
  mode,
  endpoint = "/api/demo",
  demo = true,
}: {
  initial: OperationsData;
  mode: "admin" | "kitchen";
  endpoint?: string;
  demo?: boolean;
}) {
  const [state, setState] = useState(initial);
  const [section, setSection] =
    useState<(typeof sections)[number]["id"]>("overview");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [now, setNow] = useState(() =>
    Date.parse(initial.orders[0]?.createdAt ?? "2026-01-01T12:00:00Z"),
  );
  const [stale, setStale] = useState(false);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(endpoint, { signal, cache: "no-store" });
        if (!response.ok) throw new Error();
        setState(await response.json());
        setStale(false);
      } catch {
        if (!signal?.aborted) setStale(true);
      }
    },
    [endpoint],
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function sync() {
      setNow(Date.now());
      await refresh(controller.signal);
      if (!controller.signal.aborted) timer = setTimeout(sync, 3000);
    }
    timer = setTimeout(sync, 20);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [refresh]);

  async function advance(order: OperationalOrder) {
    await sendCommand(
      { action: "advance", id: order.id, from: order.status },
      endpoint,
    );
    await refresh();
  }
  if (mode === "kitchen")
    return (
      <main className="kitchen">
        <div className="wrap">
          <header className="kitchen-header">
            <div>
              <p className="eyebrow">
                <ChefHat size={18} /> FILA DE PRODUÇÃO
              </p>
              <h1>Cozinha</h1>
              <p>{state.settings.name}</p>
            </div>
            <span className="kitchen-live" role="status">
              {stale ? "Reconectando…" : "Sincronização ativa"}
            </span>
          </header>
          <div className="kitchen-grid">
            {statuses.slice(0, 3).map((status) => {
              const orders = state.orders.filter(
                (order) => order.status === status,
              );
              return (
                <section key={status}>
                  <h2>
                    {statusText[status]} <span>{orders.length}</span>
                  </h2>
                  {orders.length ? (
                    orders
                      .toReversed()
                      .map((order) => (
                        <OrderCard
                          key={order.id}
                          kitchen
                          order={order}
                          now={now}
                          advance={advance}
                        />
                      ))
                  ) : (
                    <p className="empty">Nenhum pedido nesta etapa.</p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </main>
    );
  const visible = state.orders.filter(
    (order) => filter === "all" || order.status === filter,
  );
  return (
    <main className="operations">
      <aside className="sidebar">
        <Brand />
        <span>{state.settings.name}</span>
        <nav aria-label="Painel administrativo">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={section === id ? "page" : undefined}
              onClick={() => setSection(id)}
            >
              <Icon size={19} /> {label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="operation-content">
        <header>
          <p className="eyebrow">
            <Flame size={16} /> GESTÃO DO RESTAURANTE
          </p>
          <h1>{sections.find((item) => item.id === section)?.label}</h1>
          {stale && (
            <p className="error" role="status">
              Sincronização indisponível. Tentando novamente…
            </p>
          )}
        </header>
        {section === "overview" && (
          <Overview
            demo={demo}
            orders={state.orders}
            now={now}
            showOrders={() => setSection("orders")}
          />
        )}
        {section === "orders" && (
          <>
            <label className="field order-filter">
              Status
              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as Status | "all")
                }
              >
                <option value="all">Todos os pedidos</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusText[status]}
                  </option>
                ))}
              </select>
            </label>
            {visible.length ? (
              <div className="orders-grid">
                {visible.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    now={now}
                    advance={advance}
                  />
                ))}
              </div>
            ) : (
              <p className="empty">Nenhum pedido neste status.</p>
            )}
          </>
        )}
        {(section === "products" ||
          section === "categories" ||
          section === "settings") && (
          <CatalogEditor
            key={section}
            section={section}
            state={state}
            save={async (action, data) => {
              const schema =
                action === "product"
                  ? productSchema
                  : action === "category"
                    ? categorySchema
                    : settingsSchema;
              await sendCommand({ action, data: schema.parse(data) }, endpoint);
              await refresh();
            }}
          />
        )}
      </div>
    </main>
  );
}
