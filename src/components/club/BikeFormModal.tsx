import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bike: StoredBike | null; // null = create
  /**
   * Сохранение байка.
   * - bike: текущая форма (photo — либо http(s) URL уже на S3, либо dataURL-превью)
   * - photoFile: если юзер выбрал новый файл — передаём File для загрузки в S3.
   * Возвращает Promise: на время аплоада форма блокируется.
   */
  onSave: (bike: StoredBike, photoFile?: File | null) => void | Promise<void>;
};

const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15 МБ — большие фото для кропа
const YEARS = getYears();


export function BikeFormModal({ open, onOpenChange, bike, onSave }: Props) {
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
  const [modInput, setModInput] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);


  // Источники данных
  const [makes, setMakes] = useState<string[]>([]);
  const [makesLoading, setMakesLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Сброс/инициализация при открытии
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
  }, [open, bike]);


  // Загрузка списка марок
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

  // Загрузка моделей при смене марки/года (только если марка не кастомная)
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

  function addMod() {
    const v = modInput.trim();
    if (!v || mods.includes(v)) return;
    setMods([...mods, v]);
    setModInput("");
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
    // Если до этого было локальное превью — освобождаем blob, чтобы не текло.
    if (photo && photo.startsWith("blob:")) URL.revokeObjectURL(photo);
    setPhotoFile(file);
    setPhoto(URL.createObjectURL(file));
  }


  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    // eslint-disable-next-line no-console
    console.log("[BikeFormModal] submit click", { brand, model, submitting });
    if (!brand.trim() || !model.trim() || submitting) {
      // eslint-disable-next-line no-console
      console.warn("[BikeFormModal] submit blocked", {
        brand,
        model,
        submitting,
      });
      return;
    }
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


  const isMobile = useIsMobile();
  const canSubmit = !!brand.trim() && !!model.trim() && !submitting;

  const formBody = (
    <form id="bike-form" onSubmit={handleSubmit} className="space-y-5 pt-2">
      {/* Марка / Год / Модель */}
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
            className="w-full border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-foreground transition-colors hover:border-white/20 focus:border-primary/60 focus:outline-none"
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

      <PhotoField
        photo={photo}
        error={photoError}
        onPick={handlePhoto}
        onClear={() => {
          if (photo && photo.startsWith("blob:")) URL.revokeObjectURL(photo);
          setPhoto(undefined);
          setPhotoFile(null);
        }}
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
            className="w-full border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-foreground transition-colors hover:border-white/20 focus:border-primary/60 focus:outline-none"
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
                  addMod();
                }
              }}
              placeholder="Akrapovič, Pazzo levers... (Enter)"
              className="border-white/[0.08] bg-black/30"
            />
            <button
              type="button"
              onClick={addMod}
              disabled={!modInput.trim()}
              className="border border-white/[0.08] bg-black/30 px-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
            >
              + Добавить
            </button>
          </div>
          {mods.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {mods.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 border border-primary/30 bg-primary/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => removeMod(m)}
                    aria-label={`Удалить ${m}`}
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Field>

      {/* Десктоп: footer actions. Мобайл: Сохранить — в шапке IOSSheet. */}
      {!isMobile && (
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
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
      )}
    </form>
  );

  if (isMobile) {
    return (
      <IOSSheet
        open={open}
        onOpenChange={onOpenChange}
        title={bike ? "Редактировать байк" : "Добавить байк"}
        fullHeight
        doneLabel={bike ? "Сохранить" : "Добавить"}
        onDone={() => {
          if (!canSubmit) return;
          const form = document.getElementById("bike-form") as HTMLFormElement | null;
          form?.requestSubmit();
        }}
      >
        {formBody}
      </IOSSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/[0.08] bg-[#0b0b0b] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black uppercase italic tracking-tight">
            {bike ? "Редактировать байк" : "Добавить байк"}
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            База NHTSA · если нет в списке — введи вручную
          </DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
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

function PhotoField({
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
              PNG, JPG, WEBP · до 5 МБ
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
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">
        Совет: PNG с прозрачным фоном смотрится лучше всего
      </p>
    </div>
  );
}
