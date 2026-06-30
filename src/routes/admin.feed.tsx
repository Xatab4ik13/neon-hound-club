// Админская «Лента»: создать пост от имени любого блогера + список всех постов
// с возможностью удалить / восстановить. Композер один в один как у блогера
// (текст + фото + опрос), но автор выбирается через пикер.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PageHeader,
  Panel,
  DataTable,
  Badge,
  Btn,
  TextInput,
  ConfirmModal,
  Modal,
} from "@/components/admin/ui";
import { AdminPager, type AdminPageSize } from "@/components/admin/AdminPager";
import {
  PlumpImage as ImageIcon,
  PlumpClose as X,
  Plus,
  PlumpPoll,
  Send,
  Trash2,
  RotateCcw,
  Pencil,
} from "@/components/ui/icons";
import {
  adminQk,
  fetchAdminUsers,
  fetchAdminFeedPosts,
  createAdminFeedPost,
  deleteAdminFeedPost,
  restoreAdminFeedPost,
  updateAdminFeedPost,
  type AdminUserListItem,
  type AdminCreatePostInput,
  type AdminFeedPostListItem,
} from "@/lib/admin-queries";
import { uploadFileToS3 } from "@/lib/garage-api";
import { hhToast as toast } from "@/lib/hh-toast";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin/feed")({
  component: AdminFeedPage,
});

function AdminFeedPage() {
  const [author, setAuthor] = useState<AdminUserListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(50);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const qc = useQueryClient();

  const postsQ = useQuery({
    queryKey: [...adminQk.feedPosts, page, pageSize],
    queryFn: () => fetchAdminFeedPosts({ page, pageSize }),
    placeholderData: (prev) => prev,
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminFeedPost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminQk.feedPosts });
      toast.success("Пост удалён");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Ошибка"),
  });

  const restoreMut = useMutation({
    mutationFn: restoreAdminFeedPost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminQk.feedPosts });
      toast.success("Пост восстановлен");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Ошибка"),
  });

  const items = postsQ.data?.items ?? [];
  const total = postsQ.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Лента"
        description="Публикация постов в клубную ленту от имени блогера"
      />

      <Panel className="mb-6">
        <div className="space-y-4 p-4 md:p-5">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Автор
            </div>
            <AuthorPicker value={author} onChange={setAuthor} />
          </div>

          {author && (
            <Composer
              author={author}
              onPublished={() => {
                qc.invalidateQueries({ queryKey: adminQk.feedPosts });
                setPage(1);
              }}
            />
          )}
        </div>
      </Panel>

      <Panel>
        <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
          Последние посты в ленте
        </div>
        <DataTable
          headers={["Автор", "Текст", "Медиа", "Статус", "Создан", ""]}
          rows={items.map((p) => [
            <span className="font-medium">@{p.nick}</span>,
            <span className="block max-w-[420px] truncate text-zinc-600 dark:text-zinc-300">
              {p.text || <span className="text-zinc-400">—</span>}
            </span>,
            p.imageUrl ? (
              <a
                href={p.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                фото
              </a>
            ) : (
              <span className="text-zinc-400">—</span>
            ),
            p.deletedAt ? (
              <Badge tone="rose">удалён</Badge>
            ) : p.pinned ? (
              <Badge tone="amber">закреплён</Badge>
            ) : (
              <Badge tone="emerald">опубликован</Badge>
            ),
            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
              {new Date(p.createdAt).toLocaleString("ru-RU")}
            </span>,
            p.deletedAt ? (
              <Btn variant="ghost" onClick={() => restoreMut.mutate(p.id)}>
                <RotateCcw className="h-4 w-4" /> Восстановить
              </Btn>
            ) : (
              <Btn variant="ghost" onClick={() => setConfirmDelete(p.id)}>
                <Trash2 className="h-4 w-4" /> Удалить
              </Btn>
            ),
          ])}
        />
        {postsQ.isLoading && (
          <div className="p-6 text-center text-sm text-zinc-500">Загрузка…</div>
        )}
        {!postsQ.isLoading && items.length === 0 && (
          <div className="p-6 text-center text-sm text-zinc-500">Постов нет</div>
        )}
        <AdminPager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </Panel>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteMut.mutate(confirmDelete);
          setConfirmDelete(null);
        }}
        title="Удалить пост?"
        message="Пост будет удалён из ленты. Восстановить можно отсюда же."
        confirmLabel="Удалить"
      />
    </div>
  );
}

// ───────── Author picker ─────────

function AuthorPicker({
  value,
  onChange,
}: {
  value: AdminUserListItem | null;
  onChange: (u: AdminUserListItem | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  if (query !== debounced) {
    setTimeout(() => setDebounced(query), 200);
  }

  const listQ = useQuery({
    queryKey: ["admin", "users", "bloggers", debounced],
    queryFn: () =>
      fetchAdminUsers({
        q: debounced || undefined,
        role: "blogger",
        pageSize: 20,
        sort: "nick",
        dir: "asc",
      }),
    enabled: open,
    placeholderData: (prev) => prev,
  });

  if (value && !open) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
        {value.avatarUrl ? (
          <img
            src={value.avatarUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
            {value.nick[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="text-sm font-medium">@{value.nick}</div>
          <div className="text-xs text-zinc-500">{value.email}</div>
        </div>
        <Btn variant="ghost" onClick={() => setOpen(true)}>
          Сменить
        </Btn>
        <Btn variant="ghost" onClick={() => onChange(null)}>
          Сбросить
        </Btn>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <TextInput
        autoFocus
        placeholder="Поиск блогера по нику или email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          {listQ.isLoading && (
            <div className="p-3 text-center text-sm text-zinc-500">Загрузка…</div>
          )}
          {!listQ.isLoading && (listQ.data?.items ?? []).length === 0 && (
            <div className="p-3 text-center text-sm text-zinc-500">
              Блогеров не найдено. Сделай юзера блогером в разделе «Пользователи».
            </div>
          )}
          {(listQ.data?.items ?? []).map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onChange(u);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
            >
              {u.avatarUrl ? (
                <img
                  src={u.avatarUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                  {u.nick[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="text-sm font-medium">@{u.nick}</div>
                <div className="text-xs text-zinc-500">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── Composer ─────────

type PollDraft = {
  question: string;
  options: string[];
  anonymous: boolean;
  multi: boolean;
};

const emptyPoll = (): PollDraft => ({
  question: "",
  options: ["", ""],
  anonymous: true,
  multi: false,
});

function Composer({
  author,
  onPublished,
}: {
  author: AdminUserListItem;
  onPublished: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [poll, setPoll] = useState<PollDraft | null>(null);
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  const pollValid = useMemo(
    () =>
      !!poll &&
      poll.question.trim().length > 0 &&
      poll.options.filter((o) => o.trim().length > 0).length >= 2,
    [poll],
  );

  const canPost =
    !busy &&
    (text.trim().length > 0 || !!file || !!poll) &&
    (!poll || pollValid);

  const onFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = () => setImagePreview(String(r.result));
    r.readAsDataURL(f);
  };

  const clearImage = () => {
    setFile(null);
    setImagePreview(undefined);
    if (fileRef.current) fileRef.current.value = "";
  };

  const publish = async () => {
    if (!canPost) return;
    setBusy(true);
    try {
      let imageUrl: string | undefined;
      if (file) imageUrl = await uploadFileToS3(file, "post");
      const payload: AdminCreatePostInput = {
        authorId: author.id,
        text: text.trim(),
        imageUrl: imageUrl ?? null,
        pinned,
        poll: poll
          ? {
              question: poll.question.trim(),
              anonymous: poll.anonymous,
              multi: poll.multi,
              options: poll.options
                .map((t) => t.trim())
                .filter((t) => t.length > 0)
                .map((t, i) => ({ id: `o${i + 1}`, text: t })),
            }
          : null,
      };
      await createAdminFeedPost(payload);
      toast.success(`Опубликовано от @${author.nick}`);
      setText("");
      clearImage();
      setPoll(null);
      setPinned(false);
      onPublished();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не получилось опубликовать");
    } finally {
      setBusy(false);
    }
  };

  const updateOpt = (i: number, v: string) =>
    setPoll((p) => (p ? { ...p, options: p.options.map((o, j) => (j === i ? v : o)) } : p));
  const addOpt = () =>
    setPoll((p) => (p && p.options.length < 10 ? { ...p, options: [...p.options, ""] } : p));
  const removeOpt = (i: number) =>
    setPoll((p) =>
      p && p.options.length > 2 ? { ...p, options: p.options.filter((_, j) => j !== i) } : p,
    );

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Что у тебя нового, @${author.nick}?`}
          rows={10}
          maxLength={4000}
          className="block min-h-[220px] w-full resize-y whitespace-pre-wrap break-words rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary/40 dark:border-zinc-800 dark:bg-zinc-950"
        />
        <div className="mt-1 text-right text-[11px] text-zinc-400">{text.length} / 4000</div>
      </div>

      {imagePreview && (
        <div className="px-3 pb-3">
          <div className="relative overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
            <img
              src={imagePreview}
              alt=""
              loading="lazy"
              decoding="async"
              className="max-h-[360px] w-full object-contain"
            />
            <button
              type="button"
              onClick={clearImage}
              aria-label="Удалить фото"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {poll && (
        <div className="mx-3 mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-2 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <PlumpPoll className="h-3.5 w-3.5" /> Опрос
            </div>
            <button
              type="button"
              onClick={() => setPoll(null)}
              aria-label="Убрать опрос"
              className="grid h-6 w-6 place-items-center rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            value={poll.question}
            onChange={(e) => setPoll((p) => (p ? { ...p, question: e.target.value } : p))}
            placeholder="Вопрос"
            maxLength={200}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40 dark:border-zinc-800 dark:bg-zinc-950"
          />

          <ul className="mt-2 space-y-1.5">
            {poll.options.map((o, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  value={o}
                  onChange={(e) => updateOpt(i, e.target.value)}
                  placeholder={`Вариант ${i + 1}`}
                  maxLength={100}
                  className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-primary/40 dark:border-zinc-800 dark:bg-zinc-950"
                />
                {poll.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOpt(i)}
                    aria-label="Убрать вариант"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-500 hover:text-rose-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {poll.options.length < 10 && (
            <button
              type="button"
              onClick={addOpt}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Добавить вариант
            </button>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 has-[:checked]:border-primary/40 has-[:checked]:text-primary dark:border-zinc-800 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={poll.anonymous}
                onChange={(e) =>
                  setPoll((p) => (p ? { ...p, anonymous: e.target.checked } : p))
                }
                className="h-3 w-3 accent-primary"
              />
              Анонимный
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 has-[:checked]:border-primary/40 has-[:checked]:text-primary dark:border-zinc-800 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={poll.multi}
                onChange={(e) => setPoll((p) => (p ? { ...p, multi: e.target.checked } : p))}
                className="h-3 w-3 accent-primary"
              />
              Несколько вариантов
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:bg-white hover:text-primary dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ImageIcon className="h-4 w-4" /> Фото
          </button>
          <button
            type="button"
            onClick={() => setPoll((p) => (p ? null : emptyPoll()))}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              poll
                ? "text-primary"
                : "text-zinc-600 hover:bg-white hover:text-primary dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            <PlumpPoll className="h-4 w-4" /> Опрос
          </button>
          <label className="ml-1 inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 has-[:checked]:border-primary/40 has-[:checked]:text-primary dark:border-zinc-800 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-3 w-3 accent-primary"
            />
            Закрепить
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <Btn variant="primary" disabled={!canPost} onClick={publish}>
          <Send className="h-3.5 w-3.5" /> {busy ? "Публикуем…" : "Опубликовать"}
        </Btn>
      </div>
    </div>
  );
}
