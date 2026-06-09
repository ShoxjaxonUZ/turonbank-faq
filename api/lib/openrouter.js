/**
 * OpenRouter API chaqiruvi — 429/503 (rate-limit) holatida avtomatik qayta urinish bilan.
 * Bepul (`:free`) modellar umumiy navbatga ega bo'lgani uchun vaqtinchalik 429 qaytishi normal —
 * provayder "retry shortly" deydi, shuning uchun Retry-After bo'yicha qayta uriniladi.
 *
 * generate.js (Vercel) va vite.config.js (dev server) birgalikda ishlatadi.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_ATTEMPTS = 4;
const MAX_WAIT_SEC = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function callOpenRouter({ apiKey, model, prompt, options = {}, stream = true, referer }) {
  const body = JSON.stringify({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: options.temperature ?? 0.2,
    top_p: options.top_p ?? 0.85,
    max_tokens: Math.max(options.num_predict ?? 800, 200),
    stream,
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": referer || "https://turon-bank.vercel.app",
    "X-Title": "Turonbank Mahalla Portali",
  };

  let last;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    last = await fetch(OPENROUTER_URL, { method: "POST", headers, body });
    if (last.ok) return last;

    const retryable = last.status === 429 || last.status === 503;
    if (!retryable || attempt === MAX_ATTEMPTS) return last;

    // Drain the error body so the connection is freed before retrying
    await last.arrayBuffer().catch(() => {});
    const retryAfter = Number(last.headers.get("retry-after")) || 4;
    await sleep(Math.min(retryAfter, MAX_WAIT_SEC) * 1000);
  }
  return last;
}
