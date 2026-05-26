// /admin/banners — управление баннерами карусели на /club.
// Картинку грузим через /api/v1/uploads/direct (kind=shop).
//
// Требования к картинке (для подсказки админу):
//   • Соотношение 16:10, рекомендуем 1600×1000 px (минимум 1200×750).
//   • JPG или WebP, ≤ 800 КБ — иначе тяжело грузится в PWA на 4G.
//   • Сюжет — справа/слева, чтобы посередине-снизу был «спокойный» участок
//     для заголовка и кнопки. Снизу автоматически накладывается затемнение.
//   • Не лепи на саму картинку текст — он будет наложен поверх движком.

import { createFileRoute } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Image as ImageIcon, Loader2, GripVertical, Eye, EyeOff } from "lucide-react";

import {
  PageHeader,
  Panel,
  Btn,
  Field,
  TextInput,
  TextArea,
  Switch,
  Modal,
  ConfirmModal,
} from "@/components/admin/ui";
import {
  fetchAdminHomeBanners,
  createAdminHomeBanner,
  patchAdminHomeBanner,
  deleteAdminHomeBanner,
  adminHomeBannersQk,
  type HomeBannerInput,
} from "@/lib/admin-queries";
import type { HomeBanner } from "@/lib/queries";
import { uploadFileToS3 } from "@/lib/garage-api";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";

export const Route = createFileRoute("/admin/banners")({
  component: BannersPage,
});

function apiErr(e: unknown, fallback = "Ошибка") {
  if (e instanceof ApiError) {
    const message = (e.message || "").trim();
    return message && message !== "Bad Request" ? message : fallback;
  }
  return fallback;
}

function BannersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: adminHomeBannersQk,
    queryFn: fetchAdminHomeBanners,
  });
  const banners = data?.banners ?? [];

  const [editing, setEditing] = useState<HomeBanner | "new" | null>(null);
  const [toDelete, setToDelete] = useState<HomeBanner | null>(null);

  const refetch = () => qc.invalidateQueries({ queryKey: adminHomeBannersQk });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      patchAdminHomeBanner(id, { active }),
    onSuccess: () => refetch(),
      onError: (e) => toast.error(apiErr(e, "Не получилось изменить баннер")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminHomeBanner(id),
    onSuccess: () => {
      refetch();
      toast.success("Баннер удалён");
      setToDelete(null);
    },
    onError: (e) => toast.error(apiErr(e, "Не получилось удалить баннер")),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Баннеры на главной"
        description="Карусель на /club — то, что видит пользователь сразу при входе."
        actions={
          <Btn onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Добавить
          </Btn>
        }
      />


      <Panel>
        <div className="p-4">
          <div className="rounded-md border border-amber-300/50 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="mb-1 font-semibold">Как сделать баннер, который не «поплывёт»:</div>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>Картинка — соотношение <b>16:10</b> (рекомендуем <b>1600×1000 px</b>).</li>
              <li>Формат JPG или WebP, размер до <b>800 КБ</b>.</li>
              <li>Главный объект — слева или справа. Снизу-посередине должно быть «спокойное» место — туда ляжет заголовок и кнопка.</li>
              <li>Текст НЕ рисуй на самой картинке — заголовок и описание накладываются движком.</li>
              <li>Ссылка кнопки — либо внутренняя (<code>/club/shop</code>, <code>/club/hell-pass</code>, <code>/club/quests</code>), либо полная <code>https://…</code>.</li>
            </ul>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : banners.length === 0 ? (
          <div className="px-4 pb-6 text-sm text-zinc-500">
            Баннеров пока нет. Нажми «Добавить» — твой первый баннер появится в карусели сразу.
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {banners.map((b) => (
              <BannerCard
                key={b.id}
                banner={b}
                onEdit={() => setEditing(b)}
                onDelete={() => setToDelete(b)}
                onToggle={() => toggleMut.mutate({ id: b.id, active: !b.active })}
              />
            ))}
          </div>
        )}
      </Panel>

      {editing && (
        <BannerEditor
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}

      {toDelete && (
        <ConfirmModal
          open
          title="Удалить баннер?"
          message={`«${toDelete.title}» исчезнет из карусели сразу.`}
          confirmLabel="Удалить"
          danger
          onConfirm={() => deleteMut.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}

    </div>
  );
}

function BannerCard({
  banner,
  onEdit,
  onDelete,
  onToggle,
}: {
  banner: HomeBanner;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className="relative aspect-[16/10] bg-zinc-100 dark:bg-zinc-800"
        style={
          banner.imageUrl
            ? {
                backgroundImage: `url(${JSON.stringify(banner.imageUrl)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {!banner.imageUrl && (
          <div className="flex h-full items-center justify-center text-zinc-400">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/65 via-black/30 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-3 text-white">
          <div className="pt-1">
            <h3 className="line-clamp-2 whitespace-pre-line font-display text-sm font-black uppercase italic leading-[0.95] text-white">
              {banner.title}
            </h3>
            {banner.eyebrow && (
              <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-white/90">
                {banner.eyebrow}
              </p>
            )}
          </div>
        </div>
        {!banner.active && (
          <div className="absolute right-2 top-2 rounded-full bg-zinc-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-300">
            Выкл
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 p-2 text-xs dark:border-zinc-800">
        <div className="flex items-center gap-1 text-zinc-500">
          <GripVertical className="h-3 w-3" />
          <span>#{banner.sort}</span>
          <span className="ml-2 truncate text-zinc-400">→ {banner.ctaHref}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title={banner.active ? "Выключить" : "Включить"}
          >
            {banner.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Изменить
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
            title="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: HomeBanner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !initial;
  const [form, setForm] = useState<HomeBannerInput>({
    title: initial?.title ?? "",
    eyebrow: initial?.eyebrow ?? "",
    ctaLabel: initial?.ctaLabel ?? "Открыть",
    ctaHref: initial?.ctaHref ?? "/club/shop",
    imageUrl: initial?.imageUrl ?? "",
    sort: initial?.sort ?? 0,
    active: initial?.active ?? true,
  });
  const [uploading, setUploading] = useState(false);

  const setF = <K extends keyof HomeBannerInput>(k: K, v: HomeBannerInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: async () => {
      if (isNew) {
        return createAdminHomeBanner(form);
      }
      return patchAdminHomeBanner(initial!.id, form);
    },
    onSuccess: () => {
      toast.success(isNew ? "Баннер создан" : "Сохранено");
      onSaved();
    },
    onError: (e) => toast.error(apiErr(e, "Не получилось сохранить баннер")),
  });

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Файл больше 2 МБ — сожми (рекомендуем до 800 КБ)");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFileToS3(f, "shop", "banners");
      setF("imageUrl", url);
    } catch (err) {
      toast.error(apiErr(err, "Не получилось загрузить картинку"));
    } finally {
      setUploading(false);
    }
  }

  const canSave =
    form.title.trim().length > 0 &&
    form.ctaHref.trim().length > 0 &&
    form.imageUrl.trim().length > 0;

  return (
    <Modal
      open
      size="lg"
      title={isNew ? "Новый баннер" : "Баннер"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>
            Отмена
          </Btn>
          <Btn
            onClick={() => saveMut.mutate()}
            disabled={!canSave || saveMut.isPending || uploading}
          >
            {saveMut.isPending ? "Сохранение…" : "Сохранить"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Превью */}
        <Field label="Превью" hint="Так баннер увидит пользователь в карусели на /club.">
          <div
            className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            style={
              form.imageUrl
                ? {
                    backgroundImage: `url(${JSON.stringify(form.imageUrl)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {!form.imageUrl && (
              <div className="flex h-full items-center justify-center text-zinc-400">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
             <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/65 via-black/30 to-transparent" />
             <div className="relative flex h-full flex-col justify-between p-4 text-white">
               <div className="pt-1">
                 <h3 className="whitespace-pre-line font-display text-xl font-black uppercase italic leading-[0.95] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                   {form.title || "Заголовок баннера"}
                 </h3>
                 {form.eyebrow && (
                   <p className="mt-2 text-[11px] leading-snug text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                     {form.eyebrow}
                   </p>
                 )}
               </div>
               <div>
                 <div className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
                   {form.ctaLabel || "Открыть"}
                 </div>
               </div>
            </div>
          </div>
        </Field>

        {/* Картинка */}
        <Field
          label="Картинка-фон"
          hint="JPG/WebP 1600×1000 (16:10), до 800 КБ. Текст НЕ рисуй на картинке — он накладывается сверху."
        >
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:border-primary hover:text-primary dark:border-zinc-700 dark:bg-zinc-900">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {form.imageUrl ? "Заменить" : "Загрузить картинку"}
              <input
                type="file"
                accept="image/jpeg,image/webp,image/png"
                className="hidden"
                onChange={onPickFile}
                disabled={uploading}
              />
            </label>
            {form.imageUrl && (
              <button
                type="button"
                onClick={() => setF("imageUrl", "")}
                className="text-xs text-zinc-500 hover:text-rose-500"
              >
                Убрать
              </button>
            )}
          </div>
        </Field>

        <Field
          label="Заголовок"
          hint="Крупный текст. Для переноса на новую строку — нажми Enter в поле."
        >
          <TextArea
            rows={2}
            value={form.title}
            onChange={(e) => setF("title", e.target.value)}
            placeholder="BLACK HOUND&#10;JACKET"
            maxLength={120}
          />
        </Field>

        <Field
          label="Подпись над заголовком"
          hint="Мелкая строка-надстрочник. Можно оставить пустой."
        >
          <TextInput
            value={form.eyebrow ?? ""}
            onChange={(e) => setF("eyebrow", e.target.value)}
            placeholder="Лимит 50 шт. · −15% по Gold Pass"
            maxLength={120}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Текст кнопки">
            <TextInput
              value={form.ctaLabel ?? ""}
              onChange={(e) => setF("ctaLabel", e.target.value)}
              placeholder="Открыть"
              maxLength={40}
            />
          </Field>
          <Field
            label="Куда ведёт кнопка"
            hint="Внутренний путь (/club/shop) или полный https-URL."
          >
            <TextInput
              value={form.ctaHref}
              onChange={(e) => setF("ctaHref", e.target.value)}
              placeholder="/club/shop"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Порядок" hint="Меньше = раньше в карусели.">
            <TextInput
              type="number"
              value={String(form.sort ?? 0)}
              onChange={(e) => setF("sort", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Показывать">
            <Switch
              checked={form.active ?? true}
              onChange={(v: boolean) => setF("active", v)}
              label={form.active ? "Включён" : "Выключен"}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
