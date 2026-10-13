import hhrLogo from "@/assets/hhr-logo.png.asset.json";
import { TG_BOT_URL } from "@/lib/maintenance";

export function MaintenanceScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6 text-center">
      <img src={hhrLogo.url} alt="HELLHOUND Racing" className="h-16 w-auto" draggable={false} />
      <h1 className="mt-8 font-display text-3xl font-black uppercase tracking-tight text-foreground">
        Сайт временно не работает
      </h1>
      <p className="mt-4 max-w-sm text-base text-muted-foreground">
        Мы восстанавливаем HHR. Ваши билеты, Hell Pass и прогресс никуда не пропадут — всё вернём на ваши аккаунты.
      </p>
      <p className="mt-3 max-w-sm text-base text-muted-foreground">
        Билеты на розыгрыш Yamaha MT-07 и предзаказ футболок — в нашем Telegram-боте.
      </p>
      <a
        href={TG_BOT_URL}
        className="mt-8 inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 font-display text-lg font-black text-primary-foreground"
      >
        Открыть @hhr_probot
      </a>
    </div>
  );
}
