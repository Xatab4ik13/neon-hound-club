import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getMotorcycleMakes } from "@/lib/nhtsa";

import { BikeFormModal } from "@/components/club/BikeFormModal";
import { MobileGarage } from "@/components/club/MobileGarage";
import { type StoredBike } from "@/data/bike-storage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useViewer } from "@/hooks/use-viewer";
import {
  useBikes,
  useCreateBike,
  useDeleteBike,
  useUpdateBike,
  uploadFileToS3,
  type BikePayload,
  type ServerBike,
} from "@/lib/garage-api";
import { hhToast as toast } from "@/lib/hh-toast";

export const Route = createFileRoute("/club/garage")({
  head: () => ({
    meta: [
      { title: "Гараж — клуб HELLHOUND" },
      { name: "description", content: "Мои мотоциклы и журнал обслуживания." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GaragePage,
});

// Бэк → клиент: StoredBike-форма для существующих UI-компонентов.
function toStored(b: ServerBike): StoredBike {
  return {
    id: b.id,
    brand: b.brand,
    model: b.model,
    year: b.year ?? new Date().getFullYear(),
    color: b.color ?? undefined,
    nickname: b.nickname ?? undefined,
    mileage: b.mileage ?? undefined,
    purchaseDate: b.purchaseDate ?? undefined,
    mods: b.mods.length > 0 ? b.mods : undefined,
    photo: b.photos[0] ?? undefined,
  };
}

// Клиент → бэк: StoredBike → payload без поля photo (фото грузим отдельно).
function toPayload(b: StoredBike, photoUrl?: string | null): BikePayload {
  return {
    brand: b.brand,
    model: b.model,
    year: b.year,
    color: b.color ?? null,
    nickname: b.nickname ?? null,
    mileage: b.mileage ?? null,
    purchaseDate: b.purchaseDate ?? null,
    mods: b.mods ?? [],
    photos: photoUrl ? [photoUrl] : [],
  };
}

function GaragePage() {
  const { isAuthed, hydrated } = useViewer();
  const isMobile = useIsMobile();

  const bikesQ = useBikes(isAuthed);
  const createMut = useCreateBike();
  const updateMut = useUpdateBike();
  const deleteMut = useDeleteBike();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StoredBike | null>(null);

  const bikes = useMemo(() => (bikesQ.data ?? []).map(toStored), [bikesQ.data]);

  // Префетч NHTSA — только при первом открытии модалки, не на загрузке страницы.
  // Внутри есть localStorage-кеш на 30 дней, дальнейшие открытия мгновенные.
  const nhtsaPrefetched = useRef(false);
  useEffect(() => {
    if (modalOpen && !nhtsaPrefetched.current) {
      nhtsaPrefetched.current = true;
      void getMotorcycleMakes();
    }
  }, [modalOpen]);


  if (hydrated && !isAuthed) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-black uppercase italic text-foreground">
          Войди в клуб
        </h1>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
          Гараж доступен только участникам.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 border border-primary/60 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10"
        >
          Войти
        </Link>
      </main>
    );
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(b: StoredBike) {
    setEditing(b);
    setModalOpen(true);
  }

  async function handleSave(b: StoredBike, photoFile?: File | null) {
    const isNew = !bikesQ.data?.some((x) => x.id === b.id);
    const existing = bikesQ.data?.find((x) => x.id === b.id) ?? null;

    let photoUrl: string | null | undefined = undefined;
    if (photoFile) {
      // Новый файл — грузим в S3.
      try {
        photoUrl = await uploadFileToS3(photoFile, "bike", existing?.id);
      } catch (err) {
        toast.error("Не удалось загрузить фото", {
          description: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    } else if (existing) {
      // Файл не меняли — оставляем что было.
      photoUrl = existing.photos[0] ?? null;
    } else {
      photoUrl = null;
    }

    const payload = toPayload(b, photoUrl);

    try {
      if (isNew) {
        await createMut.mutateAsync(payload);
        toast.success("Байк добавлен");
      } else {
        await updateMut.mutateAsync({ id: b.id, patch: payload });
        toast.success("Изменения сохранены");
      }
    } catch (err) {
      toast.error("Не удалось сохранить", {
        description: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  function handleDelete(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Удалить байк?")) return;
    deleteMut.mutate(id, {
      onSuccess: () => toast.success("Байк удалён"),
      onError: (err) =>
        toast.error("Не удалось удалить", {
          description: err instanceof Error ? err.message : String(err),
        }),
    });
  }

  return (
    <>
      <MobileGarage
        bikes={bikes}
        onPersist={() => {
          /* persist делается per-mutation, общий callback не нужен */
        }}
        onAddBike={openAdd}
        onEditBike={openEdit}
        onDeleteBike={handleDelete}
        variant={isMobile ? "mobile" : "desktop"}
      />
      <BikeFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        bike={editing}
        onSave={handleSave}
      />
    </>
  );
}
