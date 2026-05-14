import founderHoodie from "@/assets/founder-hoodie.jpg";
import pitGloves from "@/assets/pit-gloves.jpg";
import garageKey from "@/assets/garage-key.jpg";

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
];

export const SOURCE_LABEL: Record<ProductSource, string> = {
  hellhound: "HELLHOUND",
  partner: "Партнёр",
  used: "Б/У",
};
