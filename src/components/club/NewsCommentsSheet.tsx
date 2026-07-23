// Заглушка листа комментариев для NEWS-ленты.
//
// Визуально повторяет CommentsSheet из club.index.tsx (адаптивный шит, тот же
// стиль пустого состояния и композера), но НЕ подключён к бэкенду и стору.
//
// Когда появится реальный API для новостных комментариев, всё, что нужно
// сделать — заменить этот файл на полноценный компонент с загрузкой/отправкой
// (или переиспользовать CommentsSheet, унифицировав тип поста). Внешний API
// компонента (open / onOpenChange / postId) специально совпадает по духу
// с CommentsSheet, чтобы миграция была локальной.
import { AdaptiveSheet } from "@/components/club/AdaptiveSheet";
import { PlumpComment, Send } from "@/components/ui/icons";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postId: string;
  postTitle?: string;
};

// Салатовый акцент NEWS-ленты
const NEWS_COLOR = "#B6FF3C";

export function NewsCommentsSheet({ open, onOpenChange, postTitle }: Props) {
  return (
    <AdaptiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={postTitle ? `Комментарии · ${postTitle}` : "Комментарии"}
      fullHeight
    >
      <div className="flex h-full min-h-[60vh] flex-col">
        {/* Пустое состояние */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: `${NEWS_COLOR}22`, color: NEWS_COLOR }}
          >
            <PlumpComment className="h-7 w-7" />
          </div>
          <div className="font-display text-[15px] font-black uppercase tracking-[0.14em] text-foreground">
            Пока нет комментариев
          </div>
          <p className="max-w-[280px] text-[13px] leading-snug text-muted-foreground">
            Комментарии к новостям появятся здесь, как только мы подключим их к бэкенду.
          </p>
        </div>

        {/* Композер-заглушка (задизейблен) */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="sticky bottom-0 flex items-center gap-2 border-t border-white/[0.06] bg-background/95 px-3 py-3 backdrop-blur"
        >
          <input
            type="text"
            disabled
            placeholder="Комментарии скоро появятся"
            className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[14px] text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled
            aria-label="Отправить"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </AdaptiveSheet>
  );
}
