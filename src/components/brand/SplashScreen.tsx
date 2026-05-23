export function SplashScreen({ label = "прогрев двигателя" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,45,149,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,149,0.05) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, #000 30%, transparent 70%)",
          maskImage:
            "radial-gradient(circle at 50% 50%, #000 30%, transparent 70%)",
        }}
      />

      {/* tachometer */}
      <div className="relative flex items-center justify-center">
        <div className="relative w-[55vw] max-w-[220px] aspect-square rounded-full border border-[#1a1a1a]">
          <div className="absolute inset-2 rounded-full border border-dashed border-[#222]" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
            style={{
              borderTopColor: "hsl(330 100% 58%)",
              borderRightColor: "hsl(330 100% 58%)",
              filter: "drop-shadow(0 0 8px #FF2D95)",
              animationDuration: "1s",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-primary leading-none text-[56px]">
              H
            </span>
          </div>
        </div>
      </div>

      {/* labels */}
      <div className="absolute bottom-[22%] left-0 right-0 text-center font-mono text-[10px] tracking-[0.5em] uppercase text-[#777]">
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
