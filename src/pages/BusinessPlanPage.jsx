import { useState } from "react";
import { MapPin, BriefcaseBusiness, Sparkles, LoaderCircle } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import { defaultModel, streamGenerate } from "../utils/ai";

const viloyatlar = [
  "Toshkent shahri", "Toshkent viloyati", "Samarqand viloyati", "Buxoro viloyati",
  "Andijon viloyati", "Farg'ona viloyati", "Namangan viloyati", "Qashqadaryo viloyati",
  "Surxondaryo viloyati", "Jizzax viloyati", "Sirdaryo viloyati", "Navoiy viloyati",
  "Xorazm viloyati", "Qoraqalpog'iston Respublikasi",
];

// Haqiqiy, faoliyatdagi O'zbekiston brendlari — raqobatchi tahlilini real ma'lumotga asoslash uchun
const UZ_BRANDS = [
  { key: "fastfood", label: "Tez ovqat (lavash/burger/pizza)", re: /lavash|burger|pitsa|pizza|fast\s*food|tez\s*ovqat|shaurma|sho'rma|hot\s*dog|fri|donar|qovurilgan tovuq/i,
    brands: "Evos, Les Ailes, MaxWay, Oqtepa Lavash, Chopar Pizza, Bellissimo Pizza, City Grill, KFC" },
  { key: "kafe", label: "Kafe / qahvaxona", re: /kafe|qahva|kofe|coffee|qahvaxona|kafeteri/i,
    brands: "Caffe Bene, Bon!, Black Bear Coffee, Sette, The Coffee, Chashma" },
  { key: "restoran", label: "Restoran / milliy taomlar", re: /restoran|osh\b|palov|osh markazi|milliy taom|oshxona|kabob|tandir|to'yxona|to'yxona|banket/i,
    brands: "Besh Qozon (Markaziy Osh Markazi), Afsona, Registon, Milano, National Food" },
  { key: "non", label: "Non / nonvoyxona / qandolat", re: /non\b|nonvoy|nonzavod|non\s*zavod|bakery|pekarn|tort|shirinlik|qandolat|pirog|somsa/i,
    brands: "Bon! Bakery, French Bakery, Korzinka non bo'limi, mahalliy nonvoyxona va non zavodlari" },
  { key: "online", label: "Online do'kon / marketplace", re: /onlayn|online|internet\s*do'kon|internet-do'kon|marketplace|e-?commerce|sayt orqali|ilova orqali/i,
    brands: "Uzum Market, Asaxiy.uz, Olcha.uz, Zoodmall, Sello.uz, Texnomart, Mediapark" },
  { key: "supermarket", label: "Do'kon / supermarket / oziq-ovqat savdosi", re: /supermarket|do'kon|magazin|oziq-ovqat|market\b|mahsulot savdo|mini\s*market|gastronom/i,
    brands: "Korzinka, Makro, Havas, Carrefour, Anor Market" },
  { key: "kiyim", label: "Kiyim / poyabzal / moda", re: /kiyim|poyabzal|libos|fashion|moda|tikuv|atelye|atelie/i,
    brands: "LC Waikiki, DeFacto, Koton, Sezona, mahalliy tikuv brendlari" },
  { key: "gozallik", label: "Go'zallik saloni / sartaroshxona", re: /go'zallik|gozallik|sartarosh|salon|kosmetik|beauty|soch|tirnoq|spa|massaj/i,
    brands: "yirik shahar go'zallik salonlari va kosmetika tarmoqlari (Oasis, Persona va mahalliy salonlar)" },
];

/** G'oya matniga qarab mos raqobat sohasini topadi */
function pickBrandCategory(goya = "") {
  return UZ_BRANDS.find((c) => c.re.test(goya)) || null;
}

/** Tanlangan hudud va g'oya bo'yicha real brend ma'lumotnomasini quradi */
function buildRaqobatContext(hudud, goya) {
  const cat = pickBrandCategory(goya);
  const lines = ["=== O'ZBEKISTONDAGI REAL RAQOBATCHI BRENDLAR (ma'lumotnoma) ==="];
  if (cat) {
    lines.push(`Tanlangan soha — ${cat.label}:`);
    lines.push(`  ${cat.brands}`);
    lines.push(`\nIzoh: bu brendlarning aksariyati Toshkentda kuchli; ${hudud} da ulardan qaysilari mavjudligini va mahalliy raqobatchilarni ham hisobga ol.`);
  } else {
    lines.push("Soha avtomatik aniqlanmadi — quyidagi yirik O'zbekiston brendlaridan g'oyaga mosini tanlab solishtir:");
    for (const c of UZ_BRANDS) lines.push(`  • ${c.label}: ${c.brands}`);
  }
  return lines.join("\n");
}

function buildBankContext({ kreditlar = [], tumanlar = [] }) {
  const parts = [];

  if (kreditlar.length) {
    parts.push("TURONBANK KREDIT MAHSULOTLARI:");
    kreditlar.forEach((k) => {
      parts.push(`  • ${k.nomi}: ${k.miqdor}, ${k.muddat}, foiz ${k.foiz}, imtiyozli davr ${k.imtiyozli_davr}`);
    });
  }

  if (tumanlar.length) {
    parts.push("\nMAHALLA TADBIRKORLIK MA'LUMOTLARI (umumiy ko'rinish):");
    tumanlar.forEach((t) => {
      const jami_bosh = t.mahallalar.reduce((s, m) => s + m.tadbirkor_bosh, 0);
      const jami_hozir = t.mahallalar.reduce((s, m) => s + m.tadbirkor_hozir, 0);
      parts.push(`  • ${t.nom}: tadbirkor boshida ${jami_bosh} → hozir ${jami_hozir} (+${jami_hozir - jami_bosh})`);
    });
  }

  return parts.join("\n");
}

function buildBiznesPrompt({ hudud, goya, kapital, tajriba, maqsad }, bankData = {}) {
  const bankContext = buildBankContext(bankData);
  const raqobatContext = buildRaqobatContext(hudud, goya);

  return `Sen O'zbekiston bo'yicha tajribali biznes-maslahatchisan va Turonbank ekspertisan. Quyidagi ma'lumotlar asosida batafsil va real biznes reja tuz.

Hudud: ${hudud}
Biznes g'oyasi: ${goya}
Boshlang'ich kapital: ${kapital ? kapital + " so'm" : "ko'rsatilmagan"}
Tadbirkor tajribasi: ${tajriba || "ko'rsatilmagan"}
Asosiy maqsad: ${maqsad || "ko'rsatilmagan"}

${raqobatContext}

${bankContext ? `BANK MA'LUMOTLARI (kredit va mahalla statistikasi):\n${bankContext}\n` : ""}
Biznes rejani quyidagi bo'limlar bo'yicha tuz:

1. LOYIHA TAVSIFI — qisqacha g'oya va uning afzalliklari
2. BOZOR TAHLILI — ${hudud} da ushbu soha talabi, maqsadli auditoriya, bozor hajmi
3. RAQOBATCHILAR — yuqoridagi REAL RAQOBATCHI BRENDLAR ro'yxatidan ${hudud} ga mos kamida 3 ta aniq brendni NOMI BILAN keltir va tadbirkor g'oyasi bilan solishtir. Har bir brend uchun: (a) narx darajasi (arzon/o'rta/qimmat), (b) bozordagi mavqei va qamrovi, (c) kuchli tomonlari, (d) zaif tomonlari. So'ng tadbirkor bu brendlardan QANDAY FARQLANIB, ustunlikka erishishi mumkinligini aniq yoz. FAQAT haqiqiy, faoliyatdagi brendlarni ishlat — to'qima nom yozma. Agar ${hudud} da milliy brendlar kam bo'lsa, mahalliy raqobatchilar holatini ham izohla.
4. MARKETING STRATEGIYASI — mijozlarni jalb qilish usullari, ijtimoiy tarmoqlar, narx siyosati (raqobatchilarga nisbatan)
5. BOSHLANG'ICH XARAJATLAR — qaysi xarajatlar bo'lishi va taxminiy summalar (so'mda)
6. MOLIYALASHTIRISH — Turonbank kredit mahsulotlaridan qaysi biri mos kelishi (yuqoridagi ma'lumotlarga asosan)
7. DAROMAD PROGNOZI — 1-yil, 2-yil, 3-yil uchun taxminiy oylik/yillik daromad
8. O'ZINI QOPLASH MUDDATI — qachon investitsiya qaytadi
9. RISKLAR VA YECHIMLAR — asosiy xatarlar va ulardan qochish yo'llari
10. KEYINGI QADAMLAR — birinchi 30 kun ichida nima qilish kerak

Javobni o'zbek tilida, aniq raqamlar va real tavsiyalar bilan yoz. Raqobatchilarni solishtirganda yuqoridagi REAL brendlardan foydalan. Turonbank kredit imkoniyatlarini tavsiya qilishda bank ma'lumotlaridagi aniq raqamlarga tayan.`;
}

/** Render inline markdown bold (**text**) within a line */
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={j}>{part.slice(2, -2)}</strong>
      : part
  );
}

export default function BusinessPlanPage({ model, setModel, bankData = {}, onOpenChat }) {
  const [hudud, setHudud] = useState("");
  const [goya, setGoya] = useState("");
  const [kapital, setKapital] = useState("");
  const [tajriba, setTajriba] = useState("");
  const [maqsad, setMaqsad] = useState("");
  const [plan, setPlan] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function generatePlan() {
    if (!hudud || !goya || isLoading) return;
    setPlan("");
    setError("");
    setIsLoading(true);
    try {
      // Streaming: tokenlar jonli ko'rinadi va uzun javob serverless timeout'ga tushmaydi
      const full = await streamGenerate({
        model: model || defaultModel,
        prompt: buildBiznesPrompt({ hudud, goya, kapital, tajriba, maqsad }, bankData),
        options: { temperature: 0.4, top_p: 0.9, num_predict: 2000 },
        onChunk: (text) => setPlan(text),
      });
      setPlan(full.trim());
    } catch (err) {
      setError(err.message || "AI ga ulanib bo'lmadi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader onOpenChat={onOpenChat} />
      <div className="bp-page">
        <div className="bp-left">
          <div className="bp-heading">
            <span className="eyebrow" style={{ color: "var(--blue-mid)" }}>AI Biznes Maslahatchi</span>
            <h1>Biznes reja tuzish</h1>
            <p>Hududingiz va g'oyangizni kiriting — AI sizga real, batafsil biznes reja tuzib beradi.</p>
          </div>

          <div className="bp-form">
            <div className="bp-field">
              <label><MapPin size={16} /> Hudud (viloyat/tuman)</label>
              <select value={hudud} onChange={(e) => setHudud(e.target.value)}>
                <option value="">Viloyatni tanlang</option>
                {viloyatlar.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="bp-field">
              <label htmlFor="biznes-goya"><BriefcaseBusiness size={16} /> Biznes g'oyasi</label>
              <input
                id="biznes-goya"
                aria-label="Biznes g'oyasi"
                value={goya}
                onChange={(e) => setGoya(e.target.value)}
                placeholder="Masalan: non zavodi, kafe, online do'kon, go'zallik saloni..."
              />
            </div>

            <div className="bp-field">
              <label>Boshlang'ich kapital (so'mda)</label>
              <input
                type="number"
                value={kapital}
                onChange={(e) => setKapital(e.target.value)}
                placeholder="Masalan: 50000000"
              />
            </div>

            <div className="bp-field">
              <label>Tadbirkorlik tajribangiz</label>
              <select value={tajriba} onChange={(e) => setTajriba(e.target.value)}>
                <option value="">Tanlang</option>
                <option value="Tajribam yo'q, yangi boshlayman">Tajribam yo'q, yangi boshlayman</option>
                <option value="1-2 yil tajriba bor">1-2 yil tajriba bor</option>
                <option value="3-5 yil tajriba bor">3-5 yil tajriba bor</option>
                <option value="5 yildan ortiq tajriba bor">5 yildan ortiq tajriba bor</option>
              </select>
            </div>

            <div className="bp-field">
              <label>Asosiy maqsad</label>
              <select value={maqsad} onChange={(e) => setMaqsad(e.target.value)}>
                <option value="">Tanlang</option>
                <option value="Asosiy daromad manbai sifatida">Asosiy daromad manbai</option>
                <option value="Qo'shimcha daromad manbai sifatida">Qo'shimcha daromad manbai</option>
                <option value="Katta biznesga o'sish">Katta biznesga o'sish</option>
                <option value="Bank krediti olish uchun reja kerak">Bank krediti uchun reja</option>
              </select>
            </div>

            <button
              className="bp-submit"
              onClick={generatePlan}
              disabled={isLoading || !hudud || !goya}
            >
              {isLoading
                ? <><LoaderCircle size={18} className="spin" /> Reja tuzilmoqda...</>
                : <><Sparkles size={18} /> Biznes reja tuz</>
              }
            </button>
          </div>
        </div>

        <div className="bp-right">
          {error ? (
            <div className="bp-result bp-result--error">
              <h3>Xatolik yuz berdi</h3>
              <p>{error}</p>
              <button className="bp-submit" style={{ marginTop: 16, width: "auto" }} onClick={generatePlan}>
                Qayta urinish
              </button>
            </div>
          ) : plan ? (
            <div className="bp-result bp-result--done">
              <div className="bp-result__header">
                <Sparkles size={18} />
                <span>{isLoading ? "Biznes reja tuzilmoqda..." : "Biznes reja tayyor"}</span>
                <span className="bp-badge">{hudud}</span>
              </div>
              <div className="bp-content">
                {plan.split("\n").map((line, i) => {
                  if (!line.trim()) return <br key={i} />;
                  // Markdown ajratuvchi chiziq (---, ***, ___) — xom belgilar o'rniga <hr>
                  if (/^\s*([-*_])\1{2,}\s*$/.test(line)) return <hr key={i} className="bp-divider" />;
                  // Markdown sarlavhalari (#, ##, ###, ####) — xom `#` belgilarini olib tashlab, bo'lim sarlavhasi sifatida ko'rsatamiz
                  const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
                  if (heading) {
                    const text = heading[1].replace(/\*\*/g, "").trim();
                    return <h3 key={i} className="bp-section-title">{text}</h3>;
                  }
                  const clean = line.replace(/\*\*/g, "").trim();
                  if (/^\d+\.\s+[A-Z'А-ЯЎҚҒ]/.test(clean)) return <h3 key={i} className="bp-section-title">{clean}</h3>;
                  if (/^\s*[-•*]\s+/.test(line)) return <p key={i} className="bp-list-item">{renderInline(line.replace(/^\s*[-•*]\s+/, "• "))}</p>;
                  return <p key={i}>{renderInline(line)}</p>;
                })}
                {isLoading && <span className="chat-cursor" />}
              </div>
            </div>
          ) : isLoading ? (
            <div className="bp-result bp-result--loading">
              <h3>AI biznes reja tuzmoqda...</h3>
              <p>Bu bir necha soniya vaqt olishi mumkin.</p>
            </div>
          ) : (
            <div className="bp-result bp-result--empty">
              <BriefcaseBusiness size={48} />
              <h3>Biznes reja bu yerda ko'rinadi</h3>
              <p>Chap tomondagi formani to'ldiring va "Biznes reja tuz" tugmasini bosing.</p>
              <ul>
                <li>Bozor tahlili</li>
                <li>Boshlang'ich xarajatlar</li>
                <li>Daromad prognozi (3 yil)</li>
                <li>Risklar va yechimlar</li>
                <li>Keyingi qadamlar</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
