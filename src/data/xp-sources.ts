// Справочник источников XP. Это «правила игры» — отсюда же будет питаться
// будущая страница «как качать ранг» в кабинете. Реальное начисление подключим
// когда появится бэк; сейчас это документ-источник правды.

export type XpCategory =
  | "onboarding"
  | "raffles"
  | "merch"
  | "pass"
  | "ai"
  | "school"
  | "retention"
  | "referral"
  | "quests";

export type XpSource = {
  id: string;
  category: XpCategory;
  title: string;
  xp: string;       // человекочитаемая величина: "+5 XP", "+1 XP / 100 ₽"
  limit?: string;   // ограничение от абуза
  note?: string;
};

export const XP_CATEGORIES: Record<XpCategory, { label: string; hint: string }> = {
  onboarding: { label: "Старт", hint: "Разовые действия после регистрации" },
  raffles:    { label: "Розыгрыши", hint: "Ядро вовлечения" },
  merch:      { label: "Мерч", hint: "Покупки и подтверждения" },
  pass:       { label: "Hell Pass", hint: "Ежемесячно по тиру подписки" },
  ai:         { label: "Hell AI", hint: "Полезное использование AI-механика" },
  school:     { label: "Школа", hint: "Прохождение курсов" },
  retention:  { label: "Активность", hint: "Daily login и серии" },
  referral:   { label: "Рефералы", hint: "Привёл друга, который купил" },
  quests:     { label: "Сезонные квесты", hint: "Раз в 1–3 месяца" },
};

export const XP_SOURCES: XpSource[] = [
  // Онбординг — суммарно до 250 XP
  { id: "verify-email",   category: "onboarding", title: "Подтвердить email",                       xp: "+50 XP" },
  { id: "fill-profile",   category: "onboarding", title: "Заполнить профиль (мото + город + аватар)", xp: "+100 XP" },
  { id: "link-yt",        category: "onboarding", title: "Привязать подписку на YouTube HELLHOUND",   xp: "+100 XP" },

  // Розыгрыши
  { id: "postcard-buy",   category: "raffles", title: "Покупка цифровой открытки Hell", xp: "+5 XP / билет", limit: "макс. 50 XP с одной открытки" },
  { id: "raffle-1st",     category: "raffles", title: "Победа в розыгрыше (1 место)", xp: "+500 XP" },
  { id: "raffle-2-3",     category: "raffles", title: "Призовое место 2–3", xp: "+150 XP" },

  // Мерч
  { id: "merch-buy",      category: "merch", title: "Покупка мерча",                 xp: "+1 XP / 100 ₽" },
  { id: "merch-review",   category: "merch", title: "Подтвердить получение + отзыв с фото", xp: "+50 XP / заказ" },
  { id: "waitlist-conv",  category: "merch", title: "Waitlist → конверсия в покупку", xp: "+30 XP" },

  // Hell Pass (ежемесячно)
  { id: "pass-silver",    category: "pass", title: "Hell Pass Silver (490 ₽/мес)",     xp: "+50 XP / мес" },
  { id: "pass-gold",      category: "pass", title: "Hell Pass Gold (1 290 ₽/мес)",     xp: "+150 XP / мес" },
  { id: "pass-platinum",  category: "pass", title: "Hell Pass Platinum (2 990 ₽/мес)", xp: "+400 XP / мес" },

  // Hell AI
  { id: "ai-helpful",     category: "ai", title: "Вопрос Hell AI с пометкой «помогло»", xp: "+5 XP", limit: "макс. 50 XP / мес" },

  // Школа
  { id: "school-fall",    category: "school", title: "Курс «Падение» (бесплатный)",   xp: "+100 XP" },
  { id: "school-city",    category: "school", title: "Курс «Город» (3 990 ₽)",         xp: "+300 XP" },
  { id: "school-track",   category: "school", title: "Курс «Трек» (9 990 ₽)",          xp: "+800 XP" },

  // Удержание
  { id: "daily-login",    category: "retention", title: "Daily login",        xp: "+5 XP / день" },
  { id: "streak-7",       category: "retention", title: "Серия 7 дней подряд", xp: "+50 XP" },
  { id: "streak-30",      category: "retention", title: "Серия 30 дней подряд", xp: "+300 XP" },

  // Рефералы
  { id: "ref-purchase",   category: "referral", title: "Друг купил билет/мерч по реф-ссылке", xp: "+200 XP" },
  { id: "ref-pass",       category: "referral", title: "Друг оформил Hell Pass любого тира",  xp: "+500 XP" },

  // Квесты
  { id: "quest-seasonal", category: "quests", title: "Сезонный квест (1–3 мес)", xp: "+200…500 XP", note: "Управляем темпом продвижения вручную" },
];

/** Шкала рангов — для UI «сколько до следующего» с человеческими подписями. */
export const RANK_TIMELINE: Array<{ rank: string; xp: number; pace: string }> = [
  { rank: "Rookie",       xp: 0,      pace: "старт после регистрации" },
  { rank: "Pit Crew",     xp: 500,    pace: "~первая неделя активности" },
  { rank: "Road Captain", xp: 2_000,  pace: "~1–1.5 месяца" },
  { rank: "Alpha Hound",  xp: 6_000,  pace: "~3–4 месяца" },
  { rank: "Hell Legend",  xp: 15_000, pace: "~10–14 месяцев, элита ядра" },
];
