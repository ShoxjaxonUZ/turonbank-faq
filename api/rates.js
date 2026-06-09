export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Faqat GET." });
  }

  try {
    const response = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/", {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) throw new Error("CBU API javob bermadi.");

    const data = await response.json();

    const keraklilar = ["USD", "EUR", "RUB", "GBP", "CNY", "KZT", "TRY", "JPY", "AED"];
    const filtered = data
      .filter((item) => keraklilar.includes(item.Ccy))
      .map((item) => ({
        kod: item.Ccy,
        nom: item.CcyNm_UZ,
        kurs: item.Rate,
        diff: item.Diff,
        sana: item.Date,
      }));

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).json({ rates: filtered, sana: data[0]?.Date || "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
