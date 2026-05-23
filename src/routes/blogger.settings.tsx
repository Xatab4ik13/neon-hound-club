// Настройки блогера. Аватар — реальный аплоад в S3 + PATCH /profile/me.
// Email/пароль пока заглушки: на бекенде эндпоинтов смены ещё нет.

import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, Trash2, LogOut, Loader2 } from "lucide-react";
import { HellhoundAvatar, HellhoundChip } from "@/components/club/HellhoundPlaque";
import { useBloggerProfile } from "@/data/blogger-profile";
import { useUpdateMyProfile, uploadFileToS3 } from "@/lib/garage-api";
import { useViewer } from "@/hooks/use-viewer";
import { IOSConfirm } from "@/components/ios/IOSConfirm";

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
  const { signOut } = useViewer();
  const updateProfile = useUpdateMyProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const flash = (m: string) => {
    setMsg(m);
    setErr(null);
    setTimeout(() => setMsg(null), 1800);
  };
  const flashErr = (m: string) => {
    setErr(m);
    setMsg(null);
    setTimeout(() => setErr(null), 2500);
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return flashErr("Это не картинка");
    if (file.size > 5 * 1024 * 1024) return flashErr("Файл больше 5 МБ");
    setUploading(true);
    try {
      const url = await uploadFileToS3(file, "avatar");
      await updateProfile.mutateAsync({ avatarUrl: url });
      flash("Аватар обновлён");
    } catch (e) {
      flashErr(e instanceof Error ? e.message : "Не получилось загрузить");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    try {
      await updateProfile.mutateAsync({ avatarUrl: null });
      flash("Аватар удалён");
    } catch (e) {
      flashErr(e instanceof Error ? e.message : "Не получилось удалить");
    }
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
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  {uploading ? "Загрузка…" : "Загрузить"}
                </button>
                {profile.avatarUrl && !uploading && (
                  <button
                    type="button"
                    onClick={removeAvatar}
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

        {/* Email — read-only пока нет эндпоинта смены */}
        <section className="border border-white/[0.08] bg-card/40 p-5">
          <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Email
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="mt-2 w-full border border-white/10 bg-black/40 px-3 py-2 text-sm text-muted-foreground outline-none"
          />
          <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Смена email пока недоступна
          </div>
        </section>

        {msg && (
          <div className="border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-primary">
            {msg}
          </div>
        )}
        {err && (
          <div className="border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-destructive">
            {err}
          </div>
        )}

        <button
          type="button"
          onClick={async () => {
            if (typeof window !== "undefined" && window.confirm("Выйти из кабинета?")) {
              await signOut();
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
