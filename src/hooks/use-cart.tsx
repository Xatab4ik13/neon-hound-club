import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string; // slug + size
  /** uuid товара из бэкенда. Нужен, чтобы оформить заказ. Для исторических локальных позиций может быть undefined. */
  productId?: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string | null;
  qty: number;
  /** Цифровые товары: сколько билетов на розыгрыши начисляется за 1 шт. */
  ticketsBonus?: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "id" | "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "hh:cart:v1";
const CartContext = createContext<CartContextValue | null>(null);

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read());
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("hh:cart:changed"));
    }
  }, []);

  // sync across tabs / components
  useEffect(() => {
    const handler = () => setItems(read());
    window.addEventListener("storage", handler);
    window.addEventListener("hh:cart:changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("hh:cart:changed", handler);
    };
  }, []);

  const add: CartContextValue["add"] = useCallback(
    (item, qty = 1) => {
      const id = `${item.slug}::${item.size ?? "-"}`;
      const next = [...read()];
      const idx = next.findIndex((x) => x.id === id);
      if (idx >= 0) next[idx] = { ...next[idx], qty: next[idx].qty + qty };
      else next.push({ ...item, id, qty });
      persist(next);
    },
    [persist],
  );

  const setQty: CartContextValue["setQty"] = useCallback(
    (id, qty) => {
      const next = read()
        .map((x) => (x.id === id ? { ...x, qty } : x))
        .filter((x) => x.qty > 0);
      persist(next);
    },
    [persist],
  );

  const remove: CartContextValue["remove"] = useCallback(
    (id) => persist(read().filter((x) => x.id !== id)),
    [persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { items, count, total, add, setQty, remove, clear };
  }, [items, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
