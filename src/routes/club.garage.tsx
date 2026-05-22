import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BikeCard } from "@/components/club/BikeCard";
import { HeroBikeCard } from "@/components/club/HeroBikeCard";
import { BikeFormModal } from "@/components/club/BikeFormModal";
import { EmptyGarageSlot } from "@/components/club/EmptyGarageSlot";
import { BikeJournal } from "@/components/club/BikeJournal";
import { MobileGarage } from "@/components/club/MobileGarage";
import { loadBikes, saveBikes, type StoredBike } from "@/data/bike-storage";
import { PageHeader } from "@/components/club/PageHeader";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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

  return (
    <>
      <div className="mx-auto w-full max-w-2xl">
        <MobileGarage
          bikes={bikes}
          onPersist={persist}
          onAddBike={openAdd}
          onEditBike={openEdit}
          onDeleteBike={handleDelete}
        />
      </div>
      <BikeFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        bike={editing}
        onSave={handleSave}
      />
    </>
  );
}
