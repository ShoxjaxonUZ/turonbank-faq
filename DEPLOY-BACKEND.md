# Backendni serverga joylash (Railway / Render / Fly.io)

Backend — `server.js` (Express). U `api/*.js` Vercel funksiyalarini oddiy Node
serverida ishlatadi. RAG indeks (`data/rag-index.json`) git'ga kiritilgan, shuning
uchun alohida build shart emas — faqat `npm install` + `npm start`.

Frontend Vercel'da qoladi va backendga `VITE_API_BASE` orqali ulanadi.

---

## Variant A — Render.com (bepul, tavsiya etiladi)

1. [render.com](https://render.com) ga kiring → **New + → Web Service**.
2. GitHub repo'ni ulang (`turonbank-faq`).
3. Render `render.yaml` ni avtomatik o'qiydi. Yoki qo'lda:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. **Environment** bo'limida o'zgaruvchilarni kiriting:
   | Key | Value |
   |-----|-------|
   | `OPENROUTER_API_KEY` | (sizning kalitingiz) |
   | `OPENROUTER_MODEL` | `google/gemma-4-31b-it:free` |
   | `OPENROUTER_SITE_URL` | `https://turon-bank.vercel.app` |
   | `CORS_ORIGIN` | `https://turon-bank.vercel.app` |
5. **Create Web Service**. Deploy tugagach URL olasiz, masalan:
   `https://turonbank-faq-api.onrender.com`

> Render bepul tarif 15 daqiqa harakatsizlikdan keyin "uxlaydi" — birinchi so'rov
> ~30s sekin bo'ladi. Doimiy ishlashi uchun pullik tarif yoki Railway tanlang.

---

## Variant B — Railway.app

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
2. Repo'ni tanlang. Railway Node'ni avtomatik aniqlaydi va `npm start` ni ishlatadi.
3. **Variables** bo'limiga yuqoridagi 4 ta env o'zgaruvchini qo'shing.
4. **Settings → Networking → Generate Domain** bilan public URL oling.

---

## Variant C — Fly.io (Docker)

```bash
fly launch            # Dockerfile avtomatik aniqlanadi, app nomini tanlang
fly secrets set OPENROUTER_API_KEY=... OPENROUTER_MODEL=google/gemma-4-31b-it:free \
  OPENROUTER_SITE_URL=https://turon-bank.vercel.app CORS_ORIGIN=https://turon-bank.vercel.app
fly deploy
```

---

## Frontendni backendga ulash (Vercel)

Backend URL'ini olganingizdan keyin:

1. Vercel → loyiha → **Settings → Environment Variables**:
   - `VITE_API_BASE` = `https://<backend-url>`  (masalan `https://turonbank-faq-api.onrender.com`)
2. **Redeploy** qiling (Vite env build vaqtida o'qiladi).

`VITE_API_BASE` bo'sh bo'lsa, frontend hozirgidek nisbiy `/api/...` ishlatadi
(ya'ni backend ham Vercel'da degani).

---

## Tekshirish

```bash
curl https://<backend-url>/health        # → OK
curl https://<backend-url>/api/rates      # → valyuta kurslari
curl -X POST https://<backend-url>/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test","stream":false}'
```

---

## Mahalliy sinov

```bash
npm install
node --env-file=.env.local server.js   # yoki: npm start (env'lar tizimda bo'lsa)
# → http://localhost:3001
```
