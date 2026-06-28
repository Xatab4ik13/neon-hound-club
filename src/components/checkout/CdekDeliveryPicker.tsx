/**
 * Виджет выбора доставки СДЭК на чекауте.
 * - Автокомплит города (СДЭК /location/cities).
 * - Переключатель ПВЗ / Курьер.
 * - Если ПВЗ: интерактивная карта Яндекса с маркерами всех ПВЗ города + карточка выбранного.
 * - Если Курьер: одно поле адреса (улица, дом, кв.).
 *
 * Возвращает родителю своё состояние через onChange.
 * Родитель сам вызывает /api/v1/cdek/calculate и показывает цену.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, MapPin, Search, Truck, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { loadYandexMaps } from "@/lib/yandex-maps";

export type CdekPickerState = {
  cityCode: number | null;
  cityName: string;
  mode: "pvz" | "courier";
  pvzCode: string | null;
  pvzAddress: string | null;
  street: string;
  apartment: string;
  entrance: string;
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
  apartment: "",
  entrance: "",
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

  const pickedPvz = useMemo(
    () => pvzList.find((p) => p.code === value.pvzCode) ?? null,
    [pvzList, value.pvzCode],
  );

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

      {/* ПВЗ-карта */}
      {value.mode === "pvz" && value.cityCode != null && (
        <div className="space-y-3">
          <PvzMap
            items={pvzList}
            loading={pvzLoading}
            error={pvzError}
            selectedCode={value.pvzCode}
            onPick={pickPvz}
          />
          {pickedPvz && (
            <div className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/[0.06] px-3 py-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-foreground">
                  {pickedPvz.name}
                </div>
                <div className="text-[12px] leading-snug text-muted-foreground">
                  {pickedPvz.address}
                </div>
                {pickedPvz.workTime && (
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
                    {pickedPvz.workTime}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...value, pvzCode: null, pvzAddress: null })}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                aria-label="Сбросить выбор"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
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

/**
 * Карта ПВЗ. Создаётся один раз при первой готовности контейнера, потом
 * только обновляются маркеры в кластерере. Если ключ Яндекса не задан или
 * скрипт упал — показываем fallback-список, чтобы заказы не блокировать.
 */
function PvzMap({
  items,
  loading,
  error,
  selectedCode,
  onPick,
}: {
  items: PvzItem[];
  loading: boolean;
  error: string | null;
  selectedCode: string | null;
  onPick: (p: PvzItem) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const placemarksRef = useRef<Map<string, any>>(new Map());
  const onPickRef = useRef(onPick);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Инициализация карты (один раз).
  useEffect(() => {
    let cancelled = false;
    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = new ymaps.Map(containerRef.current, {
          center: [55.751244, 37.618423], // Москва — временный центр, ниже подгоним по bbox
          zoom: 10,
          controls: ["zoomControl", "geolocationControl"],
        }, {
          suppressMapOpenBlock: true,
        });
        // На мобиле скроллим страницу, не карту.
        map.behaviors.disable("scrollZoom");
        const clusterer = new ymaps.Clusterer({
          preset: "islands#invertedRedClusterIcons",
          groupByCoordinates: false,
          clusterDisableClickZoom: false,
        });
        map.geoObjects.add(clusterer);
        mapRef.current = map;
        clustererRef.current = clusterer;
        setMapReady(true);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[CdekDeliveryPicker] ymaps load failed:", e);
        setMapError("Карта недоступна, выбери ПВЗ из списка ниже");
      });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch {}
        mapRef.current = null;
        clustererRef.current = null;
        placemarksRef.current.clear();
      }
    };
  }, []);

  // Обновление маркеров при смене items.
  useEffect(() => {
    if (!mapReady || !clustererRef.current || !mapRef.current || !window.ymaps) return;
    const ymaps = window.ymaps;
    const clusterer = clustererRef.current;
    clusterer.removeAll();
    placemarksRef.current.clear();

    if (items.length === 0) return;

    const placemarks = items.map((p) => {
      const pm = new ymaps.Placemark(
        [p.lat, p.lng],
        {
          balloonContentHeader: `<strong>${escapeHtml(p.name)}</strong>`,
          balloonContentBody: `
            <div style="font-size:13px;line-height:1.4;max-width:240px">
              <div style="color:#444">${escapeHtml(p.address)}</div>
              ${p.workTime ? `<div style="margin-top:4px;color:#888;font-size:11px">${escapeHtml(p.workTime)}</div>` : ""}
              <button id="pick-pvz-${p.code}" style="margin-top:8px;background:#ef2b2b;color:#fff;border:0;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer;width:100%">Выбрать</button>
            </div>
          `,
          hintContent: p.address,
        },
        {
          preset: "islands#redIcon",
        },
      );
      pm.events.add("balloonopen", () => {
        // После того как balloon смонтирован — вешаем обработчик на кнопку.
        setTimeout(() => {
          const btn = document.getElementById(`pick-pvz-${p.code}`);
          if (btn) {
            btn.onclick = () => {
              onPickRef.current(p);
              mapRef.current?.balloon.close();
            };
          }
        }, 0);
      });
      placemarksRef.current.set(p.code, pm);
      return pm;
    });
    clusterer.add(placemarks);

    // Подгоняем границы под все ПВЗ.
    try {
      const bounds = clusterer.getBounds();
      if (bounds) {
        mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 30 });
      }
    } catch {}
  }, [items, mapReady]);

  // Подсветка выбранного маркера.
  useEffect(() => {
    placemarksRef.current.forEach((pm, code) => {
      pm.options.set(
        "preset",
        code === selectedCode ? "islands#blackStretchyIcon" : "islands#redIcon",
      );
    });
  }, [selectedCode, items]);

  if (mapError) {
    return <PvzFallbackList items={items} loading={loading} error={error} selectedCode={selectedCode} onPick={onPick} />;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
      <div
        ref={containerRef}
        className="h-[360px] w-full md:h-[480px]"
        style={{ background: "#1a1a1a" }}
      />
      {(loading || !mapReady) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-[12px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {loading ? "Загружаем пункты выдачи…" : "Загружаем карту…"}
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-x-3 bottom-3 rounded-xl bg-destructive/90 px-3 py-2 text-[12px] text-destructive-foreground">
          {error}
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[11px] font-medium text-foreground backdrop-blur">
          {items.length} ПВЗ — тапни маркер
        </div>
      )}
    </div>
  );
}

function PvzFallbackList({
  items,
  loading,
  error,
  selectedCode,
  onPick,
}: {
  items: PvzItem[];
  loading: boolean;
  error: string | null;
  selectedCode: string | null;
  onPick: (p: PvzItem) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40">
      <div className="max-h-72 overflow-auto">
        {loading && (
          <div className="flex items-center gap-2 px-3 py-4 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Загружаем пункты выдачи…
          </div>
        )}
        {error && <div className="px-3 py-4 text-[13px] text-destructive">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="px-3 py-4 text-[13px] text-muted-foreground">Ничего не найдено</div>
        )}
        <ul className="divide-y divide-white/[0.05]">
          {items.slice(0, 100).map((p) => {
            const picked = selectedCode === p.code;
            return (
              <li key={p.code}>
                <button
                  type="button"
                  onClick={() => onPick(p)}
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
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
