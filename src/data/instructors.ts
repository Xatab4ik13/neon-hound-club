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
import nikitaAsset from "@/assets/instructors/nikita.webp.asset.json";
import pavelAsset from "@/assets/instructors/pavel.webp.asset.json";
import haixAsset from "@/assets/instructors/haix.webp.asset.json";

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
  address: "г. Краснодар, площадка «Мото-Юг», ул. Ростовское шоссе, 12",
  lat: 45.077,
  lng: 38.986,
  note: "Асфальтированная закрытая площадка. Парковка есть, встречаемся у ворот.",
};

const MSK_LOCATION: Location = {
  address: "г. Москва, площадка «Крылатское», Крылатская ул., 2",
  lat: 55.762,
  lng: 37.418,
  note: "Закрытая площадка. Есть навес, парковка, туалет.",
};

export const INSTRUCTORS: Instructor[] = [
  {
    id: "stanislav",
    slug: "stanislav",
    name: "Станислав",
    photo: stanislavAsset.url,
    city: "Краснодар",
    experience: 10,
    tone: "primary",
    tagline: "10 лет за рулём, тысячи учеников на дороге",
    bio: [
      "Катаю с 2015 года, преподаю с 2016-го. За плечами — сотни часов на закрытой площадке и десятки тысяч километров в городе и по трассе.",
      "Работаю с нуля: страшно, никогда не сидел на мото — приходи. Работаю и с опытными: подтяну технику, разберу ошибки, покажу, как ездить безопаснее и быстрее.",
    ],
    specialties: ["С нуля", "Город", "Асфальт"],
    skills: DEFAULT_SKILLS,
    location: KRD_LOCATION,
    schedule: DEFAULT_SCHEDULE,
    gallery: [stGal01.url, stGal02.url, stGal03.url, stGal04.url, stGal05.url, stGal06.url, stGal07.url, stGal08.url],
  },
  {
    id: "semen",
    slug: "semen",
    name: "Семён",
    photo: semenAsset.url,
    city: "Краснодар",
    experience: 11,
    tone: "yellow",
    tagline: "11 лет в мото, инструктор-практик",
    bio: [
      "В седле с 2014 года. За это время — от учебной 250-ки до литра. Знаю, как ведёт себя байк в любой ситуации, и умею объяснять это простым языком.",
      "Занятия строю индивидуально: сначала смотрю, что умеешь, потом строим план. Никакой воды и заезженных методичек — только то, что реально пригодится на дороге.",
    ],
    specialties: ["Город", "Трасса", "Разбор техники"],
    skills: DEFAULT_SKILLS,
    location: KRD_LOCATION,
    schedule: DEFAULT_SCHEDULE,
    gallery: [],
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
