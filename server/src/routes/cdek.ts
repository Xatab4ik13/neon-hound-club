/**
 * Публичные ручки СДЭК для фронта:
 *   GET  /api/v1/cdek/cities?q=крас        — автокомплит города
 *   GET  /api/v1/cdek/pvz?cityCode=435     — список ПВЗ в городе
 *   POST /api/v1/cdek/calculate            — расчёт стоимости и срока по корзине
 *
 * Калькулятор берёт вес/габариты из products НА СЕРВЕРЕ, фронт передаёт только productId+qty.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { products } from "../db/schema/shop.js";
import { cdek, type CdekDeliveryMode } from "../lib/cdek.js";

export async function cdekRoutes(app: FastifyInstance) {
  app.get("/cities", async (req, reply) => {
    const query = req.query as { q?: string; country?: string };
    const q = query.q?.trim() ?? "";
    if (q.length < 2) return { items: [] };
    try {
      const items = await cdek.searchCities(q, 10, query.country?.trim() || undefined);
      return {
        items: items.map((c) => ({
          code: c.code,
          city: c.city,
          region: c.region,
          countryCode: c.country_code,
          postalCodes: c.postal_codes ?? [],
        })),
      };
    } catch (e) {
      req.log.error({ err: e }, "cdek cities failed");
      return reply.code(502).send({ error: "cdek_unavailable" });
    }
  });

  // Резолв города в код СДЭК: по FIAS GUID (Россия), по индексу или по
  // названию + стране (СНГ — у DaData там нет ФИАС).
  app.get("/city-resolve", async (req, reply) => {
    const q = req.query as { fias?: string; postalCode?: string; city?: string; country?: string };
    const fias = q.fias?.trim();
    const postal = q.postalCode?.trim();
    const city = q.city?.trim();
    const country = q.country?.trim();
    if (!fias && !postal && !city) {
      return reply.code(400).send({ error: "fias_postal_or_city_required" });
    }
    try {
      let items = await cdek.resolveCity({
        fiasGuid: fias,
        postalCode: postal,
        countryCode: country,
      });
      // Фолбэк для СНГ / когда ФИАС и индекс не дали результата — по названию.
      if (items.length === 0 && city) {
        items = await cdek.resolveCity({ city, countryCode: country });
      }
      const first = items[0];
      if (!first) return reply.code(404).send({ error: "not_found" });
      return {
        code: first.code,
        city: first.city,
        region: first.region,
        countryCode: first.country_code,
        postalCodes: first.postal_codes ?? [],
      };
    } catch (e) {
      req.log.error({ err: e }, "cdek city-resolve failed");
      return reply.code(502).send({ error: "cdek_unavailable" });
    }
  });


  app.get("/pvz", async (req, reply) => {
    const query = req.query as { cityCode?: string; country?: string };
    const cityCode = Number(query.cityCode);
    if (!Number.isFinite(cityCode) || cityCode <= 0) {
      return reply.code(400).send({ error: "cityCode_required" });
    }
    try {
      const items = await cdek.getPickupPoints(cityCode, query.country?.trim() || undefined);
      return {
        items: items.map((p) => ({
          code: p.code,
          name: p.name,
          address: p.location.address_full,
          workTime: p.work_time,
          lat: p.location.latitude,
          lng: p.location.longitude,
        })),
      };
    } catch (e) {
      req.log.error({ err: e }, "cdek pvz failed");
      return reply.code(502).send({ error: "cdek_unavailable" });
    }
  });


  const calcSchema = z.object({
    cityCode: z.number().int().positive(),
    mode: z.enum(["pvz", "courier"]),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          qty: z.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(50),
  });

  app.post("/calculate", async (req, reply) => {
    const parsed = calcSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_input", issues: parsed.error.flatten() });
    }
    const { cityCode, mode, items } = parsed.data;

    const rows = await db
      .select({
        id: products.id,
        kind: products.kind,
        weightG: products.weightG,
        lengthCm: products.lengthCm,
        widthCm: products.widthCm,
        heightCm: products.heightCm,
      })
      .from(products)
      .where(inArray(products.id, items.map((i) => i.productId)));

    const byId = new Map(rows.map((r) => [r.id, r]));
    // Одна коробка на весь заказ: суммируем вес, берём максимум габаритов.
    // Так расчёт совпадает с реальной накладной (см. server/src/lib/cdek-orders.ts).
    let totalWeight = 0;
    let maxL = 0, maxW = 0, maxH = 0;
    let hasPhysical = false;
    for (const it of items) {
      const p = byId.get(it.productId);
      if (!p) return reply.code(400).send({ error: "product_not_found", productId: it.productId });
      // virtual/digital в расчёт доставки не идут — их фронт уже отфильтровал, но защитимся.
      if (p.kind === "virtual" || p.kind === "digital") continue;
      if (!p.weightG || !p.lengthCm || !p.widthCm || !p.heightCm) {
        return reply.code(409).send({
          error: "product_missing_dimensions",
          productId: it.productId,
          message: "У товара не заданы вес и габариты — обратитесь в поддержку",
        });
      }
      hasPhysical = true;
      totalWeight += p.weightG * it.qty;
      if (p.lengthCm > maxL) maxL = p.lengthCm;
      if (p.widthCm > maxW) maxW = p.widthCm;
      if (p.heightCm > maxH) maxH = p.heightCm;
    }

    if (!hasPhysical) {
      // вся корзина — virtual/digital
      return { totalSum: 0, periodMin: 0, periodMax: 0, tariffCode: 0, mode };
    }
    const packages = [{ weightG: totalWeight, lengthCm: maxL, widthCm: maxW, heightCm: maxH }];

    try {
      const res = await cdek.calculate({ toCityCode: cityCode, mode: mode as CdekDeliveryMode, packages });
      return { ...res, mode };
    } catch (e) {
      req.log.error({ err: e }, "cdek calculate failed");
      const msg = (e as Error)?.message ?? "";
      if (msg.includes("country_not_supported")) {
        return reply
          .code(409)
          .send({ error: "country_not_supported", message: "В эту страну доставки пока нет" });
      }
      if (msg.includes("no_tariff_for_direction")) {
        return reply.code(409).send({
          error: "no_tariff_for_direction",
          message:
            mode === "courier"
              ? "Курьером в этот город не возят — выбери пункт выдачи"
              : "В этот город нет доступной доставки — попробуй другой город или курьера",
        });
      }
      return reply.code(502).send({ error: "cdek_unavailable" });
    }

  });
}
