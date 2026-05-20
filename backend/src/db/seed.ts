import { db, pool } from "./client.js";
import { subscriptionTiers } from "./schema.js";

// Сид справочника тиров. Идемпотентно (ON CONFLICT DO UPDATE).
await db
  .insert(subscriptionTiers)
  .values([
    { tier: "silver",   name: "Silver",   priceRub: 490,  monthlyTickets: 2,  aiMonthlyLimit: 20 },
    { tier: "gold",     name: "Gold",     priceRub: 1290, monthlyTickets: 7,  aiMonthlyLimit: 100 },
    { tier: "platinum", name: "Platinum", priceRub: 2990, monthlyTickets: 18, aiMonthlyLimit: -1 },
  ])
  .onConflictDoUpdate({
    target: subscriptionTiers.tier,
    set: {
      priceRub: (subscriptionTiers as any).priceRub,
      monthlyTickets: (subscriptionTiers as any).monthlyTickets,
      aiMonthlyLimit: (subscriptionTiers as any).aiMonthlyLimit,
      name: (subscriptionTiers as any).name,
    },
  });

await pool.end();
console.log("✓ tiers seeded");
