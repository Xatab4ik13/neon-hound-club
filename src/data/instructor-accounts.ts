// Аккаунты инструкторов (мок). 5 персональных: Станислав, Семён, Никита, Паша, Хайкс.
// Пока роль `instructor` не заведена в бэке — переключаемся через
// localStorage-моковый флаг (см. `use-instructor-mock-role`).

import { INSTRUCTORS } from "./instructors";

export type InstructorAccount = {
  slug: string;
  name: string;
  photo: string;
  city: string;
};

export const INSTRUCTOR_ACCOUNTS: InstructorAccount[] = INSTRUCTORS.map((i) => ({
  slug: i.slug,
  name: i.name,
  photo: i.photo,
  city: i.city,
}));

export function getInstructorAccount(slug: string): InstructorAccount | undefined {
  return INSTRUCTOR_ACCOUNTS.find((a) => a.slug === slug);
}

export type MockStudent = { userId: string; nick: string };

// Мок-подписчики, которые пишут инструкторам.
export const MOCK_STUDENTS: MockStudent[] = [
  { userId: "u_max", nick: "MAX_RIDER" },
  { userId: "u_arty", nick: "ARTY_MOTO" },
  { userId: "u_dima", nick: "DIMA_KRD" },
  { userId: "u_lena", nick: "LENA_STREETS" },
  { userId: "u_slon", nick: "SLON_666" },
];

export function getMockStudent(userId: string): MockStudent | undefined {
  return MOCK_STUDENTS.find((s) => s.userId === userId);
}
