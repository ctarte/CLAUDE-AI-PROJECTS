# Global Morning Brief

**Commercial Investments International, Inc. — Global & Emerging Market Trends**

A daily morning-brief website that curates the top five stories in each of twelve
sectors — World, Crypto, Economy, Politics, AI, Trends, Stock Market, Marketing,
Technology, Business, Fashion — Men, and Architecture — with clear attribution
to the original publisher and a one-click "save for later" reading list.

## How it works

- `scripts/sources.js` lists the RSS feeds polled for each category.
- `scripts/fetch-news.js` fetches those feeds, dedupes and sorts by publish
  date, and writes the top five articles per category to `data/news.json`.
- `index.html` / `assets/js/app.js` / `assets/css/styles.css` render the site
  as a static page that reads `data/news.json` — no server required.
- Saved articles are stored in the reader's own browser (`localStorage`), so
  the reading list is private to each visitor and survives page reloads.

## Running the sync locally

```bash
npm install
npm run fetch-news
```

This regenerates `data/news.json` with live headlines. Then open
`index.html` in a browser (or serve the folder, e.g. `npx serve .`).

## Automatic daily updates

`.github/workflows/morning-brief.yml` runs on a daily schedule (10:00 UTC),
on manual dispatch, and on every push to `main`. It:

1. Fetches the latest headlines and commits `data/news.json` if it changed.
2. Publishes the site to **GitHub Pages**.

To enable this after merging to `main`, open the repository's **Settings →
Pages** and set the source to **GitHub Actions**. The workflow needs no
secrets — it only reads public RSS feeds.

## Preview / sample data

Until the workflow runs for the first time, `data/news.json` ships with
clearly-labeled **preview** placeholder cards (source: "Preview Feed") so the
design can be reviewed immediately. They are replaced automatically by real,
attributed headlines on the first sync.

## Editing the sources

Add, remove, or swap RSS feeds per category in `scripts/sources.js`. Each
category can list multiple feeds — they're merged, deduplicated, and the five
most recent articles are kept.
