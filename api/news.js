import * as cheerio from "cheerio";

const BASE = "https://turonbank.uz";

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; TuronBankFAQ/1.0)",
      accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Faqat GET." });

  try {
    const html = await fetchHtml(`${BASE}/uz/press_center/news/`);
    const $ = cheerio.load(html);
    const articles = [];

    $(".news-list .news-item, .news-item, article.item, .b-news-item").each((_, el) => {
      const $el = $(el);
      const title =
        $el.find("h2, h3, .title, .news-title").first().text().trim() ||
        $el.find("a").first().text().trim();
      const href = $el.find("a[href]").first().attr("href");
      const date = $el.find("time, .date, .news-date").first().text().trim();
      const img = $el.find("img").first().attr("src");

      if (title && href) {
        articles.push({
          title,
          url: href.startsWith("http") ? href : `${BASE}${href}`,
          date,
          img: img ? (img.startsWith("http") ? img : `${BASE}${img}`) : null,
        });
      }
    });

    // fallback: og'irroq selektor
    if (articles.length === 0) {
      $("a[href*='/press_center/news/']").each((_, el) => {
        const $el = $(el);
        const title = $el.text().trim();
        const href = $el.attr("href");
        if (title.length > 20 && href) {
          articles.push({
            title,
            url: href.startsWith("http") ? href : `${BASE}${href}`,
            date: "",
            img: null,
          });
        }
      });
    }

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate");
    res.status(200).json({ articles: articles.slice(0, 20) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
