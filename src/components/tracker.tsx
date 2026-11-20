"use client";
import { Check, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { money, statuses, statusText, type Order } from "@/lib/domain";

type Progress = Pick<Order, "id" | "status" | "history" | "total" | "mode">;
export function Tracker({
  initial,
  endpoint = "/api/demo",
  demo = true,
}: {
  initial: Progress;
  endpoint?: string;
  demo?: boolean;
}) {
  const [order, setOrder] = useState(initial);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(
          endpoint + "?pedido=" + encodeURIComponent(initial.id),
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        setOrder(await response.json());
        setStale(false);
      } catch {
        if (!controller.signal.aborted) setStale(true);
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 2500);
    }
    timer = setTimeout(refresh, 2500);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [initial.id, endpoint]);
  return (
    <div className="tracker-card">
      <span className="tracker-icon">
        <ShoppingBag size={28} />
      </span>
      <p className="eyebrow">PEDIDO {order.id}</p>
      <h1 aria-live="polite">{statusText[order.status]}</h1>
      <p>
        {order.mode === "pickup"
          ? "Retirada"
          : demo
            ? "Entrega demonstrativa"
            : "Entrega"}{" "}
        · {money(order.total)}
      </p>
      <ol className="timeline">
        {statuses.map((status) => {
          const entry = order.history.find((item) => item.status === status);
          return (
            <li
              key={status}
              className={entry ? "complete" : ""}
              aria-current={status === order.status ? "step" : undefined}
            >
              <span>{entry && <Check size={17} />}</span>
              <strong>{statusText[status]}</strong>
              {entry && (
                <time dateTime={entry.at}>
                  {new Date(entry.at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                  })}
                </time>
              )}
            </li>
          );
        })}
      </ol>
      <small>
        {stale
          ? "Sincronização indisponível. Tentando novamente…"
          : demo
            ? "Pedido demonstrativo. Nenhuma compra foi realizada."
            : "Guarde o código para consultar o pedido neste navegador."}
      </small>
    </div>
  );
}
