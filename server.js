/**
 * Turonbank FAQ — standalone backend server.
 *
 * Vercel serverless funksiyalarini (`api/*.js`) oddiy Node serverida ishlatadi.
 * Railway / Render / Fly.io / o'z VPS'ingizda `npm start` bilan ishga tushadi.
 *
 * Vercel handler'lari (req, res) imzosi Express bilan mos — shuning uchun ular
 * to'g'ridan-to'g'ri route handler sifatida ulanadi.
 */

import express from "express";
import cors from "cors";

import generate from "./api/generate.js";
import news from "./api/news.js";
import rates from "./api/rates.js";
import tags from "./api/tags.js";
import readFile from "./api/read-file.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ────────────────────────────────────────────────
// CORS_ORIGIN — vergul bilan ajratilgan ruxsat etilgan domenlar.
// Masalan: "https://turon-bank.vercel.app,https://turonbank.uz"
// Belgilanmasa, barcha domenlarga ruxsat beriladi ("*").
const allowed = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowed.includes("*") ? true : allowed,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// ── Body parsing ────────────────────────────────────────
// /api/read-file multipart (formidable) bo'lgani uchun JSON parser'dan chetlatamiz.
app.use((req, res, next) => {
  if (req.path === "/api/read-file") return next();
  express.json({ limit: "2mb" })(req, res, next);
});

// ── Health check ────────────────────────────────────────
app.get("/", (req, res) =>
  res.json({ ok: true, service: "turonbank-faq-api", time: new Date().toISOString() })
);
app.get("/health", (req, res) => res.status(200).send("OK"));

// ── API routes ──────────────────────────────────────────
app.post("/api/generate", generate);
app.get("/api/news", news);
app.get("/api/rates", rates);
app.get("/api/tags", tags);
app.post("/api/read-file", readFile);

app.listen(PORT, () => {
  console.log(`✅ Turonbank API server ishlamoqda: http://localhost:${PORT}`);
  console.log(`   CORS: ${allowed.includes("*") ? "barcha domenlar (*)" : allowed.join(", ")}`);
});
