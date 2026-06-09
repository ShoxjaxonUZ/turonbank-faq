const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Faqat GET so'rovi qabul qilinadi." });
  }
  res.status(200).json({
    models: [{ name: DEFAULT_MODEL, model: DEFAULT_MODEL }],
  });
}
