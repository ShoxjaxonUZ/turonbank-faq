# Turonbank Mahalla Portali — AI Yordamchi

Turonbank va Toshkent shahar mahallalari uchun AI bilan ishlaydigan veb-portal. Foydalanuvchilar kredit, omonat, karta mahsulotlari va mahalla statistikasi haqida savol berib, RAG texnologiyasi asosida javob olishlari mumkin.

**Demo:** [turon-bank.vercel.app](https://turon-bank.vercel.app)

---

## Imkoniyatlar

- **AI chat widget** — OpenRouter API orqali real vaqtda streaming javoblar
- **RAG (Retrieval-Augmented Generation)** — 8000+ chunk'dan iborat mahalla hujjatlar bazasi
- **Mahalla statistikasi** — 6 tuman, 40+ mahalla bo'yicha aholi, tadbirkorlik, ishsizlik, kambag'allik ko'rsatkichlari
- **Kredit, omonat, karta ma'lumotlari** — barcha Turonbank mahsulotlari
- **Ko'p tilli** — O'zbek (lotin/kirill), Rus, Ingliz tillarida javob
- **Filiallar xaritasi** — Leaflet asosida interaktiv xarita
- **Hujjat generator** — mahalla ma'lumotlari asosida PDF hujjat yaratish
- **Biznes-reja generator** — AI yordamida biznes-reja tuzish

---

## Texnologiyalar

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend | React 19, React Router 7, Lucide React |
| Build | Vite 7 |
| AI | OpenRouter API (streaming) |
| RAG indeks | BM25 asosida o'ziga xos inverted index |
| Hujjat o'qish | officeparser (DOCX, PPTX), pdf-parse (PDF) |
| Xarita | Leaflet 1.9 |
| Deploy | Vercel (Serverless Functions + Static) |

---

## Loyha tuzilmasi

```
turon-bak-faq/
├── api/                         # Vercel Serverless Functions
│   ├── generate.js              # AI javob (OpenRouter + RAG)
│   ├── news.js                  # Turonbank yangiliklari
│   ├── rates.js                 # Valyuta kurslari
│   ├── read-file.js             # Fayl matnini ajratish
│   ├── tags.js                  # AI model ro'yxati
│   └── lib/
│       └── rag.js               # RAG qidiruv mantiqiy qismi
│
├── data-bank/                   # Mahalla hujjatlari (DOCX, PPTX, TXT)
│   ├── Катта Чилонзор-1/        # Har bir mahalla o'z papkasida
│   ├── Катта Чилонзор-2/
│   ├── Катта Чилонзор-3/
│   ├── КУТАРМА/
│   ├── Toshkent shahar BXM Ombor daftari/
│   │   ├── Chilonzor/
│   │   ├── Mirobod/
│   │   ├── Mirzo Ulug'bek/
│   │   ├── Shayxontohur/
│   │   └── Yunusobod/
│   └── ... (jami 30+ mahalla papkasi)
│
├── data/
│   └── rag-index.json           # Build qilingan RAG indeksi (7900+ chunk)
│
├── public/
│   └── data/
│       ├── tumanlar.json        # Tuman va mahalla statistikasi
│       ├── kreditlar.json       # Kredit mahsulotlari
│       ├── omonatlar.json       # Omonat mahsulotlari
│       └── kartalar.json        # Karta turlari
│
├── scripts/
│   ├── build-rag.mjs            # RAG indeks builder
│   ├── dev-with-ai.mjs          # Dev server (AI middleware bilan)
│   └── scrape-turonbank-news.mjs # Yangiliklar parser
│
├── src/
│   ├── main.jsx                 # React app + Router
│   ├── styles.css               # Global uslublar
│   ├── components/
│   │   ├── ChatWidget.jsx       # AI chat interfeysi
│   │   ├── HomeMahallalarWidget.jsx  # Mahalla statistika widget
│   │   ├── SiTavsiyasi.jsx      # Tavsiya komponenti
│   │   └── SiteHeader.jsx       # Sayt sarlavhasi
│   ├── pages/
│   │   ├── HomePage.jsx         # Bosh sahifa
│   │   ├── FaqPage.jsx          # FAQ sahifasi
│   │   ├── FiliallarPage.jsx    # Filiallar xaritasi
│   │   ├── HujjatlarPage.jsx    # Hujjat generator
│   │   └── BusinessPlanPage.jsx # Biznes-reja generator
│   ├── data/
│   │   ├── bankData.js          # Bank ma'lumotlarini fetch qilish
│   │   ├── faq.js               # Statik FAQ ma'lumotlari
│   │   └── tumanlar.js          # Tuman ma'lumotlarini fetch qilish
│   └── utils/
│       ├── ai.js                # AI prompt builder + streaming client
│       └── format.js            # Formatlash yordamchi funksiyalar
│
├── vercel.json                  # Vercel konfiguratsiyasi
├── vite.config.js               # Vite konfiguratsiyasi
└── package.json
```

---

## O'rnatish

### Talablar
- Node.js 18+
- npm 9+

### Qadamlar

```bash
git clone https://github.com/Mergan-Amonov/turonbank-faq.git
cd turonbank-faq
npm install
```

`.env.local` faylini yarating:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
```

> OpenRouter API key olish: [openrouter.ai/keys](https://openrouter.ai/keys)

---

## Ishga tushirish

```bash
# Dev server (RAG middleware bilan)
npm run dev

# Faqat RAG indeksini qayta qurish
npm run build:rag

# Production build
npm run build

# Yangiliklar scraper
npm run scrape:news
```

Dev server `http://localhost:5173` da ochiladi va `/api/*` so'rovlarini ichki middleware orqali qayta yo'naltiradi.

---

## RAG tizimi

### Qanday ishlaydi

1. `data-bank/` papkasidagi barcha `.docx`, `.pptx`, `.txt` fayllar o'qiladi
2. Har bir fayl 500 belgilik chunk'larga bo'linadi (80 belgi overlap bilan)
3. Inverted index quriladi (BM25 algoritmiga yaqin TF-IDF usuli)
4. Natija `data/rag-index.json` ga saqlanadi (~6.5 MB)
5. Foydalanuvchi savol berganda eng mos 5 chunk topiladi va prompt'ga qo'shiladi

### Indeksni yangilash

```bash
npm run build:rag
```

Build tugagach statistika:
```
Files: 105
Chunks: ~7900
Index terms: ~13000
Size: ~6.5 MB
```

### Yangi mahalla qo'shish

1. `data-bank/` ichida yangi papka oching (mahalla nomi bilan)
2. DOCX, PPTX yoki TXT fayllarni papkaga joylashtiring
3. `npm run build:rag` buyrug'ini ishga tushiring
4. `public/data/tumanlar.json` faylga mahalla statistikasini qo'shing (quyidagi format bo'yicha)
5. `git add`, `git commit`, `git push` va `vercel --prod`

#### `tumanlar.json` mahalla formati

```json
{
  "id": "mahalla-id",
  "nom": "Mahalla nomi",
  "aholi": 6150,
  "xonadon": 2550,
  "tadbirkor_bosh": 0,
  "tadbirkor_hozir": 764,
  "ishsizlik_bosh": 0,
  "ishsizlik_hozir": 25,
  "kambagal_bosh": 0,
  "kambagal_hozir": 0,
  "bank": "TuronBank Chilonzor BXO",
  "bankir": "F.I.Sh",
  "agent": "F.I.Sh",
  "ixtisoslik": "Savdo va xizmat ko'rsatish"
}
```

---

## Mahallalar

Hozirda quyidagi tumanlar va mahallalar mavjud:

| Tuman | Mahallalar |
|-------|-----------|
| **Chilonzor** | Katta Chilonzor-1, Katta Chilonzor-2, Katta Chilonzor-3, Ko'tarma, Катта хирмонтепа, Кўркам, Новза, 1-Қатортол |
| **Shayxontohur** | Chorsu, Katta oqtepa, Ko'kcha darvoza, Yangi Kamolon, Зангиота, Олим Хўжаев, Жар-ариқ, Илғор, Кўкча, Чархновза, Шайхонтоҳур, Янги шаҳар, Шофайзи |
| **Yashnobod** | Bog'bon, Yosh avlod, Uysozlar, Tovkentepa, Yangiqu'rg'on, O'rta Masjid, Jarboshi, Tashisti, Argin, Katta Qo'yliq, Qo'yliqobod, Mumtoz |
| **Mirzo Ulug'bek** | Shaxrisabz, Nur, Alisher Navoiy, Гулсанам, Алпомиш, Авайхон, Пасткиюз, Олий Химмат, Нодирабегим, Олтинтепа |
| **Mirobod** | Oybek, Ziyonur, А.Фитрат, Банокатий, Заминобод |
| **Yunusobod** | Sobirobod, Xusniobod, Янгибоғ, Юнусота, Туркистон, Регистон |

---

## API endpointlar

### `POST /api/generate`

AI javob generatsiyasi (RAG bilan).

**So'rov:**
```json
{
  "model": "google/gemma-4-31b-it:free",
  "prompt": "...",
  "ragQuery": "Katta Chilonzor-1 aholi soni",
  "stream": true,
  "options": {
    "temperature": 0.2,
    "top_p": 0.85,
    "num_predict": 800
  }
}
```

**Javob (stream=true):** Server-Sent Events formatida token-token javob.

**Javob (stream=false):**
```json
{
  "response": "Javob matni...",
  "model": "model-nomi",
  "usage": { "prompt_tokens": 100, "completion_tokens": 200 }
}
```

### `GET /api/news`

Turonbank yangiliklari (turonbank.uz dan scrape qilingan).

### `GET /api/rates`

Joriy valyuta kurslari.

### `POST /api/read-file`

Yuklangan fayldan matn ajratib olish (DOCX, PDF, PPTX qo'llab-quvvatlanadi).

---

## Deploy (Vercel)

```bash
# Preview deploy
vercel

# Production deploy
vercel --prod
```

### Muhit o'zgaruvchilari (Environment Variables)

Vercel dashboard → Project → Settings → Environment Variables ga qo'shing:

| O'zgaruvchi | Tavsif | Majburiy |
|-------------|--------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API kaliti | Ha |
| `OPENROUTER_MODEL` | Ishlatiladigan model (standart: `google/gemma-4-31b-it:free`) | Yo'q |
| `OPENROUTER_SITE_URL` | Sayt manzili (OpenRouter reytingi uchun) | Yo'q |

---

## Muhim skriptlar

### `scripts/build-rag.mjs`

`data-bank/` papkasidagi barcha hujjatlardan RAG indeksini quradi.

- `.docx` va `.pptx` fayllar `officeparser` orqali o'qiladi
- `.txt` fayllar to'g'ridan-to'g'ri o'qiladi
- `.doc` fayllar **qo'llab-quvvatlanmaydi** — avval `.txt` ga o'girib saqlang
- Bir xil tarkibli fayllar (MD5 hash orqali) o'tkazib yuboriladi (duplicate skipping)

### `scripts/dev-with-ai.mjs`

Vite dev serveri ustiga `/api/*` so'rovlarini qayta yo'naltiruvchi middleware qo'shadi. Bu Vercel serverless funksiyalarni local muhitda sinab ko'rish imkonini beradi.

---

## `.doc` fayllarni qo'shish

Eski `.doc` formatdagi fayllar RAG tizimi tomonidan o'qilmaydi. Ularni quyidagicha `.txt` ga o'giring:

```python
import olefile, re, os

def doc_to_txt(doc_path, out_path):
    ole = olefile.OleFileIO(doc_path)
    with ole.openstream('WordDocument') as f:
        data = f.read()
    text = data.decode('utf-16-le', errors='ignore')
    text = re.sub(r'[\x00-\x1f\x7f]', ' ', text)
    text = re.sub(r'[^\w\s\.,;\:\!\?\-\(\)\"]+', ' ', text, flags=re.UNICODE)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\. ', '.\n', text)
    # Faqat kirill matnli qatorlarni saqlash
    match = re.search(r'[А-ЯЎҚҒЁа-яўқғё]{5,}', text)
    if match:
        text = text[match.start():]
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(text)
```

---

## Litsenziya

Ushbu loyha Turonbank uchun ishlab chiqilgan. Barcha huquqlar himoyalangan.
