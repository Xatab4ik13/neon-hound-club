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
  Select,
  Field,
  Badge,
} from "@/components/admin/ui";
import { Trophy, PlumpClose as X } from "@/components/ui/icons";
import {
  defaultHuntConfig,
  readHuntConfig,
  writeHuntConfig,
  prizesInRunOrder,
  type HuntConfig,
  type HuntConfigPrize,
} from "@/components/club/hound-hunt/hh-config";
import { fetchHuntEntries, type HuntEntry } from "@/components/club/hound-hunt/hh-mock";
import { resetHuntState } from "@/components/club/hound-hunt/hh-bets";
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

function HoundHuntAdminPage() {
  const [cfg, setCfg] = useState<HuntConfig>(() => readHuntConfig());
  const [entries, setEntries] = useState<HuntEntry[]>([]);

  useEffect(() => {
    void fetchHuntEntries(20).then(setEntries);
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

  /** Новая охота: ставки и итоги прошлой обнуляются. */
  const newHunt = () => {
    resetHuntState();
    toast.success("Ставки и итоги прошлой охоты сброшены");
  };

  const save = () => {
    if (!cfg.prizes.length) {
      toast.error("Нужен хотя бы один приз — это один раунд охоты");
      return;
    }
    const forced = cfg.prizes.map((p) => p.forcedWinnerId).filter(Boolean) as string[];
    if (new Set(forced).size !== forced.length) {
      toast.error("Один участник назначен на два приза — так нельзя");
      return;
    }
    writeHuntConfig(cfg);
    toast.success("Конфиг охоты применён");
  };


  const reset = () => {
    const d = defaultHuntConfig();
    setCfg(d);
    writeHuntConfig(d);
    toast.success("Вернули дефолтный конфиг");
  };

  const runOrder = prizesInRunOrder(cfg);

  return (
    <div>
      <PageHeader
        title="HELL HUNT"
        description="Недельная охота для Hell Pass Platinum. Всё, что здесь настроено, видит лендинг и шоу."
        actions={
          <>
            <Btn variant="secondary" onClick={newHunt}>
              Новая охота
            </Btn>
            <Btn variant="secondary" onClick={reset}>
              Сбросить
            </Btn>
            <Btn variant="primary" onClick={save}>
              Применить к шоу
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
                        hint="Честный розыгрыш — жребий по весам билетов. Или выбери участника вручную."
                      >
                        <Select
                          value={p.forcedWinnerId ?? ""}
                          onChange={(e) =>
                            patchPrize(p.id, { forcedWinnerId: e.target.value || null })
                          }
                        >
                          <option value="">Честный розыгрыш</option>
                          {entries.map((e) => (
                            <option
                              key={e.id}
                              value={e.id}
                              disabled={takenBy(e.id, p.id) !== null}
                            >
                              {e.nick} — {e.tickets} бил. / {e.slots} капс.
                              {e.city ? ` — ${e.city}` : ""}
                              {takenBy(e.id, p.id) ? ` (уже: ${takenBy(e.id, p.id)})` : ""}
                            </option>
                          ))}
                        </Select>
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
