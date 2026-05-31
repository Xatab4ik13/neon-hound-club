// Гибридная корзина:
//  - Гость → localStorage (быстро, без сети).
//  - Залогиненный → серверная корзина (/api/v1/cart). localStorage в этот момент не пишется.
//  - При переходе guest → authed: автоматически мержим локалку через POST /cart/merge и чистим её.
//
// Публичный API совместим со старым: items / count / total / add / setQty / remove / clear.
// Дополнительно отдаём loading, чтобы UI мог показать состояние ожидания серверной операции.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useViewer } from "@/hooks/use-viewer";

export type CartItem = {
  id: string;
  productId?: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string | null;
  qty: number;
  ticketsBonus?: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  loading: boolean;
  add: (item: Omit<CartItem, "id" | "qty">, qty?: number) => Promise<void> | void;
  setQty: (id: string, qty: number) => Promise<void> | void;
  remove: (id: string) => Promise<void> | void;
  clear: () => Promise<void> | void;
};

const STORAGE_KEY = "hh:cart:v1";
const CartContext = createContext<CartContextValue | null>(null);

// ---------- local storage helpers ----------

function readLocal(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocal(next: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("hh:cart:changed"));
}

function clearLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("hh:cart:changed"));
}

function localId(slug: string, size: string | null) {
  return `${slug}::${size ?? "-"}`;
}

// ---------- server types ----------

type ServerCartLine = {
  id: string;
  productId: string;
  slug: string;
  title: string;
  image: string | null;
  priceRub: number;
  bonusTickets: number;
  size: string | null;
  qty: number;
  active: boolean;
  stockAvailable: number | null;
};

type ServerCartResp = { items: ServerCartLine[]; totalRub: number };

function lineToItem(l: ServerCartLine): CartItem {
  return {
    id: l.id,
    productId: l.productId,
    slug: l.slug,
    name: l.title,
    price: l.priceRub,
    image: l.image ?? "",
    size: l.size,
    qty: l.qty,
    ticketsBonus: l.bonusTickets,
  };
}

// ---------- provider ----------

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthed, hydrated } = useViewer();
  const qc = useQueryClient();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const mergedRef = useRef(false); // мержим локалку 1 раз за сессию

  // ---------- guest: читаем localStorage ----------
  useEffect(() => {
    if (isAuthed) return;
    setItems(readLocal());
    const onChange = () => setItems(readLocal());
    window.addEventListener("storage", onChange);
    window.addEventListener("hh:cart:changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("hh:cart:changed", onChange);
    };
  }, [isAuthed]);

  // ---------- authed: подтянуть серверную корзину + смержить локалку ----------
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed) {
      mergedRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Однократный merge локальной корзины при первом входе.
        const local = readLocal().filter((i) => i.productId);
        if (!mergedRef.current && local.length > 0) {
          mergedRef.current = true;
          try {
            const resp = await apiFetch<ServerCartResp>("/api/v1/cart/merge", {
              method: "POST",
              body: JSON.stringify({
                items: local.map((i) => ({
                  productId: i.productId!,
                  qty: i.qty,
                  size: i.size,
                })),
              }),
            });
            clearLocal();
            if (!cancelled) setItems(resp.items.map(lineToItem));
            return;
          } catch {
            // мерж не критичен — продолжаем обычной загрузкой
          }
        }
        mergedRef.current = true;
        const resp = await apiFetch<ServerCartResp>("/api/v1/cart");
        if (!cancelled) setItems(resp.items.map(lineToItem));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, hydrated]);

  // ---------- mutations ----------

  const applyServer = useCallback((resp: ServerCartResp) => {
    setItems(resp.items.map(lineToItem));
  }, []);

  const add: CartContextValue["add"] = useCallback(
    async (item, qty = 1) => {
      if (isAuthed) {
        if (!item.productId) return; // на сервер без productId уйти не может
        setLoading(true);
        try {
          const resp = await apiFetch<ServerCartResp>("/api/v1/cart/items", {
            method: "POST",
            body: JSON.stringify({
              productId: item.productId,
              qty,
              size: item.size,
            }),
          });
          applyServer(resp);
        } finally {
          setLoading(false);
        }
        return;
      }
      // guest
      const id = localId(item.slug, item.size);
      const cur = readLocal();
      const idx = cur.findIndex((x) => x.id === id);
      if (idx >= 0) cur[idx] = { ...cur[idx], qty: cur[idx].qty + qty };
      else cur.push({ ...item, id, qty });
      writeLocal(cur);
    },
    [isAuthed, applyServer],
  );

  const setQty: CartContextValue["setQty"] = useCallback(
    async (id, qty) => {
      if (isAuthed) {
        setLoading(true);
        try {
          const resp = await apiFetch<ServerCartResp>(`/api/v1/cart/items/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ qty: Math.max(0, qty) }),
          });
          applyServer(resp);
        } finally {
          setLoading(false);
        }
        return;
      }
      const next = readLocal()
        .map((x) => (x.id === id ? { ...x, qty } : x))
        .filter((x) => x.qty > 0);
      writeLocal(next);
    },
    [isAuthed, applyServer],
  );

  const remove: CartContextValue["remove"] = useCallback(
    async (id) => {
      if (isAuthed) {
        setLoading(true);
        try {
          const resp = await apiFetch<ServerCartResp>(`/api/v1/cart/items/${id}`, {
            method: "DELETE",
          });
          applyServer(resp);
        } finally {
          setLoading(false);
        }
        return;
      }
      writeLocal(readLocal().filter((x) => x.id !== id));
    },
    [isAuthed, applyServer],
  );

  const clear: CartContextValue["clear"] = useCallback(async () => {
    if (isAuthed) {
      setLoading(true);
      try {
        await apiFetch("/api/v1/cart", { method: "DELETE" });
        setItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    clearLocal();
    setItems([]);
  }, [isAuthed]);

  // Сброс на логаут — чтобы не показывать чужие позиции до перезагрузки.
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed) {
      // если логаут — состояние возьмётся из localStorage эффектом выше
      qc.removeQueries({ queryKey: ["cart"] });
    }
  }, [isAuthed, hydrated, qc]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { items, count, total, loading, add, setQty, remove, clear };
  }, [items, loading, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
