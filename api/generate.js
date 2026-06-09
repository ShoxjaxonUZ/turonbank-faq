import { ragSearch, formatRagContext } from "./lib/rag.js";
import { callOpenRouter } from "./lib/openrouter.js";

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Faqat POST so'rovi qabul qilinadi." });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "OPENROUTER_API_KEY sozlanmagan. Vercel → Settings → Environment Variables ga qo'shing.",
    });
  }

  try {
    const body = req.body;
    const stream = body.stream !== false;

    // RAG: enrich prompt with relevant document chunks
    let ragContext = "";
    const userQuery = body.ragQuery || extractUserQuery(body.prompt);
    if (userQuery) {
      try {
        const results = await ragSearch(userQuery, 5);
        ragContext = formatRagContext(results);
      } catch (e) {
        console.warn("RAG search failed:", e.message);
      }
    }

    // Inject RAG context before the main prompt
    const finalPrompt = ragContext
      ? `${ragContext}\n\n---\n\n${body.prompt || ""}`
      : body.prompt || "";

    const aiResponse = await callOpenRouter({
      apiKey,
      model: body.model || DEFAULT_MODEL,
      prompt: finalPrompt,
      options: body.options,
      stream,
      referer: process.env.OPENROUTER_SITE_URL || "https://turon-bank.vercel.app",
    });

    if (!aiResponse.ok) {
      const data = await aiResponse.json().catch(() => ({}));
      const statusCode = aiResponse.status;
      const errorMsg = statusCode === 429
        ? "AI hozir band (bepul model navbati). Bir necha soniyadan so'ng qayta urinib ko'ring."
        : data.error?.message || data.message || `OpenRouter xatolik qaytardi (${statusCode}).`;
      return res.status(statusCode).json({ error: errorMsg });
    }

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = aiResponse.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await aiResponse.json();
      res.status(200).json({
        response: data.choices?.[0]?.message?.content?.trim() || "AI javob qaytarmadi.",
        model: data.model || body.model,
        usage: data.usage || null,
      });
    }
  } catch (error) {
    const msg = error.message || "";
    const friendly = msg.includes("ECONNREFUSED") || msg.includes("fetch failed")
      ? "AI serverga ulanib bo'lmadi. Internet aloqasini tekshiring va qayta urining."
      : msg || "Server xatoligi yuz berdi.";
    res.status(500).json({ error: friendly });
  }
}

/** Extract the actual user question from the full prompt */
function extractUserQuery(prompt) {
  if (!prompt) return "";
  // Last line containing "Foydalanuvchi:" or just take last 200 chars
  const match = prompt.match(/Foydalanuvchi:\s*(.+)$/m);
  if (match) return match[1].trim();
  return prompt.slice(-200);
}
