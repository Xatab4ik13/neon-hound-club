import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BikeCard } from "@/components/club/BikeCard";
import { HeroBikeCard } from "@/components/club/HeroBikeCard";
import { BikeFormModal } from "@/components/club/BikeFormModal";
import { EmptyGarageSlot } from "@/components/club/EmptyGarageSlot";
import { BikeJournal } from "@/components/club/BikeJournal";
import { loadBikes, saveBikes, type StoredBike } from "@/data/bike-storage";
import { PageHeader } from "@/components/club/PageHeader";

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

function GaragePage() {
  const [bikes, setBikes] = useState<StoredBike[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StoredBike | null>(null);

  useEffect(() => {
    setBikes(loadBikes());
  }, []);

  function persist(next: StoredBike[]) {
    setBikes(next);
    saveBikes(next);
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(b: StoredBike) {
    setEditing(b);
    setModalOpen(true);
  }
  function handleSave(b: StoredBike) {
    const exists = bikes.some((x) => x.id === b.id);
    persist(exists ? bikes.map((x) => (x.id === b.id ? b : x)) : [...bikes, b]);
  }
  function handleDelete(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Удалить байк?")) return;
    persist(bikes.filter((x) => x.id !== id));
  }

  const [primary, ...rest] = bikes;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Гараж" subtitle={`Слотов: ${bikes.length}/2`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {primary ? (
          <div className="col-span-2 md:col-span-3">
            <HeroBikeCard
              bike={primary}
              onEdit={() => openEdit(primary)}
              onDelete={() => handleDelete(primary.id)}
            />
          </div>
        ) : (
          <div className="md:col-span-3">
            <EmptyGarageSlot onAdd={openAdd} />
          </div>
        )}
        <div className="md:col-span-1">
          <EmptyGarageSlot onAdd={openAdd} />
        </div>
      </div>

      {primary && (
        <div className="mt-6">
          <BikeJournal
            bikeId={primary.id}
            currentMileage={parseInt((primary.mileage ?? "").replace(/\D/g, ""), 10) || 0}
          />
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rest.map((b) => (
            <BikeCard
              key={b.id}
              bike={b}
              onEdit={() => openEdit(b)}
              onDelete={() => handleDelete(b.id)}
            />
          ))}
        </div>
      )}

      <BikeFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        bike={editing}
        onSave={handleSave}
      />
    </main>
  );
}
