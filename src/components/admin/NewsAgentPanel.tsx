// Таб «Агент» на /admin/news: очередь предложений от AI-агента.
// Агент только предлагает 2 варианта русского текста — решение и публикация за человеком.
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  Flame,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  Sparkles,
} from "@/components/ui/icons";

import { Panel, Btn, Badge, Field, TextInput, TextArea } from "@/components/admin/ui";
import {
  adminNewsAgentQk,
  adminNewsQk,
  fetchNewsAgentState,
  fetchNewsCandidates,
  patchNewsAgentState,
  runNewsAgent,
  approveNewsCandidate,
  rejectNewsCandidate,
  rewriteNewsCandidate,
  type NewsCandidateItem,
  type NewsAgentVariant,
} from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import { uploadFileToS3 } from "@/lib/garage-api";
import { hhToast as toast } from "@/lib/hh-toast";


function apiErr(e: unknown, fallback = "Ошибка") {
  if (e instanceof ApiError) {
    const m = (e.message || "").trim();
    return m && m !== "Bad Request" ? m : fallback;
  }
  return fallback;
}

function ago(iso: string | null) {
  if (!iso) return "—";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.round(h / 24)} дн назад`;
}

type CandStatus = "drafted" | "new" | "rejected" | "failed";

export function NewsAgentPanel() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<CandStatus>("drafted");

  const stateQ = useQuery({
    queryKey: [...adminNewsAgentQk, "state"],
    queryFn: fetchNewsAgentState,
    refetchInterval: 30_000,
  });
  const candQ = useQuery({
    queryKey: [...adminNewsAgentQk, "candidates", status],
    queryFn: () => fetchNewsCandidates(status),
  });

  const refetch = () => {
    void qc.invalidateQueries({ queryKey: adminNewsAgentQk });
    void qc.invalidateQueries({ queryKey: adminNewsQk });
  };

  const runMut = useMutation({
    mutationFn: (stream: "hot" | "normal") => runNewsAgent(stream),
    onSuccess: (r) => {
      const res = r.result as Record<string, unknown>;
      if (res.skipped) toast.error(`Прогон пропущен: ${String(res.skipped)}`);
      else
        toast.success(
          `Прогон готов: новых ${res.newCandidates}, черновиков ${res.drafted}, ошибок ${res.errors}`,
        );
      refetch();
    },
    onError: (e) => toast.error(apiErr(e, "Прогон не удался")),
  });

  const pauseMut = useMutation({
    mutationFn: (paused: boolean) => patchNewsAgentState({ paused }),
    onSuccess: () => refetch(),
    onError: (e) => toast.error(apiErr(e, "Не получилось переключить")),
  });

  const st = stateQ.data?.state;
  const stats = stateQ.data?.stats;
  const items = candQ.data?.items ?? [];

  return (
    <div className="space-y-4">
      {/* Статус-бар агента */}
      <Panel>
        <div className="flex flex-wrap items-center gap-3 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">AI-агент новостей</span>
            {st?.running ? (
              <Badge tone="amber">Работает</Badge>
            ) : st?.paused ? (
              <Badge tone="rose">На паузе</Badge>
            ) : st?.enabled ? (
              <Badge tone="emerald">Включён</Badge>
            ) : (
              <Badge>Выключен</Badge>
            )}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Btn
              variant="ghost"
              onClick={() => pauseMut.mutate(!st?.paused)}
              disabled={pauseMut.isPending || !st}
            >
              {st?.paused ? (
                <>
                  <Play className="mr-1 h-4 w-4" /> Снять паузу
                </>
              ) : (
                <>
                  <Pause className="mr-1 h-4 w-4" /> Пауза
                </>
              )}
            </Btn>
            <Btn variant="ghost" onClick={() => runMut.mutate("normal")} disabled={runMut.isPending}>
              {runMut.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              Прогон (всё)
            </Btn>
            <Btn onClick={() => runMut.mutate("hot")} disabled={runMut.isPending}>
              <Flame className="mr-1 h-4 w-4" /> Прогон (горячее)
            </Btn>
          </div>
        </div>

        {st?.paused && st.pausedReason && (
          <div className="flex items-start gap-2 border-t border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{st.pausedReason}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-px border-t border-zinc-200 bg-zinc-200 text-center sm:grid-cols-4 lg:grid-cols-7 dark:border-zinc-800 dark:bg-zinc-800">
          {[
            ["Предложено", stats?.drafted ?? 0],
            ["В обработке", stats?.pending ?? 0],
            ["В очереди", stats?.queued ?? 0],
            ["Взято в ленту", stats?.used ?? 0],
            ["Отклонено", stats?.rejected ?? 0],
            ["Источников", stats?.sources ?? 0],
            ["За 24 ч", stats?.last24h.drafted ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-white p-2.5 dark:bg-zinc-900">
              <div className="text-lg font-semibold tabular-nums">{value}</div>
              <div className="text-[11px] text-zinc-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-200 p-2.5 text-[11px] text-zinc-500 dark:border-zinc-800">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> горячее: {ago(st?.lastHotRunAt ?? null)}
          </span>
          <span>обычное: {ago(st?.lastNormalRunAt ?? null)}</span>
          <span>порог отбора: {st?.minScore ?? "—"}</span>
          <span>интервал очереди: {st?.queueGapMin ?? "—"} мин</span>
          {(stats?.last24h.errors ?? 0) > 0 && (
            <span className="text-amber-600">ошибок за 24 ч: {stats?.last24h.errors}</span>
          )}
        </div>
      </Panel>

      {/* Фильтр кандидатов */}
      <Panel>
        <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-200 p-3 dark:border-zinc-800">
          {(
            [
              ["drafted", "Предложено"],
              ["new", "В обработке"],
              ["rejected", "Отклонено"],
              ["failed", "Ошибки"],
            ] as [CandStatus, string][]
          ).map(([s, label]) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                status === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {candQ.isLoading ? (
          <div className="flex items-center justify-center p-12 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            {status === "drafted"
              ? "Агент пока ничего не предложил. Запусти прогон."
              : "Пусто."}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((c) =>
              status === "drafted" ? (
                <CandidateCard key={c.id} cand={c} onDone={refetch} />
              ) : (
                <RawCandidateRow key={c.id} cand={c} />
              ),
            )}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ─── Компактная строка для не-предложенных статусов ─────────────────
function RawCandidateRow({ cand }: { cand: NewsCandidateItem }) {
  return (
    <li className="flex items-start gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{cand.sourceName}</Badge>
          <Badge tone={cand.score >= 70 ? "emerald" : "zinc"}>score {cand.score}</Badge>
          {cand.hot && <Badge tone="amber">HOT</Badge>}
          {cand.topic && <Badge>{cand.topic}</Badge>}
        </div>
        <div className="mt-1 line-clamp-2 text-sm">{cand.srcTitle}</div>
        {cand.rejectReason && (
          <div className="mt-0.5 text-xs text-zinc-500">{cand.rejectReason}</div>
        )}
      </div>
      <a
        href={cand.url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="Открыть источник"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </li>
  );
}

// ─── Карточка предложения с двумя вариантами ────────────────────────
function CandidateCard({ cand, onDone }: { cand: NewsCandidateItem; onDone: () => void }) {
  const variants = cand.variants.length ? cand.variants : [];
  const [pick, setPick] = useState(0);
  const active: NewsAgentVariant | undefined = variants[pick];

  const [title, setTitle] = useState(active?.title ?? cand.srcTitle);
  const [text, setText] = useState(active?.text ?? "");
  const [category, setCategory] = useState(active?.category ?? "");
  const [image, setImage] = useState(cand.image ?? "");
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = async (file: File | null | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFileToS3(file, "post", "news");
      setImage(url);
      toast.success("Картинка загружена");
    } catch (e) {
      toast.error(apiErr(e, "Не получилось загрузить картинку"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };


  const selectVariant = (i: number) => {
    setPick(i);
    const v = variants[i];
    if (!v) return;
    setTitle(v.title);
    setText(v.text);
    setCategory(v.category);
    setDirty(false);
  };

  const approveMut = useMutation({
    mutationFn: (mode: "draft" | "queue" | "now") =>
      approveNewsCandidate(cand.id, {
        variantId: active?.id,
        title: title.trim(),
        text: text.trim(),
        category: category.trim(),
        image: image.trim() || undefined,
        mode,
      }),
    onSuccess: (r) => {
      toast.success(
        r.mode === "now"
          ? "Опубликовано"
          : r.mode === "queue"
            ? `В очереди на ${new Date(r.publishAt!).toLocaleString("ru-RU")}`
            : "Сохранено в черновики",
      );
      onDone();
    },
    onError: (e) => toast.error(apiErr(e, "Не получилось сохранить")),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectNewsCandidate(cand.id, "не подходит"),
    onSuccess: () => {
      toast.success("Мимо");
      onDone();
    },
    onError: (e) => toast.error(apiErr(e, "Не получилось отклонить")),
  });

  const rewriteMut = useMutation({
    mutationFn: () => rewriteNewsCandidate(cand.id),
    onSuccess: () => {
      toast.success("Перегенерировано");
      onDone();
    },
    onError: (e) => toast.error(apiErr(e, "Не получилось перегенерировать")),
  });

  const busy = approveMut.isPending || rejectMut.isPending || rewriteMut.isPending;

  const age = useMemo(() => ago(cand.publishedAt ?? cand.createdAt), [cand]);

  return (
    <li className="p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{cand.sourceName}</Badge>
        <Badge tone={cand.score >= 75 ? "emerald" : "zinc"}>score {cand.score}</Badge>
        {cand.hot && <Badge tone="amber">HOT</Badge>}
        {cand.topic && <Badge>{cand.topic}</Badge>}
        <span className="text-[11px] text-zinc-500">
          {cand.lang.toUpperCase()} · {age}
        </span>
        <a
          href={cand.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-primary"
        >
          Оригинал <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-1.5 text-xs text-zinc-500">{cand.srcTitle}</div>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row">
        {image && (
          <div
            className="aspect-[16/9] w-full shrink-0 rounded-md bg-zinc-100 bg-cover bg-center lg:w-56 dark:bg-zinc-800"
            style={{ backgroundImage: `url(${image})` }}
          />
        )}

        <div className="min-w-0 flex-1 space-y-3">
          {/* Переключатель вариантов */}
          <div className="flex items-center gap-2">
            {variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => selectVariant(i)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  pick === i
                    ? "bg-primary text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {v.tone === "punchy" ? "Вариант 2 · с эмоцией" : "Вариант 1 · сухой"}
              </button>
            ))}
            {dirty && <span className="text-[11px] text-amber-600">отредактировано</span>}
          </div>

          <Field label="Заголовок">
            <TextInput
              value={title}
              maxLength={240}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
            />
          </Field>

          <Field label="Текст">
            <TextArea
              rows={8}
              value={text}
              maxLength={20000}
              onChange={(e) => {
                setText(e.target.value);
                setDirty(true);
              }}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Категория">
              <TextInput
                value={category}
                maxLength={60}
                onChange={(e) => setCategory(e.target.value)}
              />
            </Field>
            <Field label="Картинка (URL)" hint="Подтянута из источника — можно заменить.">
              <TextInput value={image} onChange={(e) => setImage(e.target.value)} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={() => approveMut.mutate("queue")} disabled={busy || !title.trim()}>
              {approveMut.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Clock className="mr-1 h-4 w-4" />
              )}
              В очередь
            </Btn>
            <Btn variant="ghost" onClick={() => approveMut.mutate("now")} disabled={busy || !title.trim()}>
              Опубликовать сейчас
            </Btn>
            <Btn variant="ghost" onClick={() => approveMut.mutate("draft")} disabled={busy || !title.trim()}>
              В черновики
            </Btn>
            <Btn variant="ghost" onClick={() => rewriteMut.mutate()} disabled={busy}>
              {rewriteMut.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              Перегенерировать
            </Btn>
            <button
              type="button"
              onClick={() => rejectMut.mutate()}
              disabled={busy}
              className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40"
            >
              Мимо
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
