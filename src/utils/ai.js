import { apiUrl } from "./apiBase";

export const defaultModel = "google/gemma-4-31b-it:free";

// Supported language codes and their names
const SUPPORTED_LANGS = ["uz", "ru", "en"];

function buildTumanlarContext(tumanlar) {
  if (!tumanlar?.length) return "";
  const lines = ["=== MAHALLA MA'LUMOTLARI ==="];
  for (const tuman of tumanlar) {
    lines.push(`\n${tuman.nom}:`);
    for (const m of tuman.mahallalar) {
      lines.push(`  • ${m.nom}: aholi ${m.aholi}, xonadon ${m.xonadon}${m.oila ? `, oila ${m.oila}` : ""}`);
      lines.push(`    Tadbirkor: boshida ${m.tadbirkor_bosh} → hozir ${m.tadbirkor_hozir} (+${m.tadbirkor_hozir - m.tadbirkor_bosh})`);
      lines.push(`    Ishsizlik: boshida ${m.ishsizlik_bosh} → hozir ${m.ishsizlik_hozir}`);
      lines.push(`    Kambag'al oila: boshida ${m.kambagal_bosh} → hozir ${m.kambagal_hozir}`);
      lines.push(`    Bank: ${m.bank} | Bankir: ${m.bankir} | Agent: ${m.agent}`);
      lines.push(`    Ixtisoslik: ${m.ixtisoslik}`);
    }
  }
  return lines.join("\n");
}

function buildKreditlarContext(kreditlar) {
  if (!kreditlar?.length) return "";
  const lines = ["=== KREDIT MAHSULOTLARI ==="];
  for (const k of kreditlar) {
    lines.push(`\n• ${k.nomi} (${k.valyuta})`);
    lines.push(`  Miqdor: ${k.miqdor}, Muddat: ${k.muddat}, Foiz: ${k.foiz}`);
    lines.push(`  Kafolat: ${k.kafolat}, Imtiyozli davr: ${k.imtiyozli_davr}`);
    lines.push(`  Talab: ${k.talab?.join(", ")}`);
    lines.push(`  Hujjatlar: ${k.hujjatlar?.join(", ")}`);
    if (k.izoh) lines.push(`  Izoh: ${k.izoh}`);
  }
  return lines.join("\n");
}

function buildOmonatlarContext(omonatlar) {
  if (!omonatlar?.length) return "";
  const lines = ["=== OMONAT MAHSULOTLARI ==="];
  for (const o of omonatlar) {
    lines.push(`\n• ${o.nomi} (${o.valyuta})`);
    lines.push(`  Muddat: ${o.muddat}, Stavka: ${o.stavka}`);
    lines.push(`  Minimal miqdor: ${o.minimal_miqdor}`);
    lines.push(`  To'ldirish: ${o["toʻldirish"]}, Qisman chiqim: ${o.qisman_chiqim}`);
    lines.push(`  Onlayn ochish: ${o.onlayn_ochish}`);
    if (o.izoh) lines.push(`  Izoh: ${o.izoh}`);
  }
  return lines.join("\n");
}

function buildKartalarContext(kartalar) {
  if (!kartalar?.length) return "";
  const lines = ["=== KARTA TURLARI ==="];
  for (const k of kartalar) {
    lines.push(`\n• ${k.nomi} — ${k.turi} (${k.tizim}, ${k.valyuta})`);
    lines.push(`  Amal muddati: ${k.amal_muddati}, Chiqarish: ${k.chiqarish_narxi}`);
    lines.push(`  Yillik xizmat: ${k.yillik_xizmat}, Cashback: ${k.cashback}`);
    lines.push(`  Xususiyatlar: ${k.xususiyatlar?.join(", ")}`);
    if (k.izoh) lines.push(`  Izoh: ${k.izoh}`);
  }
  return lines.join("\n");
}

function buildFaqContext(faqItems) {
  if (!faqItems?.length) return "";
  return ["=== FAQ ===", ...faqItems.map((item, i) =>
    `${i + 1}. [${item.category}] S: ${item.question}\n   J: ${item.answer}`
  )].join("\n\n");
}

export function buildPrompt(question, faqItems, bankData = {}) {
  const { tumanlar = [], kreditlar = [], omonatlar = [], kartalar = [] } = bankData;

  const context = [
    buildTumanlarContext(tumanlar),
    buildKreditlarContext(kreditlar),
    buildOmonatlarContext(omonatlar),
    buildKartalarContext(kartalar),
    buildFaqContext(faqItems),
  ].filter(Boolean).join("\n\n");

  return `Sen Turonbank uchun ishlaydigan AI yordamchisisan. Muloyim, do'stona va professional muloqot qil.

MUHIM QOIDALAR:
1. FAQAT uchta tilda javob ber: O'ZBEK, RUS yoki INGLIZ tili.
   - Savol o'zbek tilida → javob o'zbek tilida
   - Savol rus tilida → javob rus tilida
   - Savol ingliz tilida → javob ingliz tilida
   - Boshqa tilda savol kelsa → o'zbek tilida javob ber
2. Salomlashuv va oddiy ijtimoiy so'zlarga tabiiy javob ber.
3. Mahalla, tuman, tadbirkorlik, ishsizlik, kambag'allik, agent, ombor daftari haqidagi savollarda RAG MA'LUMOTLAR BAZASI va MAHALLA MA'LUMOTLARI bo'limiga tayan.
4. Kredit, omonat, karta haqidagi savollarda tegishli bo'limga tayan.
5. Ma'lumot topilmasa: turonbank.uz yoki 1220 ga murojaat qilishni tavsiya qil.
6. Tahlil so'ralganda raqamlar bilan aniq javob ber (eng ko'p, eng kam, o'sish, kamayish).
7. Javob qisqa, aniq va foydali bo'lsin.
8. Hech qachon boshqa tilda (arab, xitoy, turk va h.k.) javob berma.

${context}

Foydalanuvchi: ${question}`;
}

/**
 * Generic streaming client for /api/generate (Server-Sent Events).
 * onChunk receives the cumulative text on every token.
 * @returns {Promise<string>} the full generated text
 */
export async function streamGenerate({ prompt, model, ragQuery, options, onChunk }) {
  const response = await fetch(apiUrl("/api/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, ragQuery, stream: true, options }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `AI server javob bermadi: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return full;
      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content || "";
        if (token) { full += token; onChunk?.(full); }
      } catch {}
    }
  }
  return full;
}

export function askLocalAiStream(question, model, faqItems, bankData, onChunk) {
  return streamGenerate({
    prompt: buildPrompt(question, faqItems, bankData),
    model,
    ragQuery: question, // pass raw question for server-side RAG search
    options: { temperature: 0.2, top_p: 0.85, num_predict: 800 },
    onChunk,
  });
}
