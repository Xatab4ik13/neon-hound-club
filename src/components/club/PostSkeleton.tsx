// Скелет карточки поста с shimmer-анимацией.
// Форма ровно как у настоящей PostCard — нет layout shift при подмене.

type Props = { withImage?: boolean };

export function PostSkeleton({ withImage = false }: Props) {
  return (
    <div
      className="post-card relative overflow-hidden rounded-[24px] border border-white/[0.06]"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.18 0.015 280 / 0.85) 0%, oklch(0.14 0.01 280 / 0.85) 55%, oklch(0.12 0.008 280 / 0.9) 100%)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      }}
    >
      <header className="flex items-center gap-3 px-4 pt-4 md:px-5 md:pt-5">
        <div className="skel h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skel h-3 w-32 rounded" />
          <div className="skel h-2 w-20 rounded" />
        </div>
      </header>

      <div className="space-y-2 px-4 pb-3 pt-3 md:px-5">
        <div className="skel h-3 w-[92%] rounded" />
        <div className="skel h-3 w-[78%] rounded" />
        <div className="skel h-3 w-[60%] rounded" />
      </div>

      {withImage && (
        <div className="px-3 pb-3">
          <div className="skel aspect-[16/9] w-full rounded-[16px]" />
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3 md:px-5">
        <div className="skel h-8 w-16 rounded-full" />
        <div className="skel h-8 w-14 rounded-full" />
        <div className="skel ml-auto h-9 w-9 rounded-full" />
      </div>

      <style>{`
        .skel {
          position: relative;
          overflow: hidden;
          background: rgba(255,255,255,0.05);
        }
        .skel::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.07) 50%,
            transparent 100%
          );
          animation: skel-shimmer 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes skel-shimmer {
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .skel::after { animation: none; }
        }
      `}</style>
    </div>
  );
}
