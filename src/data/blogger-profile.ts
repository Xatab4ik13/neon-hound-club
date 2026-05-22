// Профиль блогера — обёртка над реальным /profile/me.
// Раньше тут был in-memory мок; теперь читаем настоящие данные текущего юзера
// (нужно, чтобы аватар, ник и email в плашке/композере брались из БД,
// а апдейты сохранялись на бекенде).

import { useViewer } from "@/hooks/use-viewer";
import { useMyProfile } from "@/lib/garage-api";
import type { BloggerProfile } from "@/components/blogger/BloggerProfileModal";

function initialsFrom(nick: string | null | undefined): string {
  if (!nick) return "H";
  const clean = nick.trim();
  if (!clean) return "H";
  return clean[0]?.toUpperCase() ?? "H";
}

export function useBloggerProfile(): BloggerProfile {
  const viewer = useViewer();
  const profileQ = useMyProfile(viewer.isAuthed);

  const nick = profileQ.data?.nick ?? viewer.user?.nick ?? "HELL";
  const email = profileQ.data?.email ?? viewer.user?.email ?? "";
  const avatarUrl = profileQ.data?.avatarUrl ?? undefined;

  return {
    nick,
    initials: initialsFrom(nick),
    email,
    avatarUrl,
  };
}
