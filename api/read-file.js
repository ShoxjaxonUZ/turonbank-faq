import { IncomingForm } from "formidable";
import { readFile } from "node:fs/promises";
import path from "node:path";
import officeParser from "officeparser";

export const config = {
  api: { bodyParser: false },
};

function parseUpload(req) {
  const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      resolve(file);
    });
  });
}

async function extractText(file) {
  if (!file?.filepath) throw new Error("Fayl topilmadi.");

  const originalName = file.originalFilename || file.newFilename || "file";
  const ext = path.extname(originalName).toLowerCase();
  const officeExts = new Set([".pdf", ".docx", ".pptx", ".xlsx", ".odt", ".odp", ".ods", ".rtf"]);

  if (officeExts.has(ext)) {
    const buf = await readFile(file.filepath);
    const ast = await officeParser.parseOffice(buf, {
      newlineDelimiter: "\n",
      ignoreNotes: false,
      outputErrorToConsole: false,
    });
    return ast.toText();
  }

  const text = await readFile(file.filepath, "utf8");
  const clean = text.replace(/\u0000/g, " ").trim();
  if (clean) return clean;

  throw new Error("Bu fayldan matn ajratib bo'lmadi.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Faqat POST so'rovi qabul qilinadi." });
  }

  try {
    const file = await parseUpload(req);
    const text = (await extractText(file)).trim();
    if (!text) return res.status(400).json({ error: "Fayldan matn ajratib bo'lmadi." });

    res.status(200).json({
      fileName: file.originalFilename || "uploaded-file",
      text,
      size: file.size || 0,
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Faylni o'qishda xatolik." });
  }
}
