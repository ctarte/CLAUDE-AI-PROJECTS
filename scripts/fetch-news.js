import Parser from "rss-parser";
import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { categories } from "./sources.js";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "CII-Global-Morning-Brief/1.0 (+https://github.com)" },
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"]
    ]
  }
});

const ARTICLES_PER_CATEGORY = 5;

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, max = 200) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function extractImage(item) {
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  if (item.enclosure?.url) return item.enclosure.url;
  const source = item.contentEncoded || item.content || "";
  const match = source.match(/<img[^>]+src=["']([^"'>]+)["']/i);
  return match ? match[1] : null;
}

function makeId(url) {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

async function fetchFeed(feedUrl) {
  try {
    const feed = await parser.parseURL(feedUrl);
    const sourceName = feed.title ? feed.title.split(" | ")[0].split(" - ")[0].trim() : hostnameOf(feedUrl);
    return (feed.items || []).map((item) => ({
      title: stripHtml(item.title || "").trim(),
      url: item.link,
      source: sourceName,
      sourceUrl: `https://${hostnameOf(feedUrl)}`,
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      summary: truncate(stripHtml(item.contentSnippet || item.content || item.summary || "")),
      image: extractImage(item)
    }));
  } catch (err) {
    console.warn(`[warn] failed to fetch ${feedUrl}: ${err.message}`);
    return [];
  }
}

async function buildCategory(category) {
  const results = await Promise.all(category.feeds.map(fetchFeed));
  const combined = results.flat().filter((a) => a.title && a.url);

  const seen = new Set();
  const deduped = combined.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  deduped.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const top = deduped.slice(0, ARTICLES_PER_CATEGORY).map((a) => ({
    id: makeId(a.url),
    ...a
  }));

  return { id: category.id, label: category.label, articles: top };
}

async function main() {
  console.log("Fetching Commercial Investments International — Global Morning Brief…");
  const built = await Promise.all(categories.map(buildCategory));

  const output = {
    generatedAt: new Date().toISOString(),
    isSample: false,
    categories: {}
  };

  for (const cat of built) {
    output.categories[cat.id] = { label: cat.label, articles: cat.articles };
    console.log(`  ${cat.label}: ${cat.articles.length} articles`);
  }

  const outPath = path.join(process.cwd(), "data", "news.json");
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
