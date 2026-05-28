import { useEffect, useRef, useState } from "react";
import { Upload, X, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ComboboxWithCustom } from "./ComboboxWithCustom";
import {
  getMotorcycleMakes,
  getModelsForMakeYear,
  getYears,
} from "@/lib/nhtsa";
import { newBikeId, type StoredBike } from "@/data/bike-storage";
import { IOSSheet } from "@/components/ios/IOSSheet";
import { IOSListSection, IOSListRow } from "@/components/ios/IOSList";
import { IOSConfirm } from "@/components/ios/IOSConfirm";
import { IOSWheelPicker } from "@/components/ios/IOSWheelPicker";
import { IOSDateSheet } from "@/components/ios/IOSDateSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bike: StoredBike | null;
  onSave: (bike: StoredBike, photoFile?: File | null) => void | Promise<void>;
};

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const YEARS = getYears();

export function BikeFormModal({ open, onOpenChange, bike, onSave }: Props) {
  const isMobile = useIsMobile();

  // ─── state ─────────────────────────────────────────────
  const [brand, setBrand] = useState("");
  const [brandCustom, setBrandCustom] = useState(false);
  const [model, setModel] = useState("");
  const [modelCustom, setModelCustom] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [color, setColor] = useState("");
  const [nickname, setNickname] = useState("");
  const [mileage, setMileage] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [mods, setMods] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // mobile-only sub-sheets
  const [yearSheet, setYearSheet] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);
  const [modSheet, setModSheet] = useState(false);
  const [modInput, setModInput] = useState("");
  const [photoActions, setPhotoActions] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // снимок для определения «грязной» формы
  const initialSnapshotRef = useRef<string>("");

  const [makes, setMakes] = useState<string[]>([]);
  const [makesLoading, setMakesLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // ─── reset on open ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (bike) {
      setBrand(bike.brand);
      setBrandCustom(!!bike.custom);
      setModel(bike.model);
      setModelCustom(!!bike.custom);
      setYear(bike.year);
      setColor(bike.color ?? "");
      setNickname(bike.nickname ?? "");
      setMileage(bike.mileage ?? "");
      setPurchaseDate(bike.purchaseDate ?? "");
      setMods(bike.mods ?? []);
      setPhoto(bike.photo);
    } else {
      setBrand("");
      setBrandCustom(false);
      setModel("");
      setModelCustom(false);
      setYear(new Date().getFullYear());
      setColor("");
      setNickname("");
      setMileage("");
      setPurchaseDate("");
      setMods([]);
      setPhoto(undefined);
    }
    setPhotoFile(null);
    setModInput("");
    setPhotoError(null);
    setSubmitting(false);
    initialSnapshotRef.current = JSON.stringify({
      brand: bike?.brand ?? "",
      model: bike?.model ?? "",
      year: bike?.year ?? new Date().getFullYear(),
      color: bike?.color ?? "",
      nickname: bike?.nickname ?? "",
      mileage: bike?.mileage ?? "",
      purchaseDate: bike?.purchaseDate ?? "",
      mods: bike?.mods ?? [],
      photo: bike?.photo ?? "",
    });
  }, [open, bike]);

  function isDirty() {
    const current = JSON.stringify({
      brand,
      model,
      year,
      color,
      nickname,
      mileage,
      purchaseDate,
      mods,
      photo: photo ?? "",
    });
    return current !== initialSnapshotRef.current || !!photoFile;
  }

  function requestClose(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (submitting) return;
    if (isDirty()) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
  }

  // освобождаем blob-URL
  useEffect(() => {
    return () => {
      if (photo && photo.startsWith("blob:")) URL.revokeObjectURL(photo);
    };
  }, [photo]);

  // загрузка марок
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMakesLoading(true);
    getMotorcycleMakes()
      .then((list) => {
        if (!cancelled) setMakes(list);
      })
      .finally(() => {
        if (!cancelled) setMakesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // загрузка моделей при смене марки/года
  useEffect(() => {
    if (!open || !brand || brandCustom) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    getModelsForMakeYear(brand, year)
      .then((list) => {
        if (!cancelled) setModels(list);
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, brand, brandCustom, year]);

  function addMod(v: string) {
    const t = v.trim();
    if (!t || mods.includes(t)) return;
    setMods([...mods, t]);
  }
  function removeMod(m: string) {
    setMods(mods.filter((x) => x !== m));
  }

  function handlePhoto(file: File | undefined) {
    setPhotoError(null);
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      setPhotoError("Только PNG, JPG или WEBP");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Файл больше 15 МБ");
      return;
    }
    if (photo && photo.startsWith("blob:")) URL.revokeObjectURL(photo);
    setPhotoFile(file);
    setPhoto(URL.createObjectURL(file));
  }

  function clearPhoto() {
    if (photo && photo.startsWith("blob:")) URL.revokeObjectURL(photo);
    setPhoto(undefined);
    setPhotoFile(null);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!brand.trim() || !model.trim() || submitting) return;
    const result: StoredBike = {
      id: bike?.id ?? newBikeId(),
      brand: brand.trim(),
      model: model.trim(),
      year,
      custom: brandCustom || modelCustom,
      color: color.trim() || undefined,
      nickname: nickname.trim() || undefined,
      mileage: mileage.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      mods: mods.length > 0 ? mods : undefined,
      photo: photo || undefined,
    };
    try {
      setSubmitting(true);
      await onSave(result, photoFile);
      onOpenChange(false);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!brand.trim() && !!model.trim() && !submitting;

  // ─── мобильный iOS-форм-фактор ─────────────────────────
  if (isMobile) {
    return (
      <>
        <IOSSheet
          open={open}
          onOpenChange={(v) => requestClose(v)}
          title={bike ? "Редактировать байк" : "Добавить байк"}
          fullHeight
          onCancel={() => requestClose(false)}
          cancelLabel="Отмена"
          doneLabel={submitting ? "..." : bike ? "Сохранить" : "Добавить"}
          doneDisabled={!canSubmit}
          onDone={() => {
            if (!canSubmit) return;
            void handleSubmit();
          }}
          contentClassName="px-0 pt-3"
        >
          <div className={cn("space-y-5 pb-6", submitting && "pointer-events-none opacity-60")}>
            {/* Фото */}
            <div className="px-4">
              <PhotoCard
                photo={photo}
                error={photoError}
                onPick={handlePhoto}
                onTapWhenFilled={() => setPhotoActions(true)}
              />
            </div>

            {/* Основное */}
            <IOSListSection title="Мотоцикл">
              <IOSListRow
                label="Марка"
                onClick={undefined}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-[15px] text-foreground">Марка</span>
                  <div className="min-w-0 flex-1">
                    <ComboboxWithCustom
                      value={brand}
                      onChange={(v, custom) => {
                        setBrand(v);
                        setBrandCustom(custom);
                        setModel("");
                        setModelCustom(false);
                      }}
                      options={makes}
                      loading={makesLoading}
                      placeholder="Выбрать марку"
                      isCustom={brandCustom}
                    />
                  </div>
                </div>
              </IOSListRow>

              <IOSListRow>
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-[15px] text-foreground">Модель</span>
                  <div className="min-w-0 flex-1">
                    <ComboboxWithCustom
                      value={model}
                      onChange={(v, custom) => {
                        setModel(v);
                        setModelCustom(custom);
                      }}
                      options={models}
                      loading={modelsLoading}
                      placeholder={brand ? "Выбрать модель" : "Сначала марка"}
                      disabled={!brand}
                      isCustom={modelCustom}
                      emptyHint={
                        brandCustom
                          ? "Кастомная марка — введи модель"
                          : "Не найдено — введи вручную"
                      }
                    />
                  </div>
                </div>
              </IOSListRow>

              <IOSListRow
                label="Год"
                value={year}
                chevron
                onClick={() => setYearSheet(true)}
              />
            </IOSListSection>

            {/* Детали */}
            <IOSListSection title="Детали">
              <IOSListRow>
                <InlineTextRow
                  label="Цвет"
                  value={color}
                  onChange={setColor}
                  placeholder="Чёрный мат"
                />
              </IOSListRow>
              <IOSListRow>
                <InlineTextRow
                  label="Прозвище"
                  value={nickname}
                  onChange={setNickname}
                  placeholder="Гончая"
                />
              </IOSListRow>
              <IOSListRow>
                <InlineTextRow
                  label="Пробег"
                  value={mileage}
                  onChange={setMileage}
                  placeholder="18 400 км"
                  inputMode="numeric"
                />
              </IOSListRow>
              <IOSListRow
                label="Куплен"
                value={purchaseDate ? formatDate(purchaseDate) : "—"}
                chevron
                onClick={() => setDateSheet(true)}
              />
            </IOSListSection>

            {/* Тюнинг */}
            <IOSListSection title="Тюнинг и модификации">
              <IOSListRow
                label="Добавить"
                icon={<Plus className="h-5 w-5 text-primary" />}
                onClick={() => {
                  setModInput("");
                  setModSheet(true);
                }}
              />
              {mods.map((m) => (
                <IOSListRow
                  key={m}
                  label={m}
                  trailing={
                    <button
                      type="button"
                      onClick={() => removeMod(m)}
                      aria-label={`Удалить ${m}`}
                      className="flex h-9 w-9 items-center justify-center -mr-2 text-muted-foreground active:opacity-60"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  }
                />
              ))}
            </IOSListSection>
          </div>

          {submitting && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          )}
        </IOSSheet>

        {/* Год */}
        <IOSWheelPicker
          open={yearSheet}
          onOpenChange={setYearSheet}
          title="Год выпуска"
          columns={[
            {
              options: YEARS.map(String),
              value: String(year),
              onChange: (v) => setYear(Number(v)),
              width: "w-24",
            },
          ]}
        />

        {/* Дата */}
        <IOSDateSheet
          open={dateSheet}
          onOpenChange={setDateSheet}
          value={purchaseDate}
          onChange={setPurchaseDate}
          title="Дата покупки"
        />

        {/* Новая модификация */}
        <IOSSheet
          open={modSheet}
          onOpenChange={setModSheet}
          title="Тюнинг"
          onCancel={() => setModSheet(false)}
          doneLabel="Добавить"
          doneDisabled={!modInput.trim()}
          onDone={() => {
            addMod(modInput);
            setModSheet(false);
          }}
        >
          <div className="pt-2">
            <Input
              autoFocus
              value={modInput}
              onChange={(e) => setModInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (modInput.trim()) {
                    addMod(modInput);
                    setModSheet(false);
                  }
                }
              }}
              placeholder="Akrapovič, Pazzo levers..."
              className="h-12 border-white/[0.08] bg-black/30 text-[16px]"
            />
          </div>
        </IOSSheet>

        {/* Действия с фото */}
        <IOSSheet
          open={photoActions}
          onOpenChange={setPhotoActions}
          title="Фото"
          doneLabel="Закрыть"
        >
          <IOSListSection>
            <IOSListRow
              icon={<Pencil className="h-5 w-5" />}
              label="Заменить"
              onClick={() => {
                setPhotoActions(false);
                // даём sheet закрыться и потом открываем file picker
                setTimeout(() => {
                  const inp = document.createElement("input");
                  inp.type = "file";
                  inp.accept = "image/png,image/jpeg,image/webp";
                  inp.onchange = () => handlePhoto(inp.files?.[0] ?? undefined);
                  inp.click();
                }, 200);
              }}
            />
            <IOSListRow
              icon={<Trash2 className="h-5 w-5" />}
              label="Удалить фото"
              tone="danger"
              onClick={() => {
                clearPhoto();
                setPhotoActions(false);
              }}
            />
          </IOSListSection>
        </IOSSheet>

        {/* Подтверждение отмены */}
        <IOSConfirm
          open={confirmDiscard}
          onOpenChange={setConfirmDiscard}
          title="Закрыть без сохранения?"
          description="Все изменения будут потеряны."
          confirmLabel="Закрыть"
          cancelLabel="Остаться"
          destructive
          onConfirm={() => {
            setConfirmDiscard(false);
            onOpenChange(false);
          }}
        />
      </>
    );
  }

  // ─── десктоп ───────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/[0.08] bg-[#0b0b0b] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black uppercase italic tracking-tight">
            {bike ? "Редактировать байк" : "Добавить байк"}
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            База NHTSA · если нет в списке — введи вручную
          </DialogDescription>
        </DialogHeader>
        <form id="bike-form" onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Field label="Марка">
              <ComboboxWithCustom
                value={brand}
                onChange={(v, custom) => {
                  setBrand(v);
                  setBrandCustom(custom);
                  setModel("");
                  setModelCustom(false);
                }}
                options={makes}
                loading={makesLoading}
                placeholder="Yamaha, Honda..."
                isCustom={brandCustom}
              />
            </Field>
            <Field label="Год">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-11 w-full border border-white/[0.08] bg-black/30 px-3 text-base text-foreground transition-colors hover:border-white/20 focus:border-primary/60 focus:outline-none"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y} className="bg-[#0b0b0b]">
                    {y}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Модель">
            <ComboboxWithCustom
              value={model}
              onChange={(v, custom) => {
                setModel(v);
                setModelCustom(custom);
              }}
              options={models}
              loading={modelsLoading}
              placeholder={brand ? "Выбрать модель..." : "Сначала выбери марку"}
              disabled={!brand}
              isCustom={modelCustom}
              emptyHint={
                brandCustom
                  ? "Кастомная марка — введи модель вручную"
                  : "Моделей не найдено — введи вручную"
              }
            />
          </Field>

          <DesktopPhotoField
            photo={photo}
            error={photoError}
            onPick={handlePhoto}
            onClear={clearPhoto}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Цвет">
              <TextInput value={color} onChange={setColor} placeholder="Чёрный мат, розовый..." />
            </Field>
            <Field label="Прозвище">
              <TextInput value={nickname} onChange={setNickname} placeholder="Гончая, Чёрная вдова..." />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Пробег">
              <TextInput value={mileage} onChange={setMileage} placeholder="18 400 км" />
            </Field>
            <Field label="Дата покупки">
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="h-11 w-full border border-white/[0.08] bg-black/30 px-3 text-base text-foreground transition-colors hover:border-white/20 focus:border-primary/60 focus:outline-none"
              />
            </Field>
          </div>

          <Field label="Тюнинг / модификации">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={modInput}
                  onChange={(e) => setModInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (modInput.trim()) {
                        addMod(modInput);
                        setModInput("");
                      }
                    }
                  }}
                  placeholder="Akrapovič, Pazzo levers..."
                  className="h-11 border-white/[0.08] bg-black/30 text-base"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (modInput.trim()) {
                      addMod(modInput);
                      setModInput("");
                    }
                  }}
                  disabled={!modInput.trim()}
                  className="h-11 shrink-0 border border-white/[0.08] bg-black/30 px-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
                >
                  + Добавить
                </button>
              </div>
              {mods.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {mods.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-0.5 border border-primary/30 bg-primary/[0.06] py-1 pl-2.5 pr-1 font-mono text-[11px] uppercase tracking-wider text-primary"
                    >
                      {m}
                      <button
                        type="button"
                        onClick={() => removeMod(m)}
                        aria-label={`Удалить ${m}`}
                        className="flex h-7 w-7 items-center justify-center opacity-60 active:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] pt-4">
            <button
              type="button"
              onClick={() => requestClose(false)}
              className="border border-white/[0.08] bg-transparent px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!canSubmit}
              className="border border-primary bg-primary px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Сохраняем…" : bike ? "Сохранить" : "Добавить"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ───────── helpers ─────────

function formatDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function InlineTextRow({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal" | "search";
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-[15px] text-foreground w-[100px]">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="flex-1 bg-transparent text-right text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />
    </div>
  );
}

function PhotoCard({
  photo,
  error,
  onPick,
  onTapWhenFilled,
}: {
  photo: string | undefined;
  error: string | null;
  onPick: (f: File | undefined) => void;
  onTapWhenFilled: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div
        onClick={() => (photo ? onTapWhenFilled() : fileRef.current?.click())}
        className={cn(
          "relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/[0.06]",
          photo ? "bg-black/40" : "bg-white/[0.03] active:bg-white/[0.05]",
        )}
      >
        {photo ? (
          <>
            <img
              src={photo}
              alt="Превью байка"
              className="max-h-full max-w-full object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 1px color-mix(in oklab, var(--primary) 80%, transparent)) drop-shadow(0 0 8px color-mix(in oklab, var(--primary) 30%, transparent))",
              }}
            />
            <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
              Изменить
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04]">
              <Upload className="h-5 w-5" />
            </div>
            <span className="text-[13px]">Добавить фото</span>
            <span className="text-[11px] opacity-60">PNG, JPG, WEBP · до 15 МБ</span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => onPick(e.target.files?.[0] ?? undefined)}
          className="hidden"
        />
      </div>
      {error && (
        <p className="mt-2 text-center text-[12px] text-destructive">{error}</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border-white/[0.08] bg-black/30"
    />
  );
}

function DesktopPhotoField({
  photo,
  error,
  onPick,
  onClear,
}: {
  photo: string | undefined;
  error: string | null;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div>
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Фото байка
      </span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onPick(e.dataTransfer.files?.[0]);
        }}
        className={`relative flex min-h-[160px] items-center justify-center border border-dashed ${
          drag ? "border-primary bg-primary/[0.04]" : "border-white/[0.12] bg-black/20"
        } p-3 transition-colors`}
      >
        {photo ? (
          <>
            <img
              src={photo}
              alt="Превью байка"
              className="max-h-[200px] w-auto object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 1px color-mix(in oklab, var(--primary) 80%, transparent)) drop-shadow(0 0 8px color-mix(in oklab, var(--primary) 30%, transparent))",
              }}
            />
            <button
              type="button"
              onClick={onClear}
              aria-label="Удалить фото"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center border border-white/[0.1] bg-black/70 text-muted-foreground backdrop-blur transition-colors hover:border-destructive/50 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-2 right-2 border border-white/[0.1] bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
            >
              Заменить
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
          >
            <Upload className="h-6 w-6" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
              Перетащи или выбери файл
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">
              PNG, JPG, WEBP · до 15 МБ
            </span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => onPick(e.target.files?.[0] ?? undefined)}
          className="hidden"
        />
      </div>
      {error && (
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
