# Project architecture rules

- Calculate blogger financial figures on authenticated server routes, because client-side revenue calculations can be altered and leak private sales data.
- Aggregate website and Telegram revenue independently by paid date on the blogger money route and combine via its tested helper, because Telegram orders remain separate and shipping must not enter the total.
- Keep Telegram ticket packs and range normalization in a small tested frontend helper, so displayed prices and slider totals can be verified against server pricing.
- Keep the Telegram bot and tg.hhr.pro order backend in `server/src/telegram/` with server-side pricing, because order totals must not be trusted from the client.
- Keep tg.hhr.pro orders in their own table, not users/payments, so purchases made without HHR accounts can be linked by phone later.
- Merge Telegram ticket credits, raffle entries and ticket debits in one order-locked transaction, because participation must not leave purchased tickets reusable.
- Log Telegram buyers into the site only via bot-verified own contact (contact.user_id = from.id) and a one-time in-memory code, because a bare Telegram nick or typed phone must not grant account access.
- On phone verification, move tickets and raffle entries from an unverified Telegram bot auto-account holding the same number in one transaction (`server/src/lib/phone-claim.ts`), because the unique phone index otherwise blocks the real owner and they would lose bot purchases.
- HellSpin seasons never auto-start: `seasonBounds` in `server/src/lib/season-clock.ts` is pinned to the current season until the owner confirms the next one, because season starts reset activity progress.
- HellSpin physical rewards ship via a 0 ₽ order with `kind_summary="spin"` and `spin_winner_id` (`server/src/lib/spin-delivery.ts`), because users pay only server-calculated CDEK delivery and the CRM must show it next to shop orders.
