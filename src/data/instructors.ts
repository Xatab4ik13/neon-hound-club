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
import nkGal01 from "@/assets/instructors/nikita-gallery/nikita-01.webp.asset.json";
import nkGal02 from "@/assets/instructors/nikita-gallery/nikita-02.webp.asset.json";
import nkGal03 from "@/assets/instructors/nikita-gallery/nikita-03.webp.asset.json";
import nkGal04 from "@/assets/instructors/nikita-gallery/nikita-04.webp.asset.json";
import pavelAsset from "@/assets/instructors/pavel.webp.asset.json";
import pvGal01 from "@/assets/instructors/pavel-gallery/pavel-01.webp.asset.json";
import pvGal02 from "@/assets/instructors/pavel-gallery/pavel-02.webp.asset.json";
import pvGal03 from "@/assets/instructors/pavel-gallery/pavel-03.webp.asset.json";
import pvGal04 from "@/assets/instructors/pavel-gallery/pavel-04.webp.asset.json";
import pvGal05 from "@/assets/instructors/pavel-gallery/pavel-05.webp.asset.json";
import pvGal06 from "@/assets/instructors/pavel-gallery/pavel-06.webp.asset.json";
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
    tagline: "Бронзовый призёр России, серебряный призёр Москвы. Стант на питбайках.",
    bio: [
      "Бронзовый призёр России и серебряный призёр Москвы по станту. Катаю 6 лет, тренирую стант на питбайках.",
      "Работаю только со стантом — трюки, wheelie, stoppie, контроль байка на грани. Учу тому, что сам делаю каждый день.",
      "Беру от 16 лет. Мотоцикл и экипировку могу дать свои — не обязательно приезжать со своим.",
    ],
    specialties: ["Стант", "Питбайки", "Wheelie"],
    skills: [
      { title: "Wheelie с места", text: "Подъём переднего колеса с места. Работа сцеплением, газом, балансом. По шагам, без страха." },
      { title: "Wheelie в движении", text: "Подъём с наката, удержание, езда на заднем колесе на длинные дистанции." },
      { title: "Баланс-поинт", text: "Точка равновесия на wheelie. Как ловить, как держать, как не переворачиваться назад." },
      { title: "Stoppie", text: "Езда на переднем колесе. Работа передним тормозом, распределение веса, контроль." },
      { title: "Circle wheelie", text: "Wheelie по кругу с рулением задним тормозом. Уровень выше базового." },
      { title: "Switch / стойки", text: "Смена посадки на ходу, стойки на баке и подножках. База для комбо-трюков." },
      { title: "Burnout", text: "Прожиг заднего колеса. Контроль сцепления, газа, дыма и своего байка в дыму." },
      { title: "Контроль питбайка", text: "Полное понимание, как ведёт себя лёгкий байк — база под все трюки." },
      { title: "Работа над ошибками", text: "Разбираем каждое падение и каждую неудачную попытку. Смотрим видео, чиним технику." },
      { title: "Психология трюка", text: "Как перестать бояться, как заходить в новый трюк, как не поймать глупую травму." },
    ],
    location: {
      address: "г. Москва, площадка в Крылатском",
      lat: 55.762,
      lng: 37.418,
      note: "Тренирую только на своей площадке в Крылатском. К ученику не выезжаю.",
    },
    schedule: DEFAULT_SCHEDULE,
    gallery: [nkGal01.url, nkGal02.url, nkGal03.url, nkGal04.url],
    courses: [
      {
        title: "Индивидуальное занятие",
        duration: "1 час · площадка в Крылатском",
        price: 6000,
        description:
          "Персональная тренировка по станту. Всё включено: мотоцикл, экипировка, площадка. Достаточно прийти самому.",
        includes: [
          "1 час чистой практики",
          "Питбайк для тренировки",
          "Экипировка при необходимости",
          "Разбор техники и работа над ошибками",
        ],
      },
      {
        title: "Пакет из 10 занятий",
        duration: "10 × 1 час · выгоднее на 12 000 ₽",
        price: 48000,
        description:
          "Абонемент на 10 занятий по станту. Оптимальный формат, чтобы реально прокачать трюки: от wheelie с места до баланс-поинта.",
        includes: [
          "10 индивидуальных занятий",
          "Питбайк и экипировка включены",
          "Своя площадка в Крылатском",
          "Программа под твой уровень",
        ],
      },
    ],
    approach: [
      "Работаю только со стантом. Не преподаю базу вождения, город или трек — только трюки.",
      "У ученика должен быть накат на мотоцикле: город, эндуро, мотокросс — не важно. Главное — понимание, как работает мотоцикл.",
      "Беру от 16 лет. Свой мотоцикл и экипировка — не обязательно, всё есть на площадке.",
      "Тренируем в хорошую погоду. Если дождь пошёл в процессе — докатываем, не убегаем.",
    ],
  },
  {
    id: "pavel",
    slug: "pavel",
    name: "Павел",
    photo: pavelAsset.url,
    city: "Москва",
    experience: 3,
    tone: "lime",
    tagline: "12 лет в седле, призёр мотоджимханы ЮФО",
    bio: [
      "Мне 20 лет, из них 12 я провёл на мотоцикле. Инструктором работаю 3 года.",
      "Участвовал в соревнованиях по мотоджимхане чемпионата ЮФО, призёр класса «Спортсмены».",
      "Работаю в основном с новичками — обучаю с полного нуля. Есть запрос на спортивную езду — только приветствуется.",
    ],
    specialties: ["С нуля", "Джимхана", "Спорт"],
    skills: [
      { title: "С полного нуля", text: "Обучаю даже тех, кто никогда не сидел на велосипеде. Посадка, сцепление, газ, тормоз — всё по шагам." },
      { title: "Азы стантрайдинга", text: "База трюковой езды: контроль газа и сцепления, работа с балансом, первые wheelie в безопасной среде." },
      { title: "Контраварийная подготовка", text: "Экстренное торможение, объезд препятствия, работа в скользких условиях. То, что реально спасает на дороге." },
      { title: "Спортивная мотоджимхана", text: "Работа с конусами, восьмёрки, змейки, развороты в габарит. Готовлю к спортивным стартам, если есть запрос." },
      { title: "Шоссейно-кольцевые гонки", text: "Подготовка к трек-дням и ШКМГ: траектории, наклоны, работа корпусом, тайминг тормоза и газа." },
      { title: "Стратегия в городе", text: "Как читать трафик, где занимать полосу, как не попадать в слепые зоны. Разбор реальных ситуаций." },
    ],
    location: MSK_LOCATION,
    schedule: DEFAULT_SCHEDULE,
    gallery: [pvGal01.url, pvGal02.url, pvGal03.url, pvGal04.url, pvGal05.url, pvGal06.url],
    courses: [
      {
        title: "Индивидуальное занятие",
        duration: "2 часа · площадка",
        price: 12000,
        priceFrom: true,
        description:
          "Персональная тренировка один на один. Программа собирается под твои задачи и уровень — от первого выезда до подготовки к спорту. Итоговая стоимость зависит от аренды мотоцикла, экипировки и дополнительного спортивного оборудования.",
        includes: [
          "2 часа чистой практики",
          "Индивидуальная программа под твой уровень",
          "Разбор техники и работа над ошибками",
          "Мотоцикл и экипировка в аренду — по договорённости",
        ],
      },
    ],
    approach: [
      "Работаю с любым уровнем: от полного нуля до спортивной подготовки. Программу подбираю индивидуально под задачи и запросы.",
      "Главное — регулярность. Приходишь, занимаешься системно — получаешь безопасное и уверенное счастье на мотоцикле.",
      "Погода не важна, тренируемся при любой. Мотоциклы и экипировка в аренду есть — приходить со своим не обязательно.",
      "Основная площадка — Москва, Крылатское. Готов выезжать в другой город или на конкретный трек по договорённости.",
    ],
  },
  {
    id: "haix",
    slug: "haix",
    name: "HaiX",
    photo: haixAsset.url,
    city: "Москва",
    experience: 1,
    tone: "violet",
    tagline: "Участник чемпионата России, Суперспорт",
    bio: [
      "Действующий участник чемпионата России в классе Суперспорт. Инструктором работаю год — без громких достижений, но со свежим взглядом и живой практикой на трассе.",
      "Работаю с питбайком, супермото, MiniGP и спортбайками любой кубатуры. Учу тому, что сам оттачиваю на треке каждую неделю.",
      "Не беру полных новичков. Чтобы занятие прошло с пользой, ты уже должен уверенно трогаться, переключаться и не глохнуть — хотя бы 2–3 месяца стажа за спиной или опыт другого мотоспорта.",
    ],
    specialties: ["Суперспорт", "Трек", "Кольцевая техника"],
    skills: [
      { title: "Наклоны по кольцевой", text: "Ставим корпус и байк в правильные углы. Постепенно, без страха и глупых падений." },
      { title: "Езда в колено", text: "Свес, работа корпусом, поиск точки контакта. Разложу по шагам — от площадки до трека." },
      { title: "Езда в локоть", text: "Следующий уровень свеса. Работаем, когда колено уже уверенное и хочется дальше." },
      { title: "Слайд в повороте", text: "Контролируемый снос заднего колеса. Как чувствовать, как ловить, как не улететь." },
      { title: "Быстрые повороты", text: "Скорость входа, апекс, выход на газу. Убираем страх и лишние торможения." },
      { title: "Гоночные траектории", text: "Разбор идеальных линий на конкретных поворотах. Где резать, где ждать, где открываться." },
      { title: "Выкатка на треке", text: "Выезжаем на картодром или трек. Отрабатываем всё, что учили, в реальных условиях." },
      { title: "Эффективное торможение", text: "Тормозим сильно, стабильно и в нужной точке. Разбор ошибок и работа с передним тормозом." },
      { title: "Торможение в наклоне", text: "Trail braking. Как довезти тормоз до апекса и не потерять переднее колесо." },
      { title: "Подготовка к гонкам", text: "Целевая подготовка к соревнованиям и трек-дням. План, техника, психология старта." },
      { title: "Разбор онбордов", text: "Смотрим видео с твоей камеры, разбираем каждую ошибку и точку роста. Предметно, без воды." },
    ],
    location: {
      address: "Москва и МО — картодромы, треки, специальные площадки",
      lat: 55.751244,
      lng: 37.618423,
      note: "Круглый сезон. Летом — открытые картодромы, треки и площадки. Зимой — крытые картодромы и тёплые крытые площадки. Место согласуем под задачу.",
    },
    schedule: DEFAULT_SCHEDULE,
    gallery: [hxGal01.url, hxGal02.url, hxGal03.url, hxGal04.url, hxGal05.url, hxGal06.url, hxGal07.url, hxGal08.url, hxGal09.url],
    courses: [
      {
        title: "Индивидуальное занятие",
        duration: "2 часа · трек или площадка",
        price: 18000,
        description:
          "Персональная тренировка один на один. Работаем над тем, что нужно именно тебе: техника, траектории, торможения, свес. С разбором онбордов после.",
        includes: [
          "2 часа чистой практики",
          "Персональная программа под твой уровень",
          "Разбор онбордов и обратная связь",
          "Работа на картодроме, треке или площадке",
        ],
      },
    ],
    approach: [
      "Нужен базовый уровень: уверенно трогаешься, переключаешь передачи, не глохнешь. Идеально — 2–3 месяца стажа или опыт другого мотоспорта.",
      "Полных новичков не беру: без базы 2 часа занятия уходят впустую, а это невыгодно ни тебе, ни мне.",
      "Тренируемся круглый сезон. Летом — открытые площадки и треки, зимой — крытые картодромы и тёплые площадки.",
      "Каждое занятие — с камерой. Разбираем онборды, находим конкретные ошибки, ставим план на следующий раз.",
    ],
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
