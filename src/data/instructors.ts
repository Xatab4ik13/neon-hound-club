import stanislavAsset from "@/assets/instructors/stanislav.webp.asset.json";
import stGal01 from "@/assets/instructors/stanislav-gallery/stanislav-01.webp.asset.json";
import stGal02 from "@/assets/instructors/stanislav-gallery/stanislav-02.webp.asset.json";
import stGal03 from "@/assets/instructors/stanislav-gallery/stanislav-03.webp.asset.json";
import stGal04 from "@/assets/instructors/stanislav-gallery/stanislav-04.webp.asset.json";
import stGal05 from "@/assets/instructors/stanislav-gallery/stanislav-05.webp.asset.json";
import stGal06 from "@/assets/instructors/stanislav-gallery/stanislav-06.webp.asset.json";
import stGal07 from "@/assets/instructors/stanislav-gallery/stanislav-07.webp.asset.json";
import stGal08 from "@/assets/instructors/stanislav-gallery/stanislav-08.webp.asset.json";
import semenAsset from "@/assets/instructors/semen.webp.asset.json";
import smGal01 from "@/assets/instructors/semen-gallery/semen-01.webp.asset.json";
import smGal02 from "@/assets/instructors/semen-gallery/semen-02.webp.asset.json";
import smGal03 from "@/assets/instructors/semen-gallery/semen-03.webp.asset.json";
import smGal04 from "@/assets/instructors/semen-gallery/semen-04.webp.asset.json";
import smGal05 from "@/assets/instructors/semen-gallery/semen-05.webp.asset.json";
import nikitaAsset from "@/assets/instructors/nikita.webp.asset.json";
import pavelAsset from "@/assets/instructors/pavel.webp.asset.json";
import haixAsset from "@/assets/instructors/haix.webp.asset.json";
import hxGal01 from "@/assets/instructors/haix-gallery/haix-01.webp.asset.json";
import hxGal02 from "@/assets/instructors/haix-gallery/haix-02.webp.asset.json";
import hxGal03 from "@/assets/instructors/haix-gallery/haix-03.webp.asset.json";
import hxGal04 from "@/assets/instructors/haix-gallery/haix-04.webp.asset.json";
import hxGal05 from "@/assets/instructors/haix-gallery/haix-05.webp.asset.json";
import hxGal06 from "@/assets/instructors/haix-gallery/haix-06.webp.asset.json";
import hxGal07 from "@/assets/instructors/haix-gallery/haix-07.webp.asset.json";
import hxGal08 from "@/assets/instructors/haix-gallery/haix-08.webp.asset.json";
import hxGal09 from "@/assets/instructors/haix-gallery/haix-09.webp.asset.json";

export type InstructorTone = "primary" | "yellow" | "cyan" | "lime" | "violet";

export type Skill = { title: string; text: string };
export type Location = {
  address: string;
  lat: number;
  lng: number;
  note?: string;
};
export type SlotStatus = "free" | "booked";
export type Slot = { time: string; status: SlotStatus };
export type ScheduleDay = { weekday: string; date: string; slots: Slot[] };

export type Course = {
  title: string;
  duration: string;
  price: number;
  priceFrom?: boolean;
  description: string;
  includes?: string[];
};

export type UpcomingCourse = { title: string };

export type Instructor = {
  id: string;
  slug: string;
  name: string;
  photo: string;
  city: string;
  experience: number;
  tone: InstructorTone;
  tagline: string;
  bio: string[];
  specialties: string[];
  skills: Skill[];
  location: Location;
  schedule: ScheduleDay[];
  gallery: string[];
  courses?: Course[];
  upcomingCourses?: UpcomingCourse[];
  approach?: string[];
};

const DEFAULT_SKILLS: Skill[] = [
  { title: "База управления", text: "Посадка, работа сцеплением, газом и тормозом. Уверенность в седле с первого занятия." },
  { title: "Медленная скорость", text: "Восьмёрки, змейка, разворот в габарит. Контроль байка там, где падают чаще всего." },
  { title: "Экстренное торможение", text: "Учимся тормозить в пол без юза. Разбираем ABS, распределение веса, ошибки." },
  { title: "Траектории в поворотах", text: "Вход, апекс, выход. Работа корпусом и взглядом. От города до серпантина." },
  { title: "Разбор ошибок", text: "Каждое занятие снимаем на камеру, разбираем твою технику предметно, без воды." },
  { title: "Психология и страх", text: "Как не залипать, как читать трафик, как ездить дольше и безопаснее." },
];

const DEFAULT_SCHEDULE: ScheduleDay[] = [
  {
    weekday: "Пн",
    date: "10 авг",
    slots: [
      { time: "10:00", status: "free" },
      { time: "13:00", status: "booked" },
      { time: "16:00", status: "free" },
    ],
  },
  {
    weekday: "Вт",
    date: "11 авг",
    slots: [
      { time: "10:00", status: "booked" },
      { time: "13:00", status: "booked" },
      { time: "18:00", status: "free" },
    ],
  },
  {
    weekday: "Ср",
    date: "12 авг",
    slots: [
      { time: "11:00", status: "free" },
      { time: "15:00", status: "free" },
      { time: "18:00", status: "free" },
    ],
  },
  {
    weekday: "Чт",
    date: "13 авг",
    slots: [
      { time: "10:00", status: "booked" },
      { time: "14:00", status: "free" },
    ],
  },
  {
    weekday: "Пт",
    date: "14 авг",
    slots: [
      { time: "12:00", status: "free" },
      { time: "16:00", status: "free" },
      { time: "19:00", status: "booked" },
    ],
  },
  {
    weekday: "Сб",
    date: "15 авг",
    slots: [
      { time: "09:00", status: "free" },
      { time: "12:00", status: "booked" },
      { time: "15:00", status: "booked" },
    ],
  },
  {
    weekday: "Вс",
    date: "16 авг",
    slots: [
      { time: "10:00", status: "free" },
      { time: "13:00", status: "free" },
    ],
  },
];

const KRD_LOCATION: Location = {
  address: "г. Краснодар, «Усадьба Фамилия»",
  lat: 45.29168,
  lng: 39.316308,
  note: "Возможно выездное обучение в другом городе или стране — по договорённости.",
};

const MSK_LOCATION: Location = {
  address: "г. Москва, площадка «Крылатское», Крылатская ул., 2",
  lat: 55.762,
  lng: 37.418,
  note: "Закрытая площадка. Есть навес, парковка, туалет.",
};

const STANISLAV_SKILLS: Skill[] = [
  {
    title: "С нуля",
    text: "Посадка, работа сцеплением, газом и тормозом. Уверенность в седле с первого занятия.",
  },
  {
    title: "Разгон и торможение",
    text: "Учим тормозить в пол без юза и разгоняться уверенно. Разбираем ABS и распределение веса.",
  },
  {
    title: "Контроль траекторий",
    text: "Вход, апекс, выход. Работа корпусом и взглядом. От города до серпантина.",
  },
  {
    title: "Езда в коленочку",
    text: "Максимальный угол наклона, работа корпусом, свес. Безопасно и по шагам.",
  },
  {
    title: "Дорожная стратегия",
    text: "Как читать трафик, ездить дольше и безопаснее. Разбор реальных ситуаций.",
  },
  {
    title: "Подбор мотоцикла",
    text: "Тонкости выбора байка под себя, под задачи и под уровень. Без маркетинга.",
  },
  {
    title: "Настройка и подвеска",
    text: "Настройка мотоцикла и подвески под твой вес, стиль и покрытие. Углублённо.",
  },
  {
    title: "Обслуживание и шины",
    text: "Базовая диагностика перед поездкой, подбор резины, экипировки. Что смотреть, что не трогать.",
  },
  {
    title: "Мотоджимхана и спорт",
    text: "Спортивная дисциплина мотоджимхана. Подготовка спортсмена и мотоцикла к соревнованиям.",
  },
];

const STANISLAV_COURSES: Course[] = [
  {
    title: "Мото тренировочный лагерь",
    duration: "4 дня · 14 часов практики + лекции",
    price: 114000,
    priceFrom: true,
    description:
      "Всё включено: проживание и питание на крутейшей базе Краснодара «Усадьба Фамилия». Полное погружение в мотоатмосферу.",
    includes: [
      "14 часов практики на площадке",
      "Теория, дорожная стратегия, разбор ошибок",
      "Проживание и питание",
      "Атмосфера, знакомства, единомышленники",
    ],
  },
  {
    title: "VIP-группа до 5 человек",
    duration: "4 дня · площадка + реальные условия",
    price: 144000,
    description:
      "2 дня подготовки на площадке и 2 дня отработки в реальных условиях на южных серпантинах. Максимум внимания и обратной связи.",
    includes: [
      "Группа до 5 человек",
      "2 дня на закрытой площадке",
      "2 дня южных серпантинов",
      "Индивидуальный разбор техники",
    ],
  },
];

const STANISLAV_UPCOMING: UpcomingCourse[] = [
  { title: "«Первый мотоцикл» — обучение с нуля" },
  { title: "Контраварийная подготовка" },
  { title: "Спортивная / городская группа" },
  { title: "Спортивная мотоджимхана" },
];

const STANISLAV_APPROACH: string[] = [
  "Работа на результат. Научный подход для максимального эффекта.",
  "2 раза в день по 2 часа интенсивных тренировок. В перерывах — теория, дорожная стратегия, разбор ошибок.",
  "Наша задача — выдернуть тебя из повседневки, чтобы ты забыл про серость будней и заботы. Полная концентрация на новых знаниях и их отработке.",
  "Приятная и дружественная атмосфера, новые знакомства и общение с единомышленниками. Бесценный опыт и незабываемые впечатления.",
];

export const INSTRUCTORS: Instructor[] = [
  {
    id: "stanislav",
    slug: "stanislav",
    name: "Станислав",
    photo: stanislavAsset.url,
    city: "Краснодар",
    experience: 10,
    tone: "primary",
    tagline: "Спортсмен мирового класса, мотоджимхана",
    bio: [
      "Меня зовут Миллер Станислав. Спортсмен мирового класса по мотоджимхане, многократный призёр и победитель соревнований. На моём счету рекорды России и мира. В спорте — более 10 лет.",
      "Создатель одних из самых красивых, лёгких и функциональных корчей. Углублённые знания геометрии мотоцикла и работы с подвеской. Главная особенность — пытливый ум, который не остановится ни перед чем в достижении цели.",
      "Готов делиться знаниями. Помогу создать симбиоз с твоим мотоциклом и стать с ним единым целым.",
    ],
    specialties: ["Мотоджимхана", "Спорт", "Настройка"],
    skills: STANISLAV_SKILLS,
    location: KRD_LOCATION,
    schedule: DEFAULT_SCHEDULE,
    gallery: [stGal01.url, stGal02.url, stGal03.url, stGal04.url, stGal05.url, stGal06.url, stGal07.url, stGal08.url],
    courses: STANISLAV_COURSES,
    upcomingCourses: STANISLAV_UPCOMING,
    approach: STANISLAV_APPROACH,
  },
  {
    id: "semen",
    slug: "semen",
    name: "Семён",
    photo: semenAsset.url,
    city: "Краснодар",
    experience: 11,
    tone: "yellow",
    tagline: "Спортсмен мирового класса, мотоджимхана",
    bio: [
      "Меня зовут Никитин Семён. Действующий спортсмен мирового класса по мотоджимхане, многократный призёр и победитель соревнований, обладатель рекордов России и мира. В спорте — более 11 лет.",
      "Профессиональный мотоинструктор: обучаю не только с нуля, но и тренирую спортсменов. Спорт даёт углублённые знания управления мотоциклом — моя цель донести их простым языком, чтобы гражданский мотоциклист понял и начал применять.",
      "Главная особенность — внимательный, чуткий подход. Особое внимание уделяю ощущениям на мотоцикле и психологии мотоцикла. Научу ехать уверенно и получать удовольствие от себя на мотоцикле в каждом повороте.",
    ],
    specialties: ["Мотоджимхана", "Спорт", "Психология мотоцикла"],
    skills: STANISLAV_SKILLS,
    location: KRD_LOCATION,
    schedule: DEFAULT_SCHEDULE,
    gallery: [smGal01.url, smGal02.url, smGal03.url, smGal04.url, smGal05.url],
    courses: STANISLAV_COURSES,
    upcomingCourses: STANISLAV_UPCOMING,
    approach: STANISLAV_APPROACH,
  },
  {
    id: "nikita",
    slug: "nikita",
    name: "Никита",
    photo: nikitaAsset.url,
    city: "Москва",
    experience: 6,
    tone: "cyan",
    tagline: "6 лет катаю, знаю Москву как свои пять пальцев",
    bio: [
      "Начинал сам с нуля, поэтому отлично понимаю, что чувствует новичок. Помогу перестать бояться и почувствовать байк.",
      "Отдельно люблю городские занятия — учу, как читать трафик, ездить в потоке, выбирать полосу и не попадать в неприятности.",
    ],
    specialties: ["С нуля", "Город", "Трафик"],
    skills: DEFAULT_SKILLS,
    location: MSK_LOCATION,
    schedule: DEFAULT_SCHEDULE,
    gallery: [],
  },
  {
    id: "pavel",
    slug: "pavel",
    name: "Павел",
    photo: pavelAsset.url,
    city: "Москва",
    experience: 3,
    tone: "lime",
    tagline: "3 года активной практики, свежий взгляд",
    bio: [
      "Молодой инструктор, но с большим налётом. Каждый день в седле, знаю все актуальные приколы дорог и байков.",
      "Занятия — драйвовые, без занудства. Разложу технику по полочкам, объясню на пальцах, покажу, повторим.",
    ],
    specialties: ["С нуля", "Площадка", "Драйв"],
    skills: DEFAULT_SKILLS,
    location: MSK_LOCATION,
    schedule: DEFAULT_SCHEDULE,
    gallery: [],
  },
  {
    id: "haix",
    slug: "haix",
    name: "HaiX",
    photo: haixAsset.url,
    city: "Москва",
    experience: 6,
    tone: "violet",
    tagline: "6 лет в мото, спорт и трек",
    bio: [
      "Люблю скорость и точную технику. Тренируюсь на треке, знаю, как выжимать из байка и себя максимум — безопасно.",
      "Помогу подтянуть работу корпусом, траектории, торможения и вход в поворот. Идеально, если хочешь на трекдей или просто ездить чище.",
    ],
    specialties: ["Спорт", "Трек", "Техника"],
    skills: DEFAULT_SKILLS,
    location: MSK_LOCATION,
    schedule: DEFAULT_SCHEDULE,
    gallery: [],
  },
];

export const TONE_BG: Record<InstructorTone, string> = {
  primary: "bg-primary",
  yellow: "bg-[#FFD93D]",
  cyan: "bg-[#3DDBD9]",
  lime: "bg-[#B6FF3C]",
  violet: "bg-[#C6A8FF]",
};

export const TONE_TEXT: Record<InstructorTone, string> = {
  primary: "text-primary-foreground",
  yellow: "text-black",
  cyan: "text-black",
  lime: "text-black",
  violet: "text-black",
};

export function getInstructorBySlug(slug: string): Instructor | undefined {
  return INSTRUCTORS.find((it) => it.slug === slug);
}
