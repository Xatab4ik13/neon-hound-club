// Модалка профиля блогера. Простая: email, пароль, аватарка.
// Авторизация — мок, хранение — useState в родителе.

import { useRef, useState } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { HellhoundAvatar, HellhoundChip } from "@/components/club/HellhoundPlaque";

export type BloggerProfile = {
  nick: string;
  initials: string;
  email: string;
  avatarUrl?: string;
};

export function BloggerProfileModal({
  open,
  onClose,
  profile,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  profile: BloggerProfile;
  onChange: (p: BloggerProfile) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState(profile.email);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [repeatPwd, setRepeatPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  const onFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ ...profile, avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const saveEmail = () => {
    if (!email.trim() || !email.includes("@")) {
      setMsg("Неверный email");
      return;
    }
    onChange({ ...profile, email: email.trim() });
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg border border-white/10 bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="font-display text-lg font-black italic uppercase tracking-tight">Профиль</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          {/* Аватар + плашка */}
          <div className="flex items-center gap-4">
            <HellhoundAvatar size={72} initials={profile.initials} avatarUrl={profile.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-xl font-black italic uppercase tracking-tight">
                {profile.nick}
              </div>
              <div className="mt-1.5">
                <HellhoundChip size="sm" />
              </div>
              <div className="mt-2 flex gap-2">
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
                    onClick={() => onChange({ ...profile, avatarUrl: undefined })}
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

          {/* Email */}
          <div className="space-y-2">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
              <button
                onClick={saveEmail}
                className="border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
              >
                Сохранить
              </button>
            </div>
          </div>

          {/* Пароль */}
          <div className="space-y-2">
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
          </div>

          {msg && (
            <div className="border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-primary">
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
