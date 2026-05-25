// Сентинель для infinite scroll: триггерит loadMore когда подходит к низу ленты.
// Использует IntersectionObserver с rootMargin 400px — подгружает заранее.

import { useEffect, useRef } from "react";
import { feedStore, useFeedPagination } from "@/data/feed-store";
import { PostSkeleton } from "./PostSkeleton";

export function FeedSentinel() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { hasMore, loadingMore } = useFeedPagination();

  useEffect(() => {
    if (!hasMore) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Fallback: просто грузим один раз
      feedStore.loadMore();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          feedStore.loadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  if (!hasMore && !loadingMore) {
    return (
      <div className="py-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
        Это всё
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-5">
      {loadingMore && (
        <>
          <PostSkeleton />
          <PostSkeleton withImage />
        </>
      )}
    </div>
  );
}
