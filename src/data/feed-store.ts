// Общий стор постов клубной ленты. Используется и в /club (просмотр для всех),
// и в /blogger (управление: создание, редактирование, удаление + модерация комментов).

import { useSyncExternalStore } from "react";

export type FeedComment = {
  id: string;
  authorSlug: string;
  time: string;
  text: string;
  likes: number;
};

export type FeedPost = {
  id: string;
  authorSlug: string;
  time: string;
  text: string;
  image?: string;
  likes: number;
  pinned?: boolean;
  comments: FeedComment[];
};

let POSTS: FeedPost[] = [
  {
    id: "1",
    authorSlug: "hell",
    time: "2 ч",
    pinned: true,
    text: "Розыгрыш Yamaha R1 закрывается в воскресенье. Осталось 412 билетов из 3000. Кто ещё думает — подумайте быстрее.",
    image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80",
    likes: 842,
    comments: [
      { id: "c1", authorSlug: "asphalt_dog", time: "22 мин", text: "Уже закинул на три билета. В этот раз повезёт больше, чем с Кавасаки.", likes: 18 },
      { id: "c2", authorSlug: "tankslapper", time: "1 ч", text: "По стате R1 идёт активнее, чем R6 в прошлом сезоне. Логично — модель свежее.", likes: 9 },
      { id: "c3", authorSlug: "vasya_pit", time: "1 ч", text: "А по доставке выигравшему — забирать самому или привезут?", likes: 4 },
      { id: "c4", authorSlug: "hell_legend_01", time: "2 ч", text: "Hell, спасибо за честный розыгрыш. Уже третий год подряд участвую.", likes: 27 },
    ],
  },
  {
    id: "2",
    authorSlug: "hell",
    time: "вчера",
    text: "Снимаем новый ролик про падения. RAW-камеры с трека уйдут только в клуб — за неделю до публики.",
    likes: 1204,
    comments: [
      { id: "c5", authorSlug: "vip_rider", time: "10 ч", text: "Это причина оставаться в клубе. Спасибо.", likes: 33 },
      { id: "c6", authorSlug: "rookie_max", time: "8 ч", text: "А будет момент с тем выездом на гравий?", likes: 2 },
    ],
  },
  {
    id: "3",
    authorSlug: "team_pavel",
    time: "2 дн",
    text: "Перчатки HELLHOUND v2 поехали в производство. Первая партия — 300 пар, waitlist открываем в пятницу.",
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80",
    likes: 567,
    comments: [
      { id: "c7", authorSlug: "moto_anya", time: "1 д", text: "Размерная сетка та же, что у v1, или поменялась? У меня M был впритык.", likes: 11 },
      { id: "c8", authorSlug: "garage_77", time: "20 ч", text: "Защита костяшек обновилась? На v1 за сезон стёрлась.", likes: 6 },
      { id: "c9", authorSlug: "wheelie_kid", time: "5 ч", text: "Платина, забирайте перед общим стартом. Иначе разберут.", likes: 14 },
    ],
  },
  {
    id: "4",
    authorSlug: "hell",
    time: "3 дн",
    text: "Скинул в общий чат маршрут на субботу — Дмитров, 180 км по плохому асфальту. Кто едет — отметьтесь.",
    likes: 392,
    comments: [
      { id: "c10", authorSlug: "kuzya_msk", time: "2 д", text: "Я в деле. На R6, средний темп норм?", likes: 3 },
      { id: "c11", authorSlug: "captain_volk", time: "2 д", text: "Если асфальт реально плохой — лучше не на спорте. Возьму твин.", likes: 8 },
    ],
  },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const feedStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot() {
    return POSTS;
  },
  addPost(input: { text: string; image?: string; authorSlug: string }) {
    const post: FeedPost = {
      id: `p${Date.now()}`,
      authorSlug: input.authorSlug,
      text: input.text,
      image: input.image,
      time: "только что",
      likes: 0,
      comments: [],
    };
    POSTS = [post, ...POSTS];
    emit();
    return post;
  },
  updatePost(id: string, patch: Partial<Pick<FeedPost, "text" | "image" | "pinned">>) {
    POSTS = POSTS.map((p) => (p.id === id ? { ...p, ...patch } : p));
    emit();
  },
  removePost(id: string) {
    POSTS = POSTS.filter((p) => p.id !== id);
    emit();
  },
  removeComment(postId: string, commentId: string) {
    POSTS = POSTS.map((p) =>
      p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p,
    );
    emit();
  },
  addComment(postId: string, input: { authorSlug: string; text: string }) {
    const comment: FeedComment = {
      id: `c${Date.now()}`,
      authorSlug: input.authorSlug,
      time: "только что",
      text: input.text,
      likes: 0,
    };
    POSTS = POSTS.map((p) =>
      p.id === postId ? { ...p, comments: [...p.comments, comment] } : p,
    );
    emit();
    return comment;
  },

};

export function useFeedPosts() {
  return useSyncExternalStore(feedStore.subscribe, feedStore.getSnapshot, feedStore.getSnapshot);
}
