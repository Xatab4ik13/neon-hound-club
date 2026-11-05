# Project architecture rules

- Calculate blogger financial figures on authenticated server routes, because client-side revenue calculations can be altered and leak private sales data.
- Aggregate website and Telegram revenue independently by paid date on the blogger money route and combine via its tested helper, because Telegram orders remain separate and shipping must not enter the total.
- Keep Telegram ticket range normalization in a small tested frontend helper, so slider selection and its displayed total remain consistent.- Keep the Telegram bot and tg.hhr.pro order backend in `server/src/telegram/` with server-side pricing, because order totals must not be trusted from the client.
- Keep tg.hhr.pro orders in their own table, not users/payments, so purchases made without HHR accounts can be linked by phone later.
- Merge Telegram ticket credits, raffle entries and ticket debits in one order-locked transaction, because participation must not leave purchased tickets reusable.
- Log Telegram buyers into the site only via bot-verified own contact (contact.user_id = from.id) and a one-time in-memory code, because a bare Telegram nick or typed phone must not grant account access.
