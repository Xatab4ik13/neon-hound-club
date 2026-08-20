// Временная диагностическая страница: проверка рендера 3D-персонажей.
import { createFileRoute } from "@tanstack/react-router";
import { RiderCharacter } from "@/components/club/hound-hunt/RiderCharacter";

export const Route = createFileRoute("/dev-rider")({
  component: DevRider,
});

function DevRider() {
  return (
    <div className="bg-black">
      <div className="h-[500px] w-full" data-testid="hero">
        <RiderCharacter mode="idle" instance="hero" dance instantDance className="h-full w-full" />
      </div>
      <div className="h-[500px] w-full" data-testid="action">
        <RiderCharacter mode="lunge" instance="action" kickToken={1} className="h-full w-full" />
      </div>
    </div>
  );
}
