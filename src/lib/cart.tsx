"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createStore, useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Line, PricedLine } from "./domain";

type CartItem = { key: string; line: Line; preview: PricedLine };
type Cart = {
  items: CartItem[];
  save: (line: Line, preview: PricedLine, key?: string) => void;
  remove: (key: string) => void;
  clear: () => void;
};
const makeCart = (namespace: string) =>
  createStore<Cart>()(
    persist(
      (set) => ({
        items: [],
        save: (line, preview, key) =>
          set((state) => ({
            items: key
              ? state.items.map((item) =>
                  item.key === key ? { key, line, preview } : item,
                )
              : state.items.length < 40
                ? [...state.items, { key: crypto.randomUUID(), line, preview }]
                : state.items,
          })),
        remove: (key) =>
          set((state) => ({
            items: state.items.filter((item) => item.key !== key),
          })),
        clear: () => set({ items: [] }),
      }),
      {
        name: "menuverse-cart-v1-" + namespace,
        storage: createJSONStorage(() => sessionStorage),
        skipHydration: true,
      },
    ),
  );

const CartContext = createContext<ReturnType<typeof makeCart> | null>(null);
export function CartProvider({
  namespace,
  children,
}: {
  namespace: string;
  children: React.ReactNode;
}) {
  const [store] = useState(() => makeCart(namespace));
  useEffect(() => {
    void store.persist.rehydrate();
  }, [store]);
  return <CartContext.Provider value={store}>{children}</CartContext.Provider>;
}
export function useCart<T>(select: (state: Cart) => T): T {
  const store = useContext(CartContext);
  if (!store) throw new Error("Carrinho indisponível.");
  return useStore(store, select);
}
