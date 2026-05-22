import founderHoodie from "@/assets/founder-hoodie.jpg";
import pitGloves from "@/assets/pit-gloves.jpg";
import garageKey from "@/assets/garage-key.jpg";
import postcardHell from "@/assets/postcard-hell.jpg";

export type ProductSource = "hellhound" | "partner" | "used";


export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  gallery?: string[];
  badge?: { label: string; tone: "primary" | "muted" | "danger" };
  category: string;
  sub?: string;
  source: ProductSource;
  sourceLabel?: string; // партнёр / продавец
  sizes?: string[];
  description?: string;
  composition?: string;
  care?: string;
  shipping?: string;
  returns?: string;
  /** Цифровые товары: сколько билетов на участие в розыгрышах начисляется после покупки. */
  ticketsBonus?: number;
};


export const PRODUCTS: Product[] = [
  {
    id: "1",
    slug: "hoodie-founder-v1",
    name: "Худи Founder v1",
    price: 12990,
    image: founderHoodie,
    gallery: [founderHoodie, pitGloves, garageKey, founderHoodie],
    badge: { label: "Распродано", tone: "muted" },
    category: "apparel",
    sub: "hoodies",
    source: "hellhound",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description:
      "Тяжёлое худи из плотного петлевого футера 380 г/м². Свободный крой, опущенное плечо, двойной капюшон с круглым шнуром. Шеврон HELLHOUND вышит, не отвалится после двух стирок.",
    composition: "80% хлопок, 20% полиэстер. Манжеты — рибана 95/5.",
    care: "Стирка 30°, без отбеливания. Сушить в расправленном виде. Гладить с изнанки.",
  },
  {
    id: "2",
    slug: "pit-crew-gloves",
    name: "Перчатки Пит-крю",
    price: 8490,
    image: pitGloves,
    gallery: [pitGloves, founderHoodie, garageKey],
    badge: { label: "Осталось 24", tone: "primary" },
    category: "gear",
    sub: "gloves",
    source: "partner",
    sourceLabel: "Komine",
    sizes: ["M", "L", "XL"],
    description:
      "Городские мото-перчатки с защитой костяшек и сенсорными подушечками на указательном и большом пальцах. Для ежедневной езды по городу и треку без агрессивных пейсов.",
    composition: "Козья кожа, вставки из эластичного текстиля, протектор TPU.",
    care: "Протирать влажной тканью. Не стирать в машине. Хранить в сухом месте.",
  },
  {
    id: "3",
    slug: "garage-key",
    name: "Ключ от гаража",
    price: 2490,
    image: garageKey,
    gallery: [garageKey, founderHoodie],
    category: "garage",
    sub: "keychains",
    source: "hellhound",
    description:
      "Брелок-ключ из латуни с гравировкой HELLHOUND. Утяжелённый, приятный в руке. На карабине — кольцо для ключей и кольцо для тэга.",
    composition: "Латунь, нержавеющая сталь.",
    care: "Со временем темнеет — это нормально. Полировать пастой ГОИ.",
  },
  {
    id: "4",
    slug: "hoodie-track-v2",
    name: "Худи Track v2",
    price: 13990,
    image: founderHoodie,
    gallery: [founderHoodie, pitGloves, garageKey],
    badge: { label: "Новинка", tone: "primary" },
    category: "apparel",
    sub: "hoodies",
    source: "hellhound",
    sizes: ["S", "M", "L", "XL"],
    description: "Вторая итерация трекового худи. Капюшон без шнура, карман-кенгуру, светоотражающий принт на спине.",
    composition: "85% хлопок, 15% полиэстер, 360 г/м².",
    care: "Стирка 30°, не выкручивать.",
  },
  {
    id: "5",
    slug: "tee-pack-01",
    name: "Футболка Pack 01",
    price: 3990,
    image: founderHoodie,
    category: "apparel",
    sub: "tees",
    source: "hellhound",
    sizes: ["S", "M", "L", "XL"],
    description: "Базовая чёрная футболка с минимальным шевроном на груди. Плотная, не просвечивает.",
    composition: "100% хлопок, 220 г/м².",
    care: "Стирка 30° с изнанки.",
  },
  {
    id: "6",
    slug: "race-day-gloves",
    name: "Перчатки Race Day",
    price: 9990,
    image: pitGloves,
    category: "gear",
    sub: "gloves",
    source: "partner",
    sourceLabel: "Five",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "7",
    slug: "cap-box-logo",
    name: "Кепка Box Logo",
    price: 2990,
    image: garageKey,
    badge: { label: "Hot", tone: "danger" },
    category: "accessories",
    sub: "caps",
    source: "hellhound",
    sizes: ["One size"],
  },
  {
    id: "8",
    slug: "sticker-pack-1",
    name: "Стикерпак №1",
    price: 590,
    image: garageKey,
    category: "garage",
    sub: "stickers",
    source: "hellhound",
  },
  {
    id: "9",
    slug: "longsleeve-crew",
    name: "Лонгслив Crew",
    price: 5490,
    image: founderHoodie,
    category: "apparel",
    sub: "longsleeves",
    source: "hellhound",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "10",
    slug: "elbow-pads-pro",
    name: "Налокотники Pro",
    price: 4490,
    image: pitGloves,
    category: "gear",
    sub: "elbows",
    source: "partner",
    sourceLabel: "Knox",
    sizes: ["M", "L"],
  },
  {
    id: "11",
    slug: "shoulder-bag",
    name: "Сумка через плечо",
    price: 6490,
    image: garageKey,
    badge: { label: "Б/У", tone: "muted" },
    category: "accessories",
    sub: "bags",
    source: "used",
    sourceLabel: "Андрей К.",
  },
  {
    id: "12",
    slug: "poster-yamaha-r6",
    name: "Постер Yamaha R6",
    price: 1490,
    image: garageKey,
    category: "garage",
    sub: "posters",
    source: "hellhound",
  },

  // ───────── Цифровые открытки с подписью Hell ─────────
  // После оплаты приходят на email + начисляются билеты для участия в розыгрышах клуба.
  {
    id: "d1",
    slug: "postcard-hell-1",
    name: "Открытка Hell · одиночная",
    price: 300,
    image: postcardHell,
    category: "digital",
    sub: "postcards",
    source: "hellhound",
    ticketsBonus: 1,
    description:
      "Цифровая открытка с автографом Hell. Приходит на email после оплаты. В подарок — 1 билет на участие в розыгрышах клуба.",
  },
  {
    id: "d2",
    slug: "postcard-hell-3",
    name: "Открытка Hell · набор 3",
    price: 500,
    image: postcardHell,
    badge: { label: "−45%", tone: "primary" },
    category: "digital",
    sub: "postcards",
    source: "hellhound",
    ticketsBonus: 3,
    description:
      "Набор из 3 цифровых открыток с автографом Hell. Приходит на email после оплаты. В подарок — 3 билета на участие в розыгрышах клуба.",
  },
  {
    id: "d3",
    slug: "postcard-hell-5",
    name: "Открытка Hell · набор 5",
    price: 700,
    image: postcardHell,
    badge: { label: "−54%", tone: "primary" },
    category: "digital",
    sub: "postcards",
    source: "hellhound",
    ticketsBonus: 5,
    description:
      "Набор из 5 цифровых открыток с автографом Hell. Приходит на email после оплаты. В подарок — 5 билетов на участие в розыгрышах клуба.",
  },
  {
    id: "d4",
    slug: "postcard-hell-10",
    name: "Открытка Hell · набор 10",
    price: 1000,
    image: postcardHell,
    badge: { label: "Hot · −67%", tone: "danger" },
    category: "digital",
    sub: "postcards",
    source: "hellhound",
    ticketsBonus: 10,
    description:
      "Набор из 10 цифровых открыток с автографом Hell. Приходит на email после оплаты. В подарок — 10 билетов на участие в розыгрышах клуба.",
  },
  {
    id: "d5",
    slug: "postcard-hell-20",
    name: "Открытка Hell · набор 20",
    price: 1500,
    image: postcardHell,
    badge: { label: "−75%", tone: "primary" },
    category: "digital",
    sub: "postcards",
    source: "hellhound",
    ticketsBonus: 20,
    description:
      "Набор из 20 цифровых открыток с автографом Hell. Приходит на email после оплаты. В подарок — 20 билетов на участие в розыгрышах клуба.",
  },
  {
    id: "d6",
    slug: "postcard-hell-50",
    name: "Открытка Hell · набор 50",
    price: 3000,
    image: postcardHell,
    badge: { label: "−80%", tone: "primary" },
    category: "digital",
    sub: "postcards",
    source: "hellhound",
    ticketsBonus: 50,
    description:
      "Набор из 50 цифровых открыток с автографом Hell. Приходит на email после оплаты. В подарок — 50 билетов на участие в розыгрышах клуба.",
  },
];


export const SOURCE_LABEL: Record<ProductSource, string> = {
  hellhound: "HELLHOUND",
  partner: "Партнёр",
  used: "Б/У",
};
