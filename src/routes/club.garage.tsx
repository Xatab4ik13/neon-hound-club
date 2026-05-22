import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BikeFormModal } from "@/components/club/BikeFormModal";
import { MobileGarage } from "@/components/club/MobileGarage";
import { loadBikes, saveBikes, type StoredBike } from "@/data/bike-storage";
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
      <MobileGarage
        bikes={bikes}
        onPersist={persist}
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

