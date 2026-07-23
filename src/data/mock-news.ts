// Моковые новости для визуальной прототипной ленты NEWS.
// Бэкенд не подключён — данные статические, лайк/каунты обновляются локально
// через useSyncExternalStore, чтобы UI ощущался «живым».
//
// Формат намеренно совпадает по духу с FeedPost (id, text, image, createdAt,
// likes/liked, commentsCount), но это отдельный тип — не пихаем в feedStore,
// чтобы не конфликтовать с рефетчами настоящей ленты с бэка.

import { useSyncExternalStore } from "react";

export type NewsPost = {
  id: string;
  category: string; // напр. "MotoGP", "Dakar", "Индустрия" — просто ярлык под NEWS
  title: string;
  text: string;
  image?: string;
  createdAt: string; // ISO
  likes: number;
  liked: boolean;
  commentsCount: number;
};

// ─── Стартовый набор ──────────────────────────────────────────────
let NEWS: NewsPost[] = [
  {
    id: "news-mock-1",
    category: "MotoGP",
    title: "Марк Маркес выиграл квалификацию в Мизано",
    text:
      "Восьмикратный чемпион мира взял поул на домашнем этапе Ducati. " +
      "Отрыв от партнёра по команде — 0.184 секунды. Гонка в воскресенье в 15:00 МСК.",
    image:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=70",
    createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    likes: 148,
    liked: false,
    commentsCount: 24,
  },
  {
    id: "news-mock-2",
    category: "Индустрия",
    title: "KTM представила новый Duke 990 R",
    text:
      "Австрийцы обновили линейку среднекубатурных нейкедов. " +
      "Мотор форсировали до 128 л.с., подвеска WP Apex Pro, новая рама. " +
      "Продажи в Европе стартуют весной 2027.",
    image:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=70",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    likes: 92,
    liked: false,
    commentsCount: 11,
  },
  {
    id: "news-mock-3",
    category: "WSBK",
    title: "Разгар сезона: Разгаталье выиграл вторую гонку в Ассене",
    text:
      "Турок сравнялся по очкам с Бассани в общем зачёте. До конца сезона четыре этапа — интрига живёт.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    likes: 41,
    liked: false,
    commentsCount: 6,
  },
  {
    id: "news-mock-4",
    category: "Dakar",
    title: "Ross Branch подписал контракт с Hero MotoSports",
    text:
      "Ботсванец продолжит выступать за индийскую команду ещё два сезона. " +
      "В 2026 году он финишировал третьим в общем зачёте Dakar Rally.",
    image:
      "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=1200&q=70",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    likes: 63,
    liked: false,
    commentsCount: 8,
  },
  {
    id: "news-mock-5",
    category: "Россия",
    title: "Открыта регистрация на Moscow Raceway Trackday",
    text:
      "3 августа — открытая тренировка для мотоциклистов на большом кольце. " +
      "Три группы по уровню подготовки, стоимость от 8 900 ₽.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    likes: 27,
    liked: false,
    commentsCount: 3,
  },
];

// ─── Мини-стор с подпиской ────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const mockNewsStore = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot(): NewsPost[] {
    return NEWS;
  },
  toggleLike(id: string, liked: boolean) {
    NEWS = NEWS.map((n) =>
      n.id === id
        ? { ...n, liked, likes: Math.max(0, n.likes + (liked ? 1 : 0) - (n.liked ? 1 : 0)) }
        : n,
    );
    emit();
  },
};

export function useMockNews(): NewsPost[] {
  return useSyncExternalStore(
    mockNewsStore.subscribe,
    mockNewsStore.getSnapshot,
    mockNewsStore.getSnapshot,
  );
}

export function useMockNewsById(id: string): NewsPost | undefined {
  const all = useMockNews();
  return all.find((n) => n.id === id);
}

