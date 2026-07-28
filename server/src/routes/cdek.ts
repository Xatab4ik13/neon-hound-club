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
    const q = (req.query as { q?: string }).q?.trim() ?? "";
    if (q.length < 2) return { items: [] };
    try {
      const items = await cdek.searchCities(q, 10);
      return {
        items: items.map((c) => ({
          code: c.code,
          city: c.city,
          region: c.region,
          postalCodes: c.postal_codes ?? [],
        })),
      };
    } catch (e) {
      req.log.error({ err: e }, "cdek cities failed");
      return reply.code(502).send({ error: "cdek_unavailable" });
    }
  });

  // Резолв города в код СДЭК по FIAS GUID (или postal_code как fallback).
  // Фронт сначала ищет через DaData (умеет префикс), потом мапит в СДЭК.
  app.get("/city-resolve", async (req, reply) => {
    const q = req.query as { fias?: string; postalCode?: string };
    const fias = q.fias?.trim();
    const postal = q.postalCode?.trim();
    if (!fias && !postal) {
      return reply.code(400).send({ error: "fias_or_postal_required" });
    }
    try {
      const items = await cdek.resolveCity({ fiasGuid: fias, postalCode: postal });
      const first = items[0];
      if (!first) return reply.code(404).send({ error: "not_found" });
      return {
        code: first.code,
        city: first.city,
        region: first.region,
        postalCodes: first.postal_codes ?? [],
      };
    } catch (e) {
      req.log.error({ err: e }, "cdek city-resolve failed");
      return reply.code(502).send({ error: "cdek_unavailable" });
    }
  });


  app.get("/pvz", async (req, reply) => {
    const cityCode = Number((req.query as { cityCode?: string }).cityCode);
    if (!Number.isFinite(cityCode) || cityCode <= 0) {
      return reply.code(400).send({ error: "cityCode_required" });
    }
    try {
      const items = await cdek.getPickupPoints(cityCode);
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
      return reply.code(502).send({ error: "cdek_unavailable" });
    }
  });
}
