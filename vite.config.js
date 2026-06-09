import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { formidable } from "formidable";
import officeParser from "officeparser";
import { ragSearch, formatRagContext } from "./api/lib/rag.js";
import { callOpenRouter } from "./api/lib/openrouter.js";

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfWorkerSrc = pathToFileURL(
  path.join(__dirname, "node_modules", "officeparser", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs")
).href;

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function parseUpload(request) {
  const form = formidable({ maxFileSize: 25 * 1024 * 1024, multiples: false, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(request, (error, fields, files) => {
      if (error) { reject(error); return; }
      const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;
      resolve({ fields, file: uploaded });
    });
  });
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readUploadedFile(file) {
  if (!file?.filepath) throw new Error("Fayl topilmadi.");
  const originalName = file.originalFilename || file.newFilename || "uploaded-file";
  const extension = path.extname(originalName).toLowerCase();
  const officeExtensions = new Set([".pdf", ".docx", ".pptx", ".xlsx", ".odt", ".odp", ".ods", ".rtf"]);

  if (officeExtensions.has(extension)) {
    const fileBuffer = await readFile(file.filepath);
    const ast = await officeParser.parseOffice(fileBuffer, {
      newlineDelimiter: "\n",
      ignoreNotes: false,
      putNotesAtLast: true,
      outputErrorToConsole: false,
      pdfWorkerSrc,
    });
    return ast.toText();
  }

  const text = await readFile(file.filepath, "utf8");
  const clean = text.replace(/\u0000/g, " ").trim();
  if (clean) return clean;
  throw new Error("Bu fayldan matn ajratib bo'lmadi.");
}

function devApiPlugin({ apiKey } = {}) {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/read-file", async (request, response) => {
        if (request.method !== "POST") { sendJson(response, 405, { error: "Faqat POST." }); return; }
        try {
          const { file } = await parseUpload(request);
          const text = (await readUploadedFile(file)).trim();
          if (!text) { sendJson(response, 400, { error: "Fayldan matn ajratib bo'lmadi." }); return; }
          sendJson(response, 200, { fileName: file.originalFilename || "uploaded-file", text, size: file.size || 0 });
        } catch (error) {
          sendJson(response, 400, { error: error.message || "Faylni o'qishda xatolik." });
        }
      });

      server.middlewares.use("/api/tags", (request, response) => {
        if (request.method !== "GET") { sendJson(response, 405, { error: "Faqat GET." }); return; }
        sendJson(response, 200, { models: [{ name: DEFAULT_MODEL, model: DEFAULT_MODEL }] });
      });

      server.middlewares.use("/api/generate", async (request, response) => {
        if (request.method !== "POST") { sendJson(response, 405, { error: "Faqat POST." }); return; }
        if (!apiKey) {
          sendJson(response, 500, { error: "OPENROUTER_API_KEY sozlanmagan. .env.local fayliga qo'shing." });
          return;
        }
        try {
          const body = JSON.parse(await readRequestBody(request));

          // RAG: enrich prompt with relevant chunks
          let ragContext = "";
          const userQuery = body.ragQuery || (body.prompt || "").slice(-200);
          if (userQuery) {
            const results = await ragSearch(userQuery, 5).catch(() => []);
            ragContext = formatRagContext(results);
          }

          const finalPrompt = ragContext
            ? `${ragContext}\n\n---\n\n${body.prompt || ""}`
            : body.prompt || "";

          const aiResponse = await callOpenRouter({
            apiKey,
            model: body.model || DEFAULT_MODEL,
            prompt: finalPrompt,
            options: body.options,
            stream: body.stream !== false,
            referer: "http://localhost:5173",
          });

          if (!aiResponse.ok) {
            const data = await aiResponse.json().catch(() => ({}));
            sendJson(response, aiResponse.status, {
              error: aiResponse.status === 429
                ? "AI hozir band (bepul model navbati). Bir necha soniyadan so'ng qayta urinib ko'ring."
                : data.error?.message || `OpenRouter xatolik qaytardi (${aiResponse.status}).`,
            });
            return;
          }

          if (body.stream !== false) {
            response.setHeader("Content-Type", "text/event-stream");
            response.setHeader("Cache-Control", "no-cache");
            response.setHeader("Connection", "keep-alive");
            const reader = aiResponse.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              response.write(decoder.decode(value, { stream: true }));
            }
            response.end();
          } else {
            const data = await aiResponse.json();
            sendJson(response, 200, {
              response: data.choices?.[0]?.message?.content?.trim() || "AI javob qaytarmadi.",
              model: data.model || body.model || DEFAULT_MODEL,
              usage: data.usage || null,
            });
          }
        } catch (error) {
          const msg = error.message || "";
          const friendly = msg.includes("ECONNREFUSED") || msg.includes("fetch failed")
            ? "AI serverga ulanib bo'lmadi. Internet aloqasini tekshiring."
            : msg || "Xatolik yuz berdi.";
          sendJson(response, 500, { error: friendly });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || "";
  return {
    plugins: [devApiPlugin({ apiKey }), react()],
  };
});
