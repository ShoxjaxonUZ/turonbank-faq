import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'information');
const baseUrl = 'https://turonbank.uz';
const sitemapUrl = `${baseUrl}/uz/sitemap.xml`;
const pressCenterUrl = `${baseUrl}/uz/press_center/`;
const maxListingPages = Number(process.env.TURONBANK_MAX_LISTING_PAGES ?? 80);
const maxArticles = Number(process.env.TURONBANK_MAX_ARTICLES ?? 0);
const concurrency = Number(process.env.TURONBANK_CONCURRENCY ?? 2);
const requestDelayMs = Number(process.env.TURONBANK_REQUEST_DELAY_MS ?? 300);
const allowedCategories = new Set(
  (process.env.TURONBANK_PRESS_CATEGORIES ?? 'news,events,about-us,adverts,action')
    .split(',')
    .map((category) => category.trim())
    .filter(Boolean)
);

const headers = {
  'user-agent':
    'Mozilla/5.0 (compatible; TuronBankNewsScraper/1.0; +https://turonbank.uz/)',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

async function fetchText(url) {
  let lastError;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers, redirect: 'follow' });

      if (response.ok) {
        return response.text();
      }

      lastError = new Error(`${response.status} ${response.statusText}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(requestDelayMs * attempt * 2);
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(href, parentUrl = baseUrl) {
  try {
    const url = new URL(href, parentUrl);

    if (url.hostname !== 'turonbank.uz') return null;
    url.hash = '';

    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|bxajaxid|clear_cache|PAGEN|print|action)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isPressCenterUrl(url) {
  try {
    return new URL(url).pathname.startsWith('/uz/press_center/');
  } catch {
    return false;
  }
}

function isArticleUrl(url) {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split('/').filter(Boolean);
    const lastPart = parts.at(-1) ?? '';

    return (
      parts[0] === 'uz' &&
      parts[1] === 'press_center' &&
      allowedCategories.has(parts[2]) &&
      parts.length >= 4 &&
      !lastPart.includes('.') &&
      !/^(page-\d+|\d+)$/i.test(lastPart)
    );
  } catch {
    return false;
  }
}

function extractLocs(xml) {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi), (match) =>
    match[1].trim()
  );
}

async function collectFromSitemap(url, seen = new Set()) {
  if (seen.has(url)) return [];
  seen.add(url);

  const xml = await fetchText(url);
  const locs = extractLocs(xml);
  const nestedSitemaps = locs.filter((loc) => loc.endsWith('.xml'));
  const urls = locs.filter(isPressCenterUrl);

  for (const nestedUrl of nestedSitemaps) {
    if (isPressCenterUrl(nestedUrl) || nestedUrl.includes('/uz/sitemap-')) {
      urls.push(...(await collectFromSitemap(nestedUrl, seen)));
    }
  }

  return urls;
}

function extractLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = new Set();

  $('a[href]').each((_, element) => {
    const normalized = normalizeUrl($(element).attr('href'), pageUrl);
    if (normalized) links.add(normalized);
  });

  return [...links];
}

async function collectFromPressCenter() {
  const queue = [pressCenterUrl];
  const visited = new Set();
  const articleUrls = new Set();

  while (queue.length > 0 && visited.size < maxListingPages) {
    const pageUrl = queue.shift();
    if (!pageUrl || visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    try {
      const html = await fetchText(pageUrl);
      const links = extractLinks(html, pageUrl).filter(isPressCenterUrl);

      for (const link of links) {
        if (isArticleUrl(link)) {
          articleUrls.add(link);
        } else if (!visited.has(link) && queue.length < maxListingPages) {
          queue.push(link);
        }
      }
    } catch (error) {
      console.warn(`Listing o'qilmadi: ${pageUrl} (${error.message})`);
    }
  }

  return [...articleUrls];
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function firstText($, selectors) {
  for (const selector of selectors) {
    const text = cleanText($(selector).first().text());
    if (text) return text;
  }

  return '';
}

function extractArticle(html, url) {
  const $ = cheerio.load(html);

  $('script, style, noscript, svg, iframe, form, header, footer, nav, aside').remove();
  $('.breadcrumb, .breadcrumbs, .pagination, .share, .social, .menu, .sidebar').remove();

  const title =
    firstText($, ['h1', '.news-detail h2', '.detail h1']) ||
    cleanText($('meta[property="og:title"]').attr('content')) ||
    cleanText($('title').text()).replace(/\s+-\s+.*$/, '');

  const date =
    firstText($, ['time', '.date', '.news-date-time', '.news-item-date']) ||
    cleanText($('meta[property="article:published_time"]').attr('content')) ||
    cleanText(html.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/)?.[0]);

  const contentRoot = $(
    [
      'article',
      '.news-detail',
      '.news-detail-text',
      '.detail-text',
      '.content',
      'main',
      'body',
    ].join(', ')
  ).first();

  const paragraphs = [];
  contentRoot.find('h2, h3, p, li').each((_, element) => {
    const text = cleanText($(element).text());
    if (text && text !== title && !paragraphs.includes(text)) {
      paragraphs.push(text);
    }
  });

  let body = paragraphs.join('\n\n');
  if (!body) {
    body = cleanText(contentRoot.text());
  }

  body = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^(Bosh sahifa|Matbuot markazi|Yangiliklar)$/i.test(line))
    .join('\n');

  return {
    url,
    title: title || url,
    date,
    body: cleanText(body),
  };
}

async function mapLimit(items, limit, mapper) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await sleep(requestDelayMs);
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function scrapeArticles(urls) {
  const articles = await mapLimit(urls, concurrency, async (url, index) => {
    try {
      console.log(`[${index + 1}/${urls.length}] ${url}`);
      const html = await fetchText(url);
      return extractArticle(html, url);
    } catch (error) {
      console.warn(`Maqola o'qilmadi: ${url} (${error.message})`);
      return null;
    }
  });

  return articles
    .filter(Boolean)
    .filter((article) => article.title || article.body)
    .sort((a, b) => a.url.localeCompare(b.url));
}

function addWrappedText(doc, text, options = {}) {
  doc.text(text, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: 'left',
    ...options,
  });
}

async function writePdf(articles, filePath) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    bufferPages: true,
    info: {
      Title: 'Turonbank yangiliklari',
      Author: 'Turonbank scraper',
      Subject: 'https://turonbank.uz/ saytidagi press-center yangiliklari',
    },
  });

  const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
  const boldFontPath = 'C:\\Windows\\Fonts\\arialbd.ttf';
  doc.registerFont('Regular', fontPath);
  doc.registerFont('Bold', boldFontPath);

  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  doc.font('Bold').fontSize(20).text('Turonbank yangiliklari', { align: 'center' });
  doc.moveDown(0.5);
  doc
    .font('Regular')
    .fontSize(10)
    .text(`Manba: ${baseUrl}/`, { align: 'center' })
    .text(`Yaratilgan vaqt: ${new Date().toLocaleString('uz-UZ')}`, { align: 'center' })
    .text(`Topilgan maqolalar: ${articles.length}`, { align: 'center' });

  doc.addPage();
  doc.font('Bold').fontSize(16).text('Mundarija');
  doc.moveDown();

  articles.forEach((article, index) => {
    doc.font('Regular').fontSize(9);
    addWrappedText(doc, `${index + 1}. ${article.title}`);
  });

  for (const [index, article] of articles.entries()) {
    doc.addPage();
    doc.font('Bold').fontSize(15);
    addWrappedText(doc, `${index + 1}. ${article.title}`);

    if (article.date) {
      doc.moveDown(0.3);
      doc.font('Regular').fontSize(9).fillColor('#555555');
      addWrappedText(doc, article.date);
      doc.fillColor('#000000');
    }

    doc.moveDown(0.4);
    doc.font('Regular').fontSize(8).fillColor('#1f4f82');
    addWrappedText(doc, article.url);
    doc.fillColor('#000000');
    doc.moveDown();

    doc.font('Regular').fontSize(10);
    addWrappedText(doc, article.body || 'Matn topilmadi.', { lineGap: 3 });
  }

  const pageRange = doc.bufferedPageRange();
  for (let i = pageRange.start; i < pageRange.start + pageRange.count; i += 1) {
    doc.switchToPage(i);
    doc.font('Regular').fontSize(8).fillColor('#777777');
    doc.text(`Sahifa ${i + 1} / ${pageRange.count}`, 48, doc.page.height - 36, {
      align: 'center',
      width: doc.page.width - 96,
    });
    doc.fillColor('#000000');
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  console.log("Sitemapdan URL yig'ilyapti...");
  const sitemapUrls = await collectFromSitemap(sitemapUrl).catch((error) => {
    console.warn(`Sitemap o'qilmadi: ${error.message}`);
    return [];
  });

  console.log("Press-center sahifalaridan URL yig'ilyapti...");
  const crawledUrls = await collectFromPressCenter();

  let articleUrls = [...new Set([...sitemapUrls, ...crawledUrls].filter(isArticleUrl))];

  if (maxArticles > 0) {
    articleUrls = articleUrls.slice(0, maxArticles);
  }

  console.log(`${articleUrls.length} ta maqola URL topildi.`);

  if (articleUrls.length === 0) {
    throw new Error(
      "Maqola URL topilmadi. Sayt vaqtincha ulanmayotgan bo'lishi mumkin; keyinroq qayta urinib ko'ring."
    );
  }

  const articles = await scrapeArticles(articleUrls);

  if (articles.length === 0) {
    throw new Error(
      "Birorta maqola o'qilmadi. Mavjud PDF/manifest ustidan yozilmasligi uchun jarayon to'xtatildi."
    );
  }

  const pdfPath = path.join(outputDir, 'turonbank-news.pdf');
  const manifestPath = path.join(outputDir, 'news-urls.json');

  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        source: baseUrl,
        generatedAt: new Date().toISOString(),
        count: articles.length,
        urls: articles.map((article) => article.url),
      },
      null,
      2
    ),
    'utf8'
  );

  await writePdf(articles, pdfPath);

  console.log(`PDF tayyor: ${pdfPath}`);
  console.log(`URL ro'yxati: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
