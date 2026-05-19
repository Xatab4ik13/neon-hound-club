// Глобальный мок-профиль блогера. Используется в кабинете блогера, в плашке
// и в постах в ленте (slug "hell").

import { useSyncExternalStore } from "react";
import type { BloggerProfile } from "@/components/blogger/BloggerProfileModal";

let PROFILE: BloggerProfile = {
  nick: "HELL",
  initials: "H",
  email: "hell@hellhound.club",
  avatarUrl: undefined,
};

const listeners = new Set<() => void>();

export const bloggerProfileStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot() {
    return PROFILE;
  },
  update(p: BloggerProfile) {
    PROFILE = p;
    listeners.forEach((l) => l());
  },
};

export function useBloggerProfile() {
  return useSyncExternalStore(
    bloggerProfileStore.subscribe,
    bloggerProfileStore.getSnapshot,
    bloggerProfileStore.getSnapshot,
  );
}
