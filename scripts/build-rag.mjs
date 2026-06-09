/**
 * RAG Database Builder — optimized with inverted index + deduplication
 * Extracts text from all docx/pptx files in data-bank/
 * Also indexes structured JSON data (kreditlar, omonatlar, kartalar, tumanlar)
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import officeParser from "officeparser";
import crypto from "node:crypto";
import { tokenize } from "../api/lib/rag.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataBankDir = path.join(rootDir, "data-bank");
const publicDataDir = path.join(rootDir, "public", "data");
const outputDir = path.join(rootDir, "data");
const outputPath = path.join(outputDir, "rag-index.json");

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 80;
const MIN_CHUNK_LEN = 60;

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === ".docx" || ext === ".pptx" || ext === ".txt") files.push(full);
    }
  }
  return files;
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt") {
    try {
      return (await readFile(filePath, "utf8")).trim();
    } catch (e) {
      console.warn(`  ⚠ Skipping ${path.basename(filePath)}: ${e.message?.slice(0, 80)}`);
      return "";
    }
  }
  try {
    const buf = await readFile(filePath);
    const ast = await officeParser.parseOffice(buf, {
      newlineDelimiter: "\n",
      ignoreNotes: false,
      outputErrorToConsole: false,
    });
    return ast.toText().trim();
  } catch (e) {
    console.warn(`  ⚠ Skipping ${path.basename(filePath)}: ${e.message?.slice(0, 80)}`);
    return "";
  }
}

function chunkText(text) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length >= MIN_CHUNK_LEN) chunks.push(chunk);
    if (end >= text.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

function contentHash(text) {
  return crypto.createHash("md5").update(text.slice(0, 200)).digest("hex").slice(0, 8);
}

/** JSON ma'lumotlarini RAG chunklarga o'giruvchi funksiyalar */

function kreditToText(k) {
  const talab = Array.isArray(k.talab) ? k.talab.join(", ") : k.talab || "";
  const hujjatlar = Array.isArray(k.hujjatlar) ? k.hujjatlar.join(", ") : k.hujjatlar || "";
  return [
    `Kredit mahsuloti: ${k.nomi}`,
    `Valyuta: ${k.valyuta}`,
    `Muddat: ${k.muddat}`,
    `Miqdor: ${k.miqdor}`,
    `Foiz stavkasi: ${k.foiz}`,
    `Talab: ${talab}`,
    `Hujjatlar: ${hujjatlar}`,
    `Kafolat: ${k.kafolat}`,
    `Imtiyozli davr: ${k.imtiyozli_davr}`,
    k.izoh ? `Izoh: ${k.izoh}` : "",
  ].filter(Boolean).join("\n");
}

function omonatToText(o) {
  return [
    `Omonat mahsuloti: ${o.nomi}`,
    `Valyuta: ${o.valyuta}`,
    `Muddat: ${o.muddat}`,
    `Foiz stavkasi: ${o.stavka}`,
    `Minimal miqdor: ${o.minimal_miqdor}`,
    `To'ldirish mumkinmi: ${o["toʻldirish"] || o.toldirish || ""}`,
    `Qisman chiqim: ${o.qisman_chiqim}`,
    `Muddatdan avval yopish: ${o.muddatdan_avval_yopish}`,
    `Onlayn ochish: ${o.onlayn_ochish}`,
    o.izoh ? `Izoh: ${o.izoh}` : "",
  ].filter(Boolean).join("\n");
}

function kartaToText(k) {
  const xususiyatlar = Array.isArray(k.xususiyatlar) ? k.xususiyatlar.join(", ") : k.xususiyatlar || "";
  return [
    `Bank kartasi: ${k.nomi}`,
    `Turi: ${k.turi}`,
    `To'lov tizimi: ${k.tizim}`,
    `Valyuta: ${k.valyuta}`,
    `Amal muddati: ${k.amal_muddati}`,
    `Chiqarish narxi: ${k.chiqarish_narxi}`,
    `Yillik xizmat: ${k.yillik_xizmat}`,
    `Cashback: ${k.cashback}`,
    `Xususiyatlar: ${xususiyatlar}`,
    k.izoh ? `Izoh: ${k.izoh}` : "",
  ].filter(Boolean).join("\n");
}

function mahallaTumanToText(mahalla, tumanNom) {
  return [
    `Mahalla: ${mahalla.nom} (${tumanNom})`,
    `Aholi: ${mahalla.aholi} kishi`,
    `Xonadon soni: ${mahalla.xonadon} ta`,
    `Tadbirkor — boshida: ${mahalla.tadbirkor_bosh}, hozir: ${mahalla.tadbirkor_hozir}`,
    `Ishsizlik — boshida: ${mahalla.ishsizlik_bosh}, hozir: ${mahalla.ishsizlik_hozir}`,
    `Kambag'al oila — boshida: ${mahalla.kambagal_bosh}, hozir: ${mahalla.kambagal_hozir}`,
    mahalla.bank ? `Bank filiali: ${mahalla.bank}` : "",
    mahalla.bankir ? `Mahalla bankiri: ${mahalla.bankir}` : "",
    mahalla.agent ? `Mahalla agenti: ${mahalla.agent}` : "",
    mahalla.ixtisoslik ? `Ixtisoslik: ${mahalla.ixtisoslik}` : "",
  ].filter(Boolean).join("\n");
}

async function processJsonFiles(seenHashes, chunks, invertedIndex) {
  let added = 0;

  const jsonFiles = [
    { file: "kreditlar.json", category: "kreditlar", toText: kreditToText },
    { file: "omonatlar.json", category: "omonatlar", toText: omonatToText },
    { file: "kartalar.json", category: "kartalar", toText: kartaToText },
  ];

  for (const { file, category, toText } of jsonFiles) {
    const filePath = path.join(publicDataDir, file);
    let items;
    try {
      const raw = await readFile(filePath, "utf8");
      items = JSON.parse(raw);
    } catch (e) {
      console.warn(`  ⚠ ${file} o'qilmadi: ${e.message?.slice(0, 80)}`);
      continue;
    }

    let count = 0;
    for (const item of items) {
      const text = toText(item).trim();
      if (!text || text.length < MIN_CHUNK_LEN) continue;

      const hash = contentHash(text);
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);

      const idx = chunks.length;
      chunks.push({ source: `public/data/${file}`, folder: category, text });

      const terms = new Set(tokenize(text));
      for (const term of terms) {
        if (!invertedIndex[term]) invertedIndex[term] = [];
        invertedIndex[term].push(idx);
      }
      count++;
      added++;
    }
    console.log(`  ✓ ${file}: ${count} ta chunk qo'shildi`);
  }

  // tumanlar.json — har bir mahalla alohida chunk
  const tumanlarPath = path.join(publicDataDir, "tumanlar.json");
  let tumanlar;
  try {
    const raw = await readFile(tumanlarPath, "utf8");
    tumanlar = JSON.parse(raw);
  } catch (e) {
    console.warn(`  ⚠ tumanlar.json o'qilmadi: ${e.message?.slice(0, 80)}`);
    return added;
  }

  let tumanCount = 0;
  for (const tuman of tumanlar) {
    if (!Array.isArray(tuman.mahallalar)) continue;
    for (const mahalla of tuman.mahallalar) {
      const text = mahallaTumanToText(mahalla, tuman.nom).trim();
      if (!text || text.length < MIN_CHUNK_LEN) continue;

      const hash = contentHash(text);
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);

      const idx = chunks.length;
      chunks.push({ source: "public/data/tumanlar.json", folder: tuman.id || "tumanlar", text });

      const terms = new Set(tokenize(text));
      for (const term of terms) {
        if (!invertedIndex[term]) invertedIndex[term] = [];
        invertedIndex[term].push(idx);
      }
      tumanCount++;
      added++;
    }
  }
  console.log(`  ✓ tumanlar.json: ${tumanCount} ta mahalla chunk qo'shildi`);

  return added;
}

async function main() {
  // Ensure output dir
  const { mkdirSync } = await import("node:fs");
  mkdirSync(outputDir, { recursive: true });

  console.log("🔍 RAG Database Builder (optimized)\n");
  const allFiles = await collectFiles(dataBankDir);
  console.log(`Found ${allFiles.length} files\n`);

  const seenHashes = new Set();
  const chunks = []; // {id, source, folder, text}
  const invertedIndex = {}; // term -> Set of chunk indices

  let fileCount = 0;
  let skippedDup = 0;

  for (const filePath of allFiles) {
    const relativePath = path.relative(dataBankDir, filePath).replace(/\\/g, "/");
    const folder = path.dirname(relativePath);
    const basename = path.basename(filePath);

    process.stdout.write(`[${++fileCount}/${allFiles.length}] ${basename}...`);

    const text = await extractText(filePath);
    if (!text) { console.log(" empty"); continue; }

    // Deduplicate by content hash
    const hash = contentHash(text);
    if (seenHashes.has(hash)) {
      console.log(" duplicate, skipped");
      skippedDup++;
      continue;
    }
    seenHashes.add(hash);

    const fileChunks = chunkText(text);
    let added = 0;

    for (const chunkText of fileChunks) {
      const idx = chunks.length;
      chunks.push({ source: relativePath, folder, text: chunkText });

      // Build inverted index
      const terms = new Set(tokenize(chunkText));
      for (const term of terms) {
        if (!invertedIndex[term]) invertedIndex[term] = [];
        invertedIndex[term].push(idx);
      }
      added++;
    }
    console.log(` ${added} chunks`);
  }

  // JSON ma'lumotlarini RAG ga qo'shish
  console.log("\n📋 JSON ma'lumotlarini indekslash...");
  const jsonAdded = await processJsonFiles(seenHashes, chunks, invertedIndex);
  console.log(`   Jami JSON chunklari: ${jsonAdded}\n`);

  // Filter: drop terms in >90% of chunks (pure stop words) or appearing only once
  const maxDf = Math.floor(chunks.length * 0.9);
  const filteredIndex = {};
  for (const [term, indices] of Object.entries(invertedIndex)) {
    if (indices.length >= 2 && indices.length <= maxDf) {
      filteredIndex[term] = indices;
    }
  }

  const N = chunks.length; // total docs for IDF calculation
  const output = {
    version: "2.0",
    buildDate: new Date().toISOString(),
    totalChunks: chunks.length,
    totalFiles: fileCount - skippedDup,
    duplicatesSkipped: skippedDup,
    N,
    chunks,
    index: filteredIndex,
  };

  const json = JSON.stringify(output);
  await writeFile(outputPath, json, "utf8");

  const sizeMB = (json.length / 1024 / 1024).toFixed(2);
  console.log(`\n✅ RAG database built:`);
  console.log(`   Files: ${fileCount - skippedDup} (${skippedDup} duplicates skipped)`);
  console.log(`   Chunks: ${chunks.length}`);
  console.log(`   Index terms: ${Object.keys(filteredIndex).length}`);
  console.log(`   Size: ${sizeMB} MB → ${outputPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
