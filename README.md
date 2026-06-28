# Telegram Web (haqiqiy Telegram / MTProto)

React + Vite frontend that connects to a real Telegram account through a
GramJS/MTProto backend. Looks and behaves like Telegram Web.

Backend API: `https://2701-tg-back-production.up.railway.app/api/docs/`

## Ishga tushirish

```bash
npm install
npm run dev
```

Brauzerda dev server manzilini oching (masalan `http://localhost:5180`).

### Login uchun kerak

Backendda `TG_API_ID` / `TG_API_HASH` o'rnatilmagan, shuning uchun ularni
login oynasida o'zingiz kiritasiz:

1. [my.telegram.org](https://my.telegram.org) → **API development tools**
2. **App api_id** va **App api_hash** ni oling
3. Login oynasida telefon raqam + "API ID / Hash kiritish" bo'limiga joylang
4. Telegramdan kelgan kodni kiriting (2FA bo'lsa — parol ham)

API ID/Hash brauzeringizning `localStorage` ida saqlanadi.

## CORS / Proxy

Backend CORS faqat `http://localhost:5173` ga ruxsat beradi. Shuning uchun
`vite.config.js` da `/api` so'rovlari backendga **proxy** qilinadi — brauzer
har doim same-origin ishlaydi va CORS muammosi bo'lmaydi.

Boshqa backendga ulanish: `VITE_API_TARGET` (proxy target) yoki
`VITE_API_BASE` (to'g'ridan-to'g'ri base URL) env o'zgaruvchilari.

## Imkoniyatlar

- Telefon + kod + 2FA login (real Telegram)
- Suhbatlar ro'yxati, qidiruv (lokal + global)
- Xabarlarni o'qish, yuborish, tahrirlash, o'chirish
- Media (rasm/fayl) yuborish va yuklab olish
- Reply, forward, reaksiya (👍), pin, "yozyapti…", o'qildi belgisi
- Telegram Web uslubidagi dark theme, mobil moslashuv
