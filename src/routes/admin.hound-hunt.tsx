// Админка HELL HUNT. ТОЛЬКО ФРОНТ: конфиг охоты (время старта, порог
// билетов, призы и выбранные победители) живёт в localStorage и читается
// страницей /club/hound-hunt. Бекенда здесь нет намеренно.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  PageHeader,
  Panel,
  PanelHeader,
  Btn,
  TextInput,
  
  Field,
  Badge,
} from "@/components/admin/ui";
import { Trophy, PlumpClose as X } from "@/components/ui/icons";
import {
  defaultHuntConfig,
  readHuntConfig,
  writeHuntConfig,
  prizesInRunOrder,
  huntConfigFromApi,
  type HuntConfig,
  type HuntConfigPrize,
} from "@/components/club/hound-hunt/hh-config";
import { type HuntEntry } from "@/components/club/hound-hunt/hh-mock";
import { resetHuntState } from "@/components/club/hound-hunt/hh-bets";
import {
  fetchAdminHunt,
  saveAdminHunt,
  drawAdminHunt,
  resetAdminHuntResults,
  fetchAdminPlatinumUsers,
  fetchAdminHuntList,
  type AdminHuntListItem,
  type HuntApiEntry,
  type HuntPlatinumUser,
} from "@/lib/hunt-api";
import { uploadFileToS3 } from "@/lib/garage-api";


import { toast } from "sonner";

export const Route = createFileRoute("/admin/hound-hunt")({
  head: () => ({
    meta: [
      { title: "HELL HUNT — Админ" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HoundHuntAdminPage,
});

/** ISO → значение для <input type="datetime-local"> в местном времени. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** Настоящий id приза с бека (uuid) против локального мок-id. */
function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/**
 * Поиск победителя среди владельцев активного Hell Pass Platinum.
 * Ищем по нику/почте на бэке, показываем ставку в текущей охоте.
 */
function WinnerPicker({
  value,
  onChange,
  takenBy,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  takenBy: (userId: string) => string | null;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HuntPlatinumUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [known, setKnown] = useState<Record<string, HuntPlatinumUser>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      fetchAdminPlatinumUsers(q)
        .then((res) => {
          if (cancelled) return;
          setItems(res.items);
          setKnown((k) => {
            const next = { ...k };
            for (const u of res.items) next[u.id] = u;
            return next;
          });
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const selected = value ? known[value] : undefined;

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm">
          <span className="truncate">
            {selected ? (
              <>
                {selected.nick}
                <span className="text-zinc-400">
                  {" — "}
                  {selected.capsules} капс. / {selected.tickets} бил.
                  {selected.city ? ` — ${selected.city}` : ""}
                </span>
              </>
            ) : (
              <span className="text-zinc-400">Назначен: {value}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded px-2 py-0.5 text-xs text-rose-400 transition hover:bg-rose-500/10"
          >
            Снять
          </button>
        </div>
      ) : (
        <>
          <TextInput
            value={q}
            placeholder="Поиск по нику или email (Hell Pass Platinum)"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
          />
          {open ? (
            <div className="max-h-56 overflow-y-auto rounded border border-zinc-700 bg-zinc-900/80">
              {loading && !items.length ? (
                <div className="px-3 py-2 text-xs text-zinc-500">Ищем…</div>
              ) : !items.length ? (
                <div className="px-3 py-2 text-xs text-zinc-500">
                  Нет владельцев Platinum по запросу
                </div>
              ) : (
                items.map((u) => {
                  const taken = takenBy(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={taken !== null}
                      onClick={() => {
                        onChange(u.id);
                        setOpen(false);
                        setQ("");
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-zinc-800 disabled:opacity-40"
                    >
                      <span className="truncate">
                        {u.nick}
                        <span className="text-zinc-500"> · {u.email}</span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {u.inHunt ? `${u.capsules} капс.` : "без ставки"}
                        {taken ? ` · уже: ${taken}` : ""}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}


function HoundHuntAdminPage() {
  const [cfg, setCfg] = useState<HuntConfig>(() => readHuntConfig());
  const [entries, setEntries] = useState<HuntEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<AdminHuntListItem[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);


  const loadHistory = async () => {
    try {
      const res = await fetchAdminHuntList();
      setHistory(res.items);
    } catch {
      setHistory([]);
    }
  };

  /** Тянем реальную охоту и её участников с бека. */
  const load = async () => {
    try {
      const state = await fetchAdminHunt();
      const next = huntConfigFromApi(state);
      if (next) {
        setCfg(next);
        writeHuntConfig(next);
      }
      setEntries(
        (state.entries ?? []).map((e: HuntApiEntry) => ({
          id: e.id,
          nick: e.nick,
          initials: (e.nick || "RD").slice(0, 2).toUpperCase(),
          avatarUrl: e.avatarUrl ?? undefined,
          city: e.city ?? "",
          tickets: e.tickets,
          slots: e.capsules,
        })) as HuntEntry[],
      );
    } catch {
      // нет охоты/бек недоступен — список пустой, никаких демо-данных
      setEntries([]);
    }
  };

  useEffect(() => {
    void load();
    void loadHistory();
  }, []);

  const patchPrize = (id: string, patch: Partial<HuntConfigPrize>) =>
    setCfg((c) => ({
      ...c,
      prizes: c.prizes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));

  /** Кем уже занят участник (назначен на другой приз) — иначе он забрал бы два. */
  const takenBy = (entryId: string, exceptPrizeId: string): string | null => {
    const other = cfg.prizes.find((p) => p.id !== exceptPrizeId && p.forcedWinnerId === entryId);
    return other ? other.title : null;
  };


  const addPrize = () =>
    setCfg((c) => {
      const place = Math.max(0, ...c.prizes.map((p) => p.place)) + 1;
      return {
        ...c,
        prizes: [
          ...c.prizes,
          {
            id: `p-${Date.now()}`,
            place,
            title: "Новый приз",
            sub: "",
            img: c.prizes[0]?.img ?? "",
            forcedWinnerId: null,
          },
        ],
      };
    });

  const removePrize = (id: string) =>
    setCfg((c) => ({ ...c, prizes: c.prizes.filter((p) => p.id !== id) }));

  /** Загрузка картинки приза файлом в MinIO (kind=raffle). */
  const uploadPrizeImage = async (prizeId: string, file: File) => {
    setUploadingId(prizeId);
    try {
      const url = await uploadFileToS3(file, "raffle", "hunt");
      patchPrize(prizeId, { img: url });
      toast.success("Картинка загружена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не получилось загрузить");
    } finally {
      setUploadingId(null);
    }
  };


  /** Сброс итогов прошлой охоты на бекенде + локальный кеш. */
  const newHunt = async () => {
    setBusy(true);
    try {
      await resetAdminHuntResults();
      resetHuntState();
      await load();
      toast.success("Итоги прошлой охоты сброшены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не получилось сбросить итоги");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Чистый черновик новой охоты: пустые названия/картинки призов и НИ ОДНОГО
   * назначенного победителя (иначе тянулись бы победители прошлой охоты).
   * На бекенд ничего не уходит до «Сохранить черновик».
   */
  const startDraft = () => {
    const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    startsAt.setMinutes(0, 0, 0);
    setCfg({
      id: null,
      status: "draft",
      drawnAt: null,
      startsAt: startsAt.toISOString(),
      ticketStep: cfg.ticketStep,
      prizes: [1, 2, 3].map((place) => ({
        id: `p-${Date.now()}-${place}`,
        place,
        title: "",
        sub: place === 1 ? "Главный приз" : "",
        img: "",
        forcedWinnerId: null,
        winnerUserId: null,
        winnerNick: null,
        ticketsReward: 0,
      })),
    });
    setEntries([]);
    resetHuntState();
    toast.success("Черновик новой охоты — заполни призы и нажми «Сохранить черновик»");
  };

  const save = async (opts: { create?: boolean; status?: HuntConfig["status"] } = {}) => {
    const create = opts.create ?? false;
    const status = opts.status ?? cfg.status ?? "open";
    if (!cfg.prizes.length) {
      toast.error("Нужен хотя бы один приз — это один раунд охоты");
      return;
    }
    if (cfg.prizes.some((p) => !p.title.trim())) {
      toast.error("У каждого приза должно быть название");
      return;
    }
    if (status === "open" && cfg.prizes.some((p) => !p.img.trim() && !p.ticketsReward)) {
      toast.error("Перед публикацией добавь картинку каждому призу");
      return;
    }
    const forced = cfg.prizes.map((p) => p.forcedWinnerId).filter(Boolean) as string[];
    if (new Set(forced).size !== forced.length) {
      toast.error("Один участник назначен на два приза — так нельзя");
      return;
    }
    setBusy(true);
    try {
      const state = await saveAdminHunt({
        id: create ? null : (cfg.id ?? null),
        create,
        title: "HELL HUNT",
        startsAt: cfg.startsAt,
        ticketStep: cfg.ticketStep,
        status,
        prizes: cfg.prizes.map((p) => ({
          // id отправляем только если это реальный uuid с бека: локальные
          // мок-id («p1», «p-1712…») бек не примет.
          id: isUuid(p.id) ? p.id : undefined,
          place: p.place,
          title: p.title,
          sub: p.sub,
          // В БД пишем только абсолютные URL. Локальные бандл-пути не храним —
          // фронт подставит картинку приза по месту.
          img: /^https?:\/\//.test(p.img) ? p.img : null,
          ticketsReward: p.ticketsReward ?? 0,
          forcedWinnerId: p.forcedWinnerId ?? null,
        })),
      });
      const next = huntConfigFromApi(state);
      if (next) {
        setCfg(next);
        writeHuntConfig(next);
      }
      toast.success(
        status === "open"
          ? "Охота опубликована — видна на сайте"
          : create
            ? "Черновик новой охоты сохранён"
            : "Черновик сохранён",
      );
      void loadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не получилось сохранить охоту");
    } finally {
      setBusy(false);
    }
  };


  /** Прокрутить жребий: назначенные победители фиксируются, остальные — по весам. */
  const draw = async () => {
    setBusy(true);
    try {
      const state = await drawAdminHunt(true);
      const next = huntConfigFromApi(state);
      if (next) {
        setCfg(next);
        writeHuntConfig(next);
      }
      void loadHistory();
      toast.success("Жребий прокручен — шоу покажет этих победителей");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не получилось прокрутить жребий");
    } finally {
      setBusy(false);
    }
  };


  const reset = () => {
    const d = defaultHuntConfig();
    setCfg(d);
    writeHuntConfig(d);
    toast.success("Вернули дефолтный конфиг");
  };


  const runOrder = prizesInRunOrder(cfg);
  const totalTickets = entries.reduce((s, e) => s + e.tickets, 0);
  const sortedEntries = [...entries].sort((a, b) => b.tickets - a.tickets);


  const isDraft = (cfg.status ?? "open") === "draft";

  return (
    <div>
      <PageHeader
        title="HELL HUNT"
        description={
          isDraft
            ? "Черновик: на сайте не показывается. Заполни призы и нажми «Опубликовать»."
            : "Недельная охота для Hell Pass Platinum. Всё, что здесь настроено, видит лендинг и шоу."
        }
        actions={
          <>
            <Badge tone={isDraft ? "zinc" : "rose"}>
              {isDraft ? "черновик" : (cfg.status ?? "open")}
            </Badge>
            <Btn variant="secondary" onClick={() => void newHunt()} disabled={busy}>
              Сбросить итоги
            </Btn>
            <Btn variant="secondary" onClick={startDraft} disabled={busy}>
              Создать новую охоту
            </Btn>
            <Btn variant="secondary" onClick={reset} disabled={busy}>
              Сбросить
            </Btn>
            <Btn variant="secondary" onClick={() => void draw()} disabled={busy}>
              Прокрутить жребий
            </Btn>
            <Btn
              variant="secondary"
              onClick={() => void save({ create: !cfg.id, status: "draft" })}
              disabled={busy}
            >
              Сохранить черновик
            </Btn>
            <Btn
              variant="primary"
              onClick={() => void save({ create: !cfg.id, status: "open" })}
              disabled={busy}
            >
              {isDraft || !cfg.id ? "Опубликовать" : "Сохранить охоту"}
            </Btn>
          </>
        }
      />


      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel className="p-4">
          <div className="space-y-4">
            <Field label="Старт охоты" hint="Это время видит таймер на лендинге">
              <TextInput
                type="datetime-local"
                value={toLocalInput(cfg.startsAt)}
                onChange={(e) => setCfg((c) => ({ ...c, startsAt: fromLocalInput(e.target.value) }))}
              />
            </Field>

            <Field
              label="Билетов за одну капсулу"
              hint={`${cfg.ticketStep} билетов = 1 капсула, ${cfg.ticketStep * 2} = 2 и так далее`}
            >
              <TextInput
                type="number"
                min={1}
                value={cfg.ticketStep}
                onChange={(e) =>
                  setCfg((c) => ({ ...c, ticketStep: Math.max(1, Number(e.target.value) || 1) }))
                }
              />
            </Field>

            <div className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="font-medium">{cfg.prizes.length} раунда</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Сколько призов — столько раундов. Порядок вскрытия:{" "}
                {runOrder.map((p) => p.place).join(" → ")} (главный последним).
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Микс работает так: где победитель назначен — он и берёт этот приз;
                остальные призы уходят честным жребием и назначенным уже не достаются.
                Назначил все — полностью ручной расклад, ни одного — полный рандом.
              </p>
            </div>

            <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-sm font-medium dark:border-zinc-800">
                <span>Участники</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {entries.length} чел. · {totalTickets} бил.
                </span>
              </div>
              <div className="max-h-80 divide-y divide-zinc-100 overflow-auto dark:divide-zinc-800/60">
                {sortedEntries.map((e) => {
                  const share = totalTickets ? Math.round((e.tickets / totalTickets) * 100) : 0;
                  return (
                    <div key={e.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                      <span className="flex-1 truncate font-medium">{e.nick}</span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {e.tickets} бил. · {e.slots} капс.
                      </span>
                      <span className="w-9 text-right text-zinc-400">{share}%</span>
                    </div>
                  );
                })}
                {!entries.length && (
                  <p className="px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Ставок пока нет.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-sm font-medium dark:border-zinc-800">
                <span>История охот</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{history.length}</span>
              </div>
              <div className="max-h-96 divide-y divide-zinc-100 overflow-auto dark:divide-zinc-800/60">
                {history.map((h) => (
                  <div key={h.id} className="px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {new Date(h.startsAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Badge tone={h.id === cfg.id ? "rose" : "zinc"}>
                        {h.id === cfg.id ? "текущая" : h.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                      {h.participants} чел. · {h.tickets} бил.
                    </p>
                    <ul className="mt-1 space-y-0.5 text-zinc-500 dark:text-zinc-400">
                      {[...h.prizes]
                        .sort((a, b) => a.place - b.place)
                        .map((p) => (
                          <li key={p.id} className="truncate">
                            {p.place}. {p.title} —{" "}
                            <span className={p.winnerNick ? "text-emerald-500" : ""}>
                              {p.winnerNick ?? "нет победителя"}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
                {!history.length && (
                  <p className="px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Охот пока нет.
                  </p>
                )}
              </div>
            </div>

          </div>
        </Panel>


        <Panel>
          <PanelHeader>
            <span className="text-sm font-medium">Призы и победители</span>
            <Btn variant="secondary" onClick={addPrize}>
              Добавить приз
            </Btn>
          </PanelHeader>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {cfg.prizes.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-start gap-3">
                  {p.img ? (
                    <img src={p.img} alt="" className="h-14 w-14 shrink-0 object-contain" />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded bg-zinc-100 dark:bg-zinc-800" />
                  )}

                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <Field label="Название">
                      <TextInput
                        value={p.title}
                        onChange={(e) => patchPrize(p.id, { title: e.target.value })}
                      />
                    </Field>
                    <Field label="Место" hint="1 — главный приз, вскрывается последним">
                      <TextInput
                        type="number"
                        min={1}
                        value={p.place}
                        onChange={(e) =>
                          patchPrize(p.id, { place: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </Field>
                    <Field label="Подпись" hint="Например «Главный приз». Пусто — не показываем">
                      <TextInput
                        value={p.sub}
                        onChange={(e) => patchPrize(p.id, { sub: e.target.value })}
                      />
                    </Field>
                    <Field label="Картинка (URL)">
                      <TextInput
                        value={p.img}
                        onChange={(e) => patchPrize(p.id, { img: e.target.value })}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field
                        label="Победитель"
                        hint="Честный розыгрыш — жребий по капсулам. Или найди владельца Hell Pass Platinum и назначь вручную."
                      >
                        <WinnerPicker
                          value={p.forcedWinnerId ?? null}
                          onChange={(id) => patchPrize(p.id, { forcedWinnerId: id })}
                          takenBy={(uid) => takenBy(uid, p.id)}
                        />
                      </Field>
                      {p.forcedWinnerId ? (
                        <div className="mt-2">
                          <Badge tone="rose">Победитель назначен вручную</Badge>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <Badge tone="zinc">Жребий по весам билетов</Badge>
                        </div>
                      )}
                    </div>


                  </div>

                  <button
                    type="button"
                    onClick={() => removePrize(p.id)}
                    aria-label="Удалить приз"
                    className="rounded p-1 text-zinc-400 transition hover:text-rose-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {!cfg.prizes.length && (
              <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Призов нет — охота не запустится. Добавь хотя бы один.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
