// Проверка «текущий пользователь — инструктор Школы?» через реальный API.
// Возвращает { isInstructor, slug, hydrated } — slug нужен для ссылок и
// приветствий. 404 от `/instructor/me` = не инструктор (не ошибка).

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { fetchInstructorMe, schoolQk } from "@/lib/api-school";
import { useViewer } from "@/hooks/use-viewer";

export function useIsInstructor() {
  const viewer = useViewer();
  const q = useQuery({
    queryKey: schoolQk.instructorMe,
    queryFn: fetchInstructorMe,
    enabled: !!viewer.user,
    retry: (count, err) => {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return false;
      return count < 2;
    },
    staleTime: 5 * 60_000,
  });

  const notInstructor =
    q.isError && q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 403);

  return {
    isInstructor: !!q.data?.instructor && !notInstructor,
    slug: q.data?.instructor.slug ?? null,
    displayName: q.data?.instructor.displayName ?? null,
    hydrated: viewer.hydrated && (q.isSuccess || notInstructor || !viewer.user),
  };
}
