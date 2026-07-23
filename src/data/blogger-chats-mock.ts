// Мок-данные для веб-чата блогера. Одна точка правды на список чатов
// и историю переписки — используется и списком, и страницей диалога.
// Заменяется на реальный API, когда бэкенд под чат будет готов.

export type ChatUser = {
  id: string;
  nick: string;
  avatarUrl?: string;
  online?: boolean;
};

export type ChatMsg = {
  id: string;
  // "them" — сообщение от подписчика, "me" — от блогера (Hell)
  role: "them" | "me";
  text?: string;
  sticker?: string;
  at: number;
};

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const CHAT_USERS: ChatUser[] = [
  { id: "u1", nick: "vanya_rider", online: true },
  { id: "u2", nick: "sergey_bmw" },
  { id: "u3", nick: "kris_ktm", online: true },
  { id: "u4", nick: "artem_gsx" },
  { id: "u5", nick: "denis_r1" },
  { id: "u6", nick: "misha_z900" },
  { id: "u7", nick: "kolya_streetfighter" },
  { id: "u8", nick: "pasha_mt07" },
];

export const CHAT_HISTORY: Record<string, ChatMsg[]> = {
  u1: [
    { id: "u1-1", role: "them", text: "Hell, привет. Заказал вчера кепку — когда отправка?", at: NOW - 3 * HOUR },
    { id: "u1-2", role: "me", text: "Йо. Партия придёт в четверг, в пятницу отправлю СДЭКом.", at: NOW - 3 * HOUR + 12 * MIN },
    { id: "u1-3", role: "them", text: "Топ, спасибо!", at: NOW - 3 * HOUR + 14 * MIN },
    { id: "u1-4", role: "them", text: "А ещё вопрос по цепи на MT-07, если можно.", at: NOW - 40 * MIN },
  ],
  u2: [
    { id: "u2-1", role: "them", text: "Здарова. Есть шанс попасть на разбор R1 в школе?", at: NOW - 1 * DAY - HOUR },
    { id: "u2-2", role: "me", text: "Да, февральский поток открыт. Скинь ник — добавлю в лист.", at: NOW - 1 * DAY - 40 * MIN },
    { id: "u2-3", role: "them", text: "sergey_bmw", at: NOW - 1 * DAY - 30 * MIN },
  ],
  u3: [
    { id: "u3-1", role: "them", text: "Хеллоу! Билеты за квесты когда начислятся?", at: NOW - 5 * HOUR },
    { id: "u3-2", role: "me", text: "К вечеру подтянутся, обновление раз в час.", at: NOW - 4 * HOUR - 30 * MIN },
  ],
  u4: [
    { id: "u4-1", role: "them", text: "Обзор нового шлема Shoei будет?", at: NOW - 2 * DAY },
  ],
  u5: [
    { id: "u5-1", role: "me", text: "Спасибо, что был на встрече в парке.", at: NOW - 3 * DAY },
    { id: "u5-2", role: "them", text: "Кайф был, в следующий раз соберёмся большим составом.", at: NOW - 3 * DAY + HOUR },
  ],
  u6: [
    { id: "u6-1", role: "them", text: "Hell, какая резина на Z900 сейчас?", at: NOW - 6 * HOUR },
  ],
  u7: [
    { id: "u7-1", role: "them", text: "Приветствую! Розыгрыш платины уже стартовал?", at: NOW - 20 * MIN },
  ],
  u8: [
    { id: "u8-1", role: "them", text: "Спасибо за помощь по подвеске 👍", at: NOW - 8 * HOUR },
    { id: "u8-2", role: "me", text: "Заезжай на следующий стрим.", at: NOW - 7 * HOUR },
  ],
};

export function getUser(id: string): ChatUser | undefined {
  return CHAT_USERS.find((u) => u.id === id);
}

export function lastMessage(userId: string): ChatMsg | undefined {
  const list = CHAT_HISTORY[userId];
  return list && list.length ? list[list.length - 1] : undefined;
}

export function chatPreview(m?: ChatMsg): string {
  if (!m) return "Нет сообщений";
  if (m.text) return m.text;
  if (m.sticker) return "Стикер";
  return "Сообщение";
}
