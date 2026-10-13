# Project architecture rules

- Calculate blogger financial figures on authenticated server routes, because client-side revenue calculations can be altered and leak private sales data.
- Keep Telegram ticket range normalization in a small tested frontend helper, so slider selection and its displayed total remain consistent.- Keep the Telegram bot and tg.hhr.pro order backend in `server/src/telegram/` with server-side pricing, because order totals must not be trusted from the client.
- Keep tg.hhr.pro orders in their own table, not users/payments, so purchases made without HHR accounts can be linked by phone later.
