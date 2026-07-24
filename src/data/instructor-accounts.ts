// Мок-список аккаунтов инструкторов для админ-панели «Школа».
// Реальные данные придут в Phase 3, когда админка переедет на API.

export type InstructorAccount = {
  slug: string;
  name: string;
  city: string;
  photo: string;
};

export const INSTRUCTOR_ACCOUNTS: InstructorAccount[] = [
  {
    slug: "maison",
    name: "Мэйсон",
    city: "Москва",
    photo:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces",
  },
  {
    slug: "gonza",
    name: "Гонза",
    city: "Санкт-Петербург",
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
  },
  {
    slug: "vovan",
    name: "Вован",
    city: "Казань",
    photo:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces",
  },
];
