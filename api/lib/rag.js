/**
 * RAG (Retrieval-Augmented Generation) search utility
 * Supports Uzbek (Latin & Cyrillic), Russian, and English queries
 *
 * Yagona manba (single source of truth): bu modul build skripti
 * (scripts/build-rag.mjs), dev server (vite.config.js) va Vercel serverless
 * funksiyasi (api/generate.js) tomonidan birgalikda ishlatiladi.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.resolve(__dirname, "../../data/rag-index.json");

let cachedIndex = null;

export async function loadIndex() {
  if (cachedIndex) return cachedIndex;
  const raw = await readFile(INDEX_PATH, "utf8");
  cachedIndex = JSON.parse(raw);
  return cachedIndex;
}

/** Tokenize any text: keeps all Unicode letters, filters noise */
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && t.length < 30);
}

/**
 * Uzbek Latin → Cyrillic mapping for cross-script search.
 * Only the most common bank/mahalla domain terms.
 */
export const UZ_LAT_CYR = {
  // Bank terms
  kredit: "кредит", kreditlar: "кредитлар", qarz: "қарз",
  omonat: "омонат", omonatlar: "омонатлар",
  karta: "карта", kartalar: "карталар",
  bank: "банк", foiz: "фоиз", tolov: "тўлов", tolovlar: "тўловлар",
  // Mahalla terms
  mahalla: "маҳалла", mahallalar: "маҳаллалар",
  mahallasi: "маҳалласи", mahallada: "маҳаллада",
  tuman: "туман", tumanlar: "туманлар",
  aholi: "аҳоли", xonadon: "хонадон", oila: "оила", oilalar: "оилалар",
  tadbirkor: "тадбиркор", tadbirkorlar: "тадбиркорлар",
  tadbirkorlik: "тадбиркорлик",
  ishsiz: "ишсиз", ishsizlar: "ишсизлар", ishsizlik: "ишсизлик",
  kambagal: "камбағал", kambagallar: "камбағаллар",
  bankir: "банкир", bankirlar: "банкирлар",
  agent: "агент", agentlar: "агентлар",
  // Document types
  tezis: "тезис", hujjat: "ҳужжат", pasport: "паспорт",
  // Common words
  yil: "йил", oy: "ой", soni: "сони", miqdor: "миқдор",
  nomi: "номи", raqam: "рақам", holat: "ҳолат",
  // Place names
  toshkent: "тошкент", chilonzor: "чилонзор",
  mirobod: "миробод", shayxontohur: "шайхонтоҳур",
  yunusota: "юнусота", yangikamolon: "янгикамолон",
  chorsu: "чорсу", bogbon: "боғбон",
  mirzoulugbek: "мирзоулуғбек", yakkasaroy: "яккасарой",
  // Cyrillic abbreviations
  bxm: "бхм", mfy: "мфй",
};

/** Expand query tokens with Cyrillic equivalents for cross-script search */
export function expandTerms(tokens) {
  const extra = [];
  for (const t of tokens) {
    if (UZ_LAT_CYR[t]) extra.push(UZ_LAT_CYR[t]);
  }
  return [...new Set([...tokens, ...extra])];
}

/**
 * Search for relevant chunks using TF-IDF (IDF) scoring.
 * @param {string} query
 * @param {number} topK
 * @returns {Promise<Array<{text, source, folder, score}>>}
 */
export async function ragSearch(query, topK = 5) {
  const idx = await loadIndex();
  const { chunks, index: invertedIndex, N } = idx;

  const queryTokens = expandTerms(tokenize(query));
  if (!queryTokens.length) return [];

  const scores = {};
  for (const term of queryTokens) {
    const postings = invertedIndex[term];
    if (!postings?.length) continue;
    const idf = Math.log(N / postings.length + 1);
    for (const ci of postings) {
      scores[ci] = (scores[ci] || 0) + idf;
    }
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([ci, score]) => ({
      text: chunks[ci].text,
      source: chunks[ci].source,
      folder: chunks[ci].folder,
      score: Math.round(score * 100) / 100,
    }));
}

/** Format RAG results into a context string for the prompt */
export function formatRagContext(results) {
  if (!results.length) return "";
  const lines = ["=== BANK MA'LUMOTLAR BAZASI (RAG) ==="];
  for (const r of results) {
    lines.push(`\n[Manba: ${r.source}]`);
    lines.push(r.text);
  }
  return lines.join("\n");
}
