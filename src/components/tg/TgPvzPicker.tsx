/**
 * Упрощённый выбор пункта выдачи СДЭК для страницы Telegram.
 * Только ПВЗ: одна строка «Пункт выдачи» → по тапу выезжает карта на весь экран
 * с поиском города сверху; тап по точке → карточка снизу «Забрать здесь».
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Cell, Input, Section } from "@telegram-apps/telegram-ui";
import { Loader2 } from "lucide-react";
import { PlumpMap, PlumpClose, PlumpSearch } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";
import { loadYandexMaps } from "@/lib/yandex-maps";
import { EMPTY_CDEK_STATE, type CdekPickerState } from "@/components/checkout/CdekDeliveryPicker";

type City = { code: number; city: string; region: string; countryCode: string };
type Pvz = { code: string; name: string; address: string; workTime: string; lat: number; lng: number };

export function TgPvzPicker({ value, onChange }: { value: CdekPickerState; onChange: (v: CdekPickerState) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Section header="Пункт выдачи СДЭК">
        <Cell
          before={<span className="hh-pvz-icon"><PlumpMap size={20} /></span>}
          subtitle={value.pvzAddress ? value.cityName : "Город и точка на карте"}
          after={<span className="hh-pvz-change">{value.pvzAddress ? "Изменить" : "Выбрать"}</span>}
          onClick={() => setOpen(true)}
          multiline
        >
          {value.pvzAddress ?? "Выбрать пункт выдачи"}
        </Cell>
      </Section>
      {open && createPortal(
        <PvzMapPanel
          value={value}
          onClose={() => setOpen(false)}
          onPick={(v) => { onChange(v); setOpen(false); }}
        />,
        document.querySelector(".hh-tg") ?? document.body,
      )}
    </>
  );
}

function PvzMapPanel({ value, onClose, onPick }: { value: CdekPickerState; onClose: () => void; onPick: (v: CdekPickerState) => void }) {
  const [closing, setClosing] = useState(false);
  const [q, setQ] = useState(value.cityName);
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState<City | null>(
    value.cityCode ? { code: value.cityCode, city: value.cityName, region: "", countryCode: value.countryCode } : null,
  );
  const [pvz, setPvz] = useState<Pvz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Pvz | null>(null);

  const close = () => { setClosing(true); setTimeout(onClose, 260); };

  // Поиск города
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2 || (city && s === city.city)) { setCities([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      apiFetch<{ items: City[] }>(`/api/v1/cdek/cities?q=${encodeURIComponent(s)}`)
        .then((r) => { if (!cancelled) setCities(r.items ?? []); })
        .catch(() => { if (!cancelled) setCities([]); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, city]);

  // ПВЗ города
  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    setLoading(true); setError(null); setActive(null);
    apiFetch<{ items: Pvz[] }>(`/api/v1/cdek/pvz?cityCode=${city.code}`)
      .then((r) => { if (!cancelled) setPvz(r.items ?? []); })
      .catch(() => { if (!cancelled) { setPvz([]); setError("Не удалось загрузить пункты выдачи"); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [city]);

  const pickCity = (c: City) => { setCity(c); setQ(c.city); setCities([]); };

  const confirm = () => {
    if (!active || !city) return;
    onPick({
      ...EMPTY_CDEK_STATE,
      cityCode: city.code,
      cityName: city.city,
      countryCode: (city.countryCode || "RU").toUpperCase(),
      mode: "pvz",
      pvzCode: active.code,
      pvzAddress: active.address,
    });
  };

  return (
    <div className={`hh-map-panel ${closing ? "is-closing" : ""}`}>
      <div className="hh-map-top">
        <div className="hh-map-search">
          <Input
            before={<PlumpSearch size={18} />}
            placeholder="Ваш город"
            value={q}
            onChange={(e) => { setQ(e.target.value); if (city) setCity(null); }}
          />
          {cities.length > 0 && (
            <div className="hh-map-cities">
              {cities.slice(0, 6).map((c) => (
                <button key={c.code} onClick={() => pickCity(c)}>
                  <b>{c.city}</b><span>{c.region}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="hh-map-close" aria-label="Закрыть" onClick={close}><PlumpClose size={20} /></button>
      </div>

      <YMap items={pvz} activeCode={active?.code ?? value.pvzCode} onPick={setActive} />

      {!city && <div className="hh-map-hint">Начните вводить город</div>}
      {city && loading && <div className="hh-map-hint"><Loader2 className="h-4 w-4 animate-spin" /> Ищем пункты выдачи…</div>}
      {city && error && <div className="hh-map-hint">{error}</div>}
      {city && !loading && !error && !active && pvz.length > 0 && <div className="hh-map-hint">Нажмите на точку на карте</div>}

      {active && (
        <div className="hh-map-card" key={active.code}>
          <div className="hh-map-card-title">{active.address}</div>
          {active.workTime && <div className="hh-map-card-sub">{active.workTime}</div>}
          <Button className="hh-pay-button" size="l" stretched onClick={confirm}>Забрать здесь</Button>
        </div>
      )}
    </div>
  );
}

function YMap({ items, activeCode, onPick }: { items: Pvz[]; activeCode: string | null; onPick: (p: Pvz) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const marks = useRef(new Map<string, any>());
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !ref.current || mapRef.current) return;
        const map = new ymaps.Map(ref.current, { center: [55.751244, 37.618423], zoom: 10, controls: ["geolocationControl"] }, { suppressMapOpenBlock: true });
        const cl = new ymaps.Clusterer({ preset: "islands#invertedGreenClusterIcons" });
        map.geoObjects.add(cl);
        mapRef.current = map; clusterRef.current = cl; setReady(true);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      try { mapRef.current?.destroy(); } catch { /* ignore */ }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !window.ymaps) return;
    const ymaps = window.ymaps;
    const cl = clusterRef.current;
    cl.removeAll(); marks.current.clear();
    if (!items.length) return;
    const pms = items.map((p) => {
      const pm = new ymaps.Placemark([p.lat, p.lng], {}, { preset: "islands#greenDotIcon" });
      pm.events.add("click", () => {
        pickRef.current(p);
        mapRef.current?.panTo([p.lat, p.lng], { duration: 300 });
      });
      marks.current.set(p.code, pm);
      return pm;
    });
    cl.add(pms);
    try { const b = cl.getBounds(); if (b) mapRef.current.setBounds(b, { checkZoomRange: true, zoomMargin: 60 }); } catch { /* ignore */ }
  }, [items, ready]);

  useEffect(() => {
    marks.current.forEach((pm, code) => pm.options.set("preset", code === activeCode ? "islands#pinkDotIcon" : "islands#greenDotIcon"));
  }, [activeCode, items]);

  if (failed) {
    return (
      <div className="hh-map-canvas hh-map-list">
        {items.map((p) => (
          <button key={p.code} className={p.code === activeCode ? "is-active" : ""} onClick={() => onPick(p)}>
            <b>{p.address}</b>{p.workTime && <span>{p.workTime}</span>}
          </button>
        ))}
      </div>
    );
  }
  return <div ref={ref} className="hh-map-canvas" />;
}
