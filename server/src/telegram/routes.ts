import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { tgOrders } from "../db/schema/tg.js";
import { cdek } from "../lib/cdek.js";
import { isRaifConfigured, RaifApiError } from "../lib/raif.js";
import { requireAdmin, setSessionCookie, type SessionPayload } from "../lib/auth.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { findOwnersByPhone, normalizePhone as digitsPhone } from "./credit.js";
import { bindChat, clearChat, codeForChat, createLoginCode, isValidCode, resolveCode, takeCode } from "./login.js";
import { normalizePhone, priceShirts, priceTickets, shirtPackage, type ShirtLine } from "./pricing.js";
import { openAppButton, sendMessage, verifyInitData, webhookSecret } from "./bot.js";
import { createTgPayment } from "./payments.js";

const shirtSchema = z.object({ id: z.enum(["a", "b"]), size: z.string().max(4), qty: z.number().int().min(1).max(20) });

async function shippingFor(cityCode: number, qty: number) {
  const r = await cdek.calculate({ toCityCode: cityCode, mode: "pvz", packages: [shirtPackage(qty)] });
  return { price: r.totalSum, min: r.periodMin, max: r.periodMax };
}

/** Публичные маршруты страницы tg.hhr.pro — /api/v1/tg */
export async function tgRoutes(app: FastifyInstance) {
  app.post("/shipping", async (req, reply) => {
    const p = z.object({ cityCode: z.number().int().positive(), qty: z.number().int().min(1).max(40) }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "bad_input" });
    try {
      return await shippingFor(p.data.cityCode, p.data.qty);
    } catch (e) {
      req.log.error({ err: e }, "tg shipping calc failed");
      return reply.code(502).send({ error: "cdek_unavailable", message: "Не удалось посчитать доставку" });
    }
  });

  app.post("/orders", async (req, reply) => {
    const p = z.object({
      initData: z.string().max(4096).default(""),
      phone: z.string().max(32),
      tickets: z.union([z.object({ pack: z.number().int().min(0).max(10) }), z.object({ custom: z.number().int() })]).nullable(),
      shirts: z.array(shirtSchema).max(10).default([]),
      recipientName: z.string().max(128).optional(),
      pvz: z.object({ cityCode: z.number().int().positive(), cityName: z.string().max(128), code: z.string().max(32), address: z.string().max(300) }).optional(),
      address: z.string().trim().min(8).max(300).optional(),
    }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "bad_input", message: "Проверьте данные заказа" });
    const b = p.data;

    const phone = normalizePhone(b.phone);
    if (!phone) return reply.code(400).send({ error: "bad_phone", message: "Укажите номер телефона" });

    const tg = verifyInitData(b.initData);
    const t = b.tickets ? priceTickets(b.tickets) : { tickets: 0, price: 0 };
    if (!t) return reply.code(400).send({ error: "bad_tickets", message: "Неверное количество билетов" });
    const sh = priceShirts(b.shirts as ShirtLine[]);
    if (!sh) return reply.code(400).send({ error: "bad_shirts", message: "Проверьте футболки и размеры" });
    if (t.tickets === 0 && sh.qty === 0) return reply.code(400).send({ error: "empty", message: "Корзина пуста" });

    const shipping = 0;
    if (sh.qty > 0) {
      // Предзаказ: доставку пока не считаем, берём только адрес
      if (!b.address || !b.recipientName || b.recipientName.trim().split(/\s+/).length < 2) {
        return reply.code(400).send({ error: "need_delivery", message: "Укажите получателя и адрес доставки" });
      }
    }
    if (!isRaifConfigured("any")) return reply.code(503).send({ error: "payments_not_configured", message: "Оплата временно недоступна" });

    const [order] = await db.insert(tgOrders).values({
      telegramUserId: tg?.id ?? null,
      telegramUsername: tg?.username ?? null,
      telegramName: tg ? [tg.first_name, tg.last_name].filter(Boolean).join(" ") || null : null,
      phone,
      recipientName: sh.qty ? b.recipientName!.trim() : null,
      tickets: t.tickets,
      ticketsRub: t.price,
      shirts: sh.lines,
      shirtsRub: sh.total,
      shippingRub: shipping,
      cdekCityCode: null,
      cdekCityName: null,
      cdekPvzCode: null,
      cdekPvzAddress: sh.qty ? b.address! : null,
      totalRub: t.price + sh.total + shipping,
    }).returning();

    try {
      const paymentUrl = await createTgPayment(order!);
      return { orderId: order!.id, paymentUrl, totalRub: order!.totalRub };
    } catch (e) {
      req.log.error({ err: e, orderId: order!.id }, "tg payment init failed");
      await db.update(tgOrders).set({ status: "failed", updatedAt: new Date() }).where(eq(tgOrders.id, order!.id));
      return reply.code(502).send({ error: "payment_init_failed", message: e instanceof RaifApiError ? `Банк: ${e.message}` : "Не удалось создать оплату" });
    }
  });

  app.get("/orders/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return reply.code(400).send({ error: "bad_id" });
    const [o] = await db.select({ status: tgOrders.status, tickets: tgOrders.tickets, totalRub: tgOrders.totalRub }).from(tgOrders).where(eq(tgOrders.id, id)).limit(1);
    if (!o) return reply.code(404).send({ error: "not_found" });
    return o;
  });

  // ===== Вход на сайт через бота =====
  app.post("/login/start", async () => {
    const code = createLoginCode();
    const bot = (process.env.TG_BOT_USERNAME || "hhr_probot").replace(/^@/, "");
    return { code, botUrl: `https://t.me/${bot}?start=login_${code}` };
  });

  app.post("/login/poll", async (req, reply) => {
    const code = String((req.body as { code?: string })?.code ?? "");
    const e = takeCode(code);
    if (!e) return reply.code(410).send({ error: "expired", message: "Ссылка устарела — начни вход заново" });
    if (e.status !== "ok" || !e.userId) return { status: e.status };
    const [u] = await db.select().from(users).where(eq(users.id, e.userId)).limit(1);
    if (!u) return reply.code(404).send({ error: "not_found" });
    if (u.blocked) return reply.code(403).send({ error: "user_blocked", message: "Аккаунт заблокирован" });
    if (u.role === "admin") return reply.code(403).send({ error: "admin_use_admin_login", message: "Войди через /admin" });
    const payload: SessionPayload = { sub: u.id, role: u.role as SessionPayload["role"], nick: u.nick };
    await setSessionCookie(reply, payload);
    const recoveryToken = await reply.jwtSign({ sub: u.id, scope: "password_reset" }, { expiresIn: "30m" });
    return { status: "ok", user: { id: u.id, email: u.email, nick: u.nick, role: u.role }, recoveryToken };
  });

  // Вебхук бота: /start → кнопка открытия страницы; /start login_… и контакт → вход на сайт.
  app.post("/bot/webhook", async (req, reply) => {
    if (req.headers["x-telegram-bot-api-secret-token"] !== webhookSecret()) return reply.code(401).send({ error: "unauthorized" });
    type Msg = {
      chat?: { id: number }; from?: { id: number }; text?: string;
      contact?: { phone_number: string; user_id?: number };
    };
    const msg = (req.body as { message?: Msg })?.message;
    const chatId = msg?.chat?.id;
    const fromId = msg?.from?.id;
    if (!chatId) return { ok: true };
    const log = (e: unknown) => req.log.error({ err: e }, "tg bot reply failed");

    const loginMatch = msg?.text?.match(/^\/start\s+login_([A-Za-z0-9_-]{10,64})$/);
    if (loginMatch && fromId) {
      if (!isValidCode(loginMatch[1]!)) {
        await sendMessage(chatId, "Ссылка для входа устарела. Вернись на hhr.pro и нажми «Покупал в боте» ещё раз.").catch(log);
        return { ok: true };
      }
      bindChat(fromId, loginMatch[1]!);
      await sendMessage(chatId, [
        "<b>Вход на сайт hhr.pro</b>",
        "",
        "Нажми кнопку ниже, чтобы подтвердить номер — найдём твой аккаунт с покупками.",
        "",
        "Если ссылку тебе прислал кто-то другой — ничего не нажимай.",
      ].join("\n"), {
        reply_markup: { keyboard: [[{ text: "📱 Подтвердить номер", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
      }).catch(log);
      return { ok: true };
    }

    if (msg?.contact && fromId) {
      const code = codeForChat(fromId);
      const remove = { reply_markup: { remove_keyboard: true } };
      if (!code || !isValidCode(code)) {
        await sendMessage(chatId, "Ссылка для входа устарела. Вернись на hhr.pro и начни вход заново.", remove).catch(log);
        return { ok: true };
      }
      if (msg.contact.user_id !== fromId) {
        await sendMessage(chatId, "Нужен твой собственный номер — нажми кнопку «Подтвердить номер».").catch(log);
        return { ok: true };
      }
      const phone = digitsPhone(msg.contact.phone_number);
      const owners = await findOwnersByPhone(phone);
      clearChat(fromId);
      if (owners.length === 1) {
        await db.update(profiles).set({ phoneE164: phone, phoneVerifiedAt: new Date() }).where(eq(profiles.userId, owners[0]!.user_id));
        resolveCode(code, "ok", owners[0]!.user_id);
        await sendMessage(chatId, "✅ Номер подтверждён. Вернись на сайт — вход выполнится сам, там же задашь пароль.", remove).catch(log);
      } else if (owners.length === 0) {
        resolveCode(code, "not_found");
        await sendMessage(chatId, "На этот номер нет аккаунта и покупок. Если покупал на другой номер — напиши в поддержку.", remove).catch(log);
      } else {
        resolveCode(code, "conflict");
        await sendMessage(chatId, "На этот номер несколько аккаунтов — напиши в поддержку, поможем войти.", remove).catch(log);
      }
      return { ok: true };
    }

    const text = [
      "<b>HELLHOUND</b> 🏍",
      "",
      "Здесь можно купить билеты на легендарный розыгрыш Yamaha MT-07 и оформить предзаказ футболок.",
      "",
      "Старые билеты, Hell Pass и прогресс никуда не пропадут — всё вернём на ваши аккаунты.",
    ].join("\n");
    await sendMessage(chatId, text, openAppButton("Открыть")).catch(log);
    return { ok: true };
  });
}

/** Админка — /api/v1/admin/tg */
export async function adminTgRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  app.get("/summary", async () => {
    const [r] = await db.select({
      paidOrders: sql<number>`count(*)::int`,
      buyers: sql<number>`count(distinct ${tgOrders.phone})::int`,
      tickets: sql<number>`coalesce(sum(${tgOrders.tickets}),0)::int`,
      ticketsRub: sql<number>`coalesce(sum(${tgOrders.ticketsRub}),0)::int`,
      shirtsRub: sql<number>`coalesce(sum(${tgOrders.shirtsRub}),0)::int`,
      shippingRub: sql<number>`coalesce(sum(${tgOrders.shippingRub}),0)::int`,
      totalRub: sql<number>`coalesce(sum(${tgOrders.totalRub}),0)::int`,
      shirtsQty: sql<number>`coalesce(sum((select coalesce(sum((x->>'qty')::int),0) from jsonb_array_elements(${tgOrders.shirts}) x)),0)::int`,
    }).from(tgOrders).where(eq(tgOrders.status, "paid"));
    return r;
  });

  app.get("/orders", async (req) => {
    const q = req.query as { status?: string };
    const status = q.status === "all" ? null : q.status || "paid";
    const rows = await db.select().from(tgOrders)
      .where(status ? eq(tgOrders.status, status) : undefined)
      .orderBy(desc(tgOrders.createdAt)).limit(1000);
    return {
      items: rows.map((o) => ({
        id: o.id, status: o.status, phone: o.phone, telegramUserId: o.telegramUserId, telegramUsername: o.telegramUsername,
        telegramName: o.telegramName, recipientName: o.recipientName, tickets: o.tickets, ticketsRub: o.ticketsRub,
        shirts: o.shirts, shirtsRub: o.shirtsRub, shippingRub: o.shippingRub, totalRub: o.totalRub,
        cdekCityName: o.cdekCityName, cdekPvzCode: o.cdekPvzCode, cdekPvzAddress: o.cdekPvzAddress,
        paidAt: o.paidAt, createdAt: o.createdAt,
      })),
    };
  });

  // Зарегистрировать вебхук бота (один раз после деплоя — кнопкой в админке).
  app.post("/bot/setup", async (req, reply) => {
    const base = (process.env.PUBLIC_API_URL || "https://api.hhr.pro").replace(/\/$/, "");
    const { botCall } = await import("./bot.js");
    try {
      await botCall("setWebhook", { url: `${base}/api/v1/tg/bot/webhook`, secret_token: webhookSecret(), allowed_updates: ["message"] });
      await botCall("setChatMenuButton", { menu_button: { type: "web_app", text: "Открыть", web_app: { url: `${(process.env.TG_WEBAPP_URL || "https://tg.hhr.pro").replace(/\/$/, "")}/tg` } } });
      return { ok: true };
    } catch (e) {
      return reply.code(502).send({ error: "telegram_failed", message: String((e as Error).message) });
    }
  });
}
