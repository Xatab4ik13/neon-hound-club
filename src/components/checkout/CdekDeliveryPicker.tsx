/**
 * Виджет выбора доставки СДЭК на чекауте.
 * - Автокомплит города (СДЭК /location/cities).
 * - Переключатель ПВЗ / Курьер.
 * - Если ПВЗ: список пунктов выдачи с адресом и временем работы.
 * - Если Курьер: одно поле адреса (улица, дом, кв.).
 *
 * Возвращает родителю своё состояние через onChange.
 * Родитель сам вызывает /api/v1/cdek/calculate и показывает цену.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, MapPin, Search, Truck } from "lucide-react";
import { apiFetch } from "@/lib/api";

export type CdekPickerState = {
  cityCode: number | null;
  cityName: string;
  mode: "pvz" | "courier";
  pvzCode: string | null;
  pvzAddress: string | null;
  street: string;
};

type CityItem = {
  code: number;
  city: string;
  region: string;
  postalCodes: string[];
};

type PvzItem = {
  code: string;
  name: string;
  address: string;
  workTime: string;
  lat: number;
  lng: number;
};

export const EMPTY_CDEK_STATE: CdekPickerState = {
  cityCode: null,
  cityName: "",
  mode: "pvz",
  pvzCode: null,
  pvzAddress: null,
  street: "",
};

export function CdekDeliveryPicker({
  value,
  onChange,
}: {
  value: CdekPickerState;
  onChange: (next: CdekPickerState) => void;
}) {
  const [cityQ, setCityQ] = useState(value.cityName);
  const [cityOpts, setCityOpts] = useState<CityItem[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const [pvzList, setPvzList] = useState<PvzItem[]>([]);
  const [pvzLoading, setPvzLoading] = useState(false);
  const [pvzError, setPvzError] = useState<string | null>(null);
  const [pvzFilter, setPvzFilter] = useState("");

  // Дебаунс поиска города.
  useEffect(() => {
    if (cityQ.trim().length < 2) {
      setCityOpts([]);
      return;
    }
    const t = setTimeout(async () => {
      setCityLoading(true);
      try {
        const r = await apiFetch<{ items: CityItem[] }>(
          `/api/v1/cdek/cities?q=${encodeURIComponent(cityQ.trim())}`,
        );
        setCityOpts(r.items ?? []);
      } catch {
        setCityOpts([]);
      } finally {
        setCityLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [cityQ]);

  // При смене города — загружаем ПВЗ.
  useEffect(() => {
    if (!value.cityCode || value.mode !== "pvz") {
      setPvzList([]);
      return;
    }
    let cancelled = false;
    setPvzLoading(true);
    setPvzError(null);
    apiFetch<{ items: PvzItem[] }>(`/api/v1/cdek/pvz?cityCode=${value.cityCode}`)
      .then((r) => {
        if (cancelled) return;
        setPvzList(r.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setPvzError("Не удалось загрузить пункты выдачи");
        setPvzList([]);
      })
      .finally(() => {
        if (!cancelled) setPvzLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value.cityCode, value.mode]);

  const filteredPvz = useMemo(() => {
    const q = pvzFilter.trim().toLowerCase();
    if (!q) return pvzList;
    return pvzList.filter(
      (p) =>
        p.address.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q),
    );
  }, [pvzList, pvzFilter]);

  const pickCity = (c: CityItem) => {
    setCityQ(`${c.city}, ${c.region}`);
    setCityOpen(false);
    onChange({
      ...value,
      cityCode: c.code,
      cityName: c.city,
      pvzCode: null,
      pvzAddress: null,
    });
  };

  const setMode = (mode: "pvz" | "courier") => {
    onChange({ ...value, mode, pvzCode: mode === "pvz" ? value.pvzCode : null });
  };

  const pickPvz = (p: PvzItem) => {
    onChange({ ...value, pvzCode: p.code, pvzAddress: p.address });
  };

  return (
    <div className="space-y-4">
      {/* Город */}
      <div className="relative">
        <label className="mb-1 block px-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Город
        </label>
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-card/40 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={cityQ}
            onChange={(e) => {
              setCityQ(e.target.value);
              setCityOpen(true);
              if (value.cityCode) {
                onChange({ ...value, cityCode: null, cityName: "", pvzCode: null, pvzAddress: null });
              }
            }}
            onFocus={() => setCityOpen(true)}
            onBlur={() => setTimeout(() => setCityOpen(false), 120)}
            placeholder="Москва, Краснодар, …"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          {cityLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          {value.cityCode && !cityLoading && <Check className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        {cityOpen && cityOpts.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-white/10 bg-background/95 shadow-lg backdrop-blur">
            {cityOpts.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickCity(c)}
                  className="block w-full px-3 py-2 text-left text-[14px] hover:bg-primary/10"
                >
                  <div className="font-semibold text-foreground">{c.city}</div>
                  <div className="text-[11px] text-muted-foreground">{c.region}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Переключатель режима */}
      <div className="grid grid-cols-2 gap-2">
        <ModeBtn
          active={value.mode === "pvz"}
          onClick={() => setMode("pvz")}
          icon={<MapPin className="h-4 w-4" />}
          title="Пункт выдачи"
          hint="Дешевле"
        />
        <ModeBtn
          active={value.mode === "courier"}
          onClick={() => setMode("courier")}
          icon={<Truck className="h-4 w-4" />}
          title="Курьер"
          hint="До двери"
        />
      </div>

      {/* ПВЗ-список */}
      {value.mode === "pvz" && value.cityCode != null && (
        <div className="rounded-2xl border border-white/[0.06] bg-card/40">
          <div className="border-b border-white/[0.05] px-3 py-2">
            <input
              value={pvzFilter}
              onChange={(e) => setPvzFilter(e.target.value)}
              placeholder="Поиск по адресу…"
              className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
          </div>
          <div className="max-h-72 overflow-auto">
            {pvzLoading && (
              <div className="flex items-center gap-2 px-3 py-4 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Загружаем пункты выдачи…
              </div>
            )}
            {pvzError && <div className="px-3 py-4 text-[13px] text-destructive">{pvzError}</div>}
            {!pvzLoading && !pvzError && filteredPvz.length === 0 && (
              <div className="px-3 py-4 text-[13px] text-muted-foreground">
                Ничего не найдено
              </div>
            )}
            <ul className="divide-y divide-white/[0.05]">
              {filteredPvz.slice(0, 50).map((p) => {
                const picked = value.pvzCode === p.code;
                return (
                  <li key={p.code}>
                    <button
                      type="button"
                      onClick={() => pickPvz(p)}
                      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition ${
                        picked ? "bg-primary/[0.1]" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                          picked ? "border-primary bg-primary text-primary-foreground" : "border-white/20"
                        }`}
                      >
                        {picked && <Check className="h-3 w-3" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-foreground">
                          {p.name}
                        </div>
                        <div className="text-[12px] leading-snug text-muted-foreground">
                          {p.address}
                        </div>
                        {p.workTime && (
                          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
                            {p.workTime}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Курьер: адрес */}
      {value.mode === "courier" && value.cityCode != null && (
        <div>
          <label className="mb-1 block px-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Улица, дом, квартира
          </label>
          <input
            value={value.street}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            placeholder="ул. Красная, 1, кв. 12"
            className="w-full rounded-2xl border border-white/[0.08] bg-card/40 px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
          />
        </div>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition ${
        active
          ? "border-primary/60 bg-primary/[0.1]"
          : "border-white/[0.08] bg-card/40 hover:border-white/[0.16]"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          active ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-muted-foreground"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
    </button>
  );
}
