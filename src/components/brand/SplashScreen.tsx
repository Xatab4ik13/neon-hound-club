/**
 * SplashScreen — показывается роутером (defaultPendingComponent) на
 * «холодных» переходах, длиннее ~1.2s. Визуально совпадает с boot splash
 * из index.html, чтобы при переходе boot → React не было ни мерцания,
 * ни смены позиций элементов.
 *
 * Производительность:
 *   - анимация только transform/opacity → GPU-композитинг
 *   - НЕТ filter: drop-shadow на анимированном слое (даёт jank на iOS)
 *   - НЕТ mask-image на родителе (постоянная перерисовка)
 *   - свечение делается через статичный box-shadow на родителе
 *   - will-change: transform на крутящемся кольце
 *   - reduced-motion: замедляем анимацию вместо отключения (UX лучше)
 */
export function SplashScreen({
  label = "прогрев двигателя",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Загрузка"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-background animate-in fade-in duration-200"
      style={{
        backgroundImage: [
          "radial-gradient(circle at 50% 50%, rgba(255,45,149,0.07), transparent 60%)",
          "linear-gradient(rgba(255,45,149,0.05) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(255,45,149,0.05) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "100% 100%, 30px 30px, 30px 30px",
        backgroundPosition: "center, 0 0, 0 0",
      }}
    >
      {/* tachometer */}
      <div className="relative flex items-center justify-center">
        <div
          className="relative aspect-square w-[55vw] max-w-[220px] rounded-full border border-[#1a1a1a]"
          style={{
            boxShadow:
              "0 0 60px rgba(255,45,149,0.25), inset 0 0 30px rgba(255,45,149,0.08)",
          }}
        >
          <div className="absolute inset-2 rounded-full border border-dashed border-[#222]" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent motion-reduce:[animation-duration:3s]"
            style={{
              borderTopColor: "hsl(330 100% 58%)",
              borderRightColor: "hsl(330 100% 58%)",
              animation: "hh-spin 1.1s linear infinite",
              willChange: "transform",
              transform: "translateZ(0)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-display leading-none text-primary"
              style={{
                fontSize: 56,
                textShadow: "0 0 12px rgba(255,45,149,0.45)",
              }}
            >
              H
            </span>
          </div>
        </div>
      </div>

      {/* labels */}
      <div
        className="absolute bottom-[22%] left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.5em] text-[#777] motion-reduce:!animate-none"
        style={{ animation: "hh-pulse 1.6s ease-in-out infinite" }}
      >
        {label}
      </div>
      <div className="absolute bottom-[16%] left-0 right-0 text-center font-display text-sm tracking-[0.3em] text-foreground">
        —— 6 200 RPM ——
      </div>

      {/* footer */}
      <div className="absolute bottom-[6%] left-6 right-6 flex justify-between font-mono text-[9px] tracking-[0.25em] text-[#444]">
        <span>HHR.PRO</span>
        <span>SYSTEM // BOOT</span>
      </div>
    </div>
  );
}

export default SplashScreen;
