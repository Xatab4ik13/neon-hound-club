// Настройки блогера — переиспользуем модалку профиля как inline-страницу.
// Меняем email, аватар, пароль. Логика та же, что в BloggerProfileModal.

import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, Trash2, LogOut } from "lucide-react";
import { HellhoundAvatar, HellhoundChip } from "@/components/club/HellhoundPlaque";
import { bloggerProfileStore, useBloggerProfile } from "@/data/blogger-profile";

export const Route = createFileRoute("/blogger/settings")({
  head: () => ({
    meta: [
      { title: "Настройки — кабинет блогера" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BloggerSettingsPage,
});

function BloggerSettingsPage() {
  const profile = useBloggerProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState(profile.email);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [repeatPwd, setRepeatPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const onFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => bloggerProfileStore.update({ ...profile, avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const saveEmail = () => {
    if (!email.trim() || !email.includes("@")) {
      setMsg("Неверный email");
      return;
    }
    bloggerProfileStore.update({ ...profile, email: email.trim() });
    setMsg("Email сохранён");
    setTimeout(() => setMsg(null), 1800);
  };

  const savePwd = () => {
    if (!currentPwd || !newPwd) return setMsg("Заполни оба поля пароля");
    if (newPwd.length < 6) return setMsg("Минимум 6 символов");
    if (newPwd !== repeatPwd) return setMsg("Пароли не совпадают");
    setCurrentPwd("");
    setNewPwd("");
    setRepeatPwd("");
    setMsg("Пароль обновлён");
    setTimeout(() => setMsg(null), 1800);
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <div className="space-y-6">
        {/* Профиль */}
        <section className="border border-white/[0.08] bg-card/40 p-5">
          <div className="flex items-center gap-4">
            <HellhoundAvatar size={72} initials={profile.initials} avatarUrl={profile.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-xl font-black italic uppercase tracking-tight">
                {profile.nick}
              </div>
              <div className="mt-1.5">
                <HellhoundChip size="sm" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
                >
                  <Upload className="h-3 w-3" /> Загрузить
                </button>
                {profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => bloggerProfileStore.update({ ...profile, avatarUrl: undefined })}
                    className="inline-flex items-center gap-1.5 border border-white/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-3 w-3" /> Удалить
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Email */}
        <section className="border border-white/[0.08] bg-card/40 p-5">
          <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Email
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <button
              onClick={saveEmail}
              className="shrink-0 border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
            >
              Сохранить
            </button>
          </div>
        </section>

        {/* Пароль */}
        <section className="space-y-2 border border-white/[0.08] bg-card/40 p-5">
          <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Сменить пароль
          </label>
          <input
            type="password"
            placeholder="Текущий пароль"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            className="w-full border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
          <input
            type="password"
            placeholder="Новый пароль"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className="w-full border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
          <input
            type="password"
            placeholder="Повторите новый пароль"
            value={repeatPwd}
            onChange={(e) => setRepeatPwd(e.target.value)}
            className="w-full border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
          <button
            onClick={savePwd}
            className="w-full border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
          >
            Обновить пароль
          </button>
        </section>

        {msg && (
          <div className="border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-primary">
            {msg}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.confirm("Выйти из кабинета?")) {
              window.location.href = "/";
            }
          }}
          className="inline-flex w-full items-center justify-center gap-2 border border-white/10 bg-black/40 px-3 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Выйти
        </button>
      </div>
    </main>
  );
}
