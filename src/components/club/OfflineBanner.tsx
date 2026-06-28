import { useEffect, useState } from "react";
import { WifiOff } from "@/components/ui/icons";

// Тонкая плашка под статус-баром, когда устройство офлайн.
// Появляется с slide-down, исчезает сама когда соединение восстановилось.
export function OfflineBanner() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <div
      aria-hidden={online}
      role="status"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
      style={{
        top: "env(safe-area-inset-top)",
        transform: online ? "translateY(-120%)" : "translateY(0)",
        transition: "transform 280ms cubic-bezier(0.32,0.72,0,1)",
      }}
    >
      <div className="mt-1 flex items-center gap-2 rounded-full border border-white/10 bg-black/85 px-3 py-1.5 backdrop-blur-xl">
        <WifiOff className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
          Нет интернета
        </span>
      </div>
    </div>
  );
}
