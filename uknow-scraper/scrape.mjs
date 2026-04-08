/**
 * UKNow News Article Scraper
 * Target: https://uknow.uky.edu
 *
 * Strategy:
 *  1. Iterate every section's listing pages until a page returns 0 articles,
 *     collecting all article URLs  →  output/article-urls.json
 *  2. Fetch each article detail page and extract structured data
 *     - Resumable: each article written to progress/{slug}.json immediately
 *     - On restart, already-scraped articles are skipped automatically
 *     - 3-way concurrency (semaphore) with 1 req/s per worker
 *  3. Merge progress files into output/uknow-articles.json
 *
 * Output fields per article:
 *   slug, section, sectionLabel, url, title, author, publishedAt, modifiedAt,
 *   bodyText, wordCount
 */

import { writeFile, readFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL     = 'https://uknow.uky.edu';
const DELAY_MS     = 1000;   // ms between requests per worker
const CONCURRENCY  = 3;      // parallel workers for Phase 2
const OUTPUT_DIR   = join(__dirname, 'output');
const PROGRESS_DIR = join(OUTPUT_DIR, 'progress');
const URLS_FILE    = join(OUTPUT_DIR, 'article-urls.json');
const OUTPUT_FILE  = join(OUTPUT_DIR, 'uknow-articles.json');
const FAILED_FILE  = join(OUTPUT_DIR, 'failed.json');

// All UKNow sections with their URL slug and display label
const SECTIONS = [
  { slug: 'campus-news',      label: 'Campus News' },
  { slug: 'research',         label: 'Research' },
  { slug: 'student-news',     label: 'Student News' },
  { slug: 'uk-healthcare',    label: 'UK HealthCare' },
  { slug: 'arts-culture',     label: 'Arts & Culture' },
  { slug: 'uk-happenings',    label: 'UK Happenings' },
  { slug: 'professional-news',label: 'Professional News' },
  { slug: 'blogs',            label: 'Blogs' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Semaphore ──────────────────────────────────────────────────────────────────

function createSemaphore(limit) {
  let active = 0;
  const queue = [];
  return {
    async acquire() {
      if (active < limit) { active++; return; }
      await new Promise((resolve) => queue.push(resolve));
      active++;
    },
    release() {
      active--;
      if (queue.length > 0) queue.shift()();
    },
  };
}

// ── HTTP ───────────────────────────────────────────────────────────────────────

async function fetchHtml(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UKNewsArchiveScraper/1.0; educational research)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.warn(`  Attempt ${attempt}/${retries} failed for ${url}: ${err.message}`);
      if (attempt < retries) await sleep(2000 * attempt);
      else throw err;
    }
  }
}

// ── Phase 1: Collect article URLs ──────────────────────────────────────────────

async function collectArticleUrls() {
  if (existsSync(URLS_FILE)) {
    console.log('Found existing article-urls.json — skipping Phase 1.\n');
    return JSON.parse(await readFile(URLS_FILE, 'utf8'));
  }

  const seen = new Set();
  const articles = [];

  for (const section of SECTIONS) {
    console.log(`\n  Section: ${section.label}`);
    let page = 0;
    let consecutiveEmpty = 0;

    while (consecutiveEmpty < 2) {
      const url = page === 0
        ? `${BASE_URL}/${section.slug}`
        : `${BASE_URL}/${section.slug}?page=${page}`;

      let html;
      try {
        html = await fetchHtml(url);
      } catch (err) {
        console.warn(`  Error on page ${page}: ${err.message} — stopping section`);
        break;
      }

      const $ = cheerio.load(html);
      const links = [];

      $('h3.uknow-section-list__title a, h2.uknow-section-list__title a').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        // Only include URLs that belong to this section (avoids nav/sidebar links)
        if (!href.startsWith(`/${section.slug}/`)) return;
        if (seen.has(fullUrl)) return;
        seen.add(fullUrl);
        const slug = href.replace(`/${section.slug}/`, '');
        links.push({ slug, section: section.slug, sectionLabel: section.label, url: fullUrl });
      });

      if (links.length === 0) {
        consecutiveEmpty++;
        process.stdout.write(`\r    page ${page}: 0 articles (${consecutiveEmpty}/2 empty)    `);
      } else {
        consecutiveEmpty = 0;
        articles.push(...links);
        process.stdout.write(`\r    page ${page}: +${links.length} articles (total ${articles.length})    `);
      }

      page++;
      await sleep(DELAY_MS);
    }

    console.log(); // newline after progress line
  }

  await writeFile(URLS_FILE, JSON.stringify(articles, null, 2));
  console.log(`\nSaved article-urls.json (${articles.length} articles).\n`);
  return articles;
}

// ── Phase 2: Parse article detail HTML ────────────────────────────────────────

function parseArticle(html, entry) {
  const $ = cheerio.load(html);

  // Title — prefer the structured h1, fall back to og:title
  const title =
    $('h1.uknow-story__title').text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    entry.slug.replace(/-/g, ' ');

  // Author — the linked name inside the byline span
  const author = $('span.uknow-story__byline a').first().text().trim() || null;

  // Dates — ISO timestamps from Open Graph meta tags
  const publishedAt = $('meta[property="article:published_time"]').attr('content') || null;
  const modifiedAt  = $('meta[property="article:modified_time"]').attr('content') || null;

  // Section label from meta (more reliable than slug mapping)
  const sectionLabel =
    $('meta[property="article:section"]').attr('content') ||
    entry.sectionLabel;

  // Body text — extract plain text from the Drupal field div
  const bodyEl = $('div.field-name-field-story-body div.field-item').first();

  // Remove any embedded script/style noise
  bodyEl.find('script, style, noscript').remove();

  // Extract paragraph text joined with newlines
  const paragraphs = [];
  bodyEl.find('p, h2, h3, h4, li').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) paragraphs.push(text);
  });

  // Fallback: if no paragraphs found, grab all text
  const bodyText = paragraphs.length > 0
    ? paragraphs.join('\n\n')
    : bodyEl.text().replace(/\s+/g, ' ').trim();

  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  return {
    slug: entry.slug,
    section: entry.section,
    sectionLabel,
    url: entry.url,
    title,
    author,
    publishedAt,
    modifiedAt,
    bodyText,
    wordCount,
  };
}

// ── Phase 2: Scrape one article ────────────────────────────────────────────────

// Progress filename: replace slashes and special chars so it works as a filename
function progressFilename(entry) {
  const safe = `${entry.section}__${entry.slug}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(PROGRESS_DIR, `${safe}.json`);
}

async function scrapeOne(entry, index, total, sem) {
  const progressFile = progressFilename(entry);

  if (existsSync(progressFile)) {
    process.stdout.write(`\r  [${index + 1}/${total}] SKIP ${entry.slug.slice(0, 55).padEnd(55)}`);
    return;
  }

  await sem.acquire();
  try {
    process.stdout.write(`\r  [${index + 1}/${total}] ${entry.slug.slice(0, 60).padEnd(60)}`);

    let record;
    try {
      const html = await fetchHtml(entry.url);
      record = parseArticle(html, entry);
    } catch (err) {
      console.error(`\n  ERROR ${entry.url}: ${err.message}`);
      record = { ...entry, error: err.message };
    }

    await writeFile(progressFile, JSON.stringify(record));
    await sleep(DELAY_MS);
  } finally {
    sem.release();
  }
}

async function scrapeAllArticles(articleUrls) {
  const already = existsSync(PROGRESS_DIR)
    ? (await readdir(PROGRESS_DIR)).filter((f) => f.endsWith('.json')).length
    : 0;
  const remaining = articleUrls.length - already;
  console.log(`Progress: ${already}/${articleUrls.length} already scraped. Fetching ${remaining} remaining.\n`);

  const sem = createSemaphore(CONCURRENCY);
  const total = articleUrls.length;

  await Promise.all(
    articleUrls.map((entry, i) => scrapeOne(entry, i, total, sem))
  );

  console.log('\n');
}

// ── Phase 3: Merge progress files ─────────────────────────────────────────────

async function mergeResults(articleUrls) {
  console.log('Merging progress files into uknow-articles.json ...');

  const articles = [];
  const failed   = [];

  for (const entry of articleUrls) {
    const progressFile = progressFilename(entry);
    if (!existsSync(progressFile)) {
      failed.push({ ...entry, error: 'progress file missing' });
      continue;
    }
    const record = JSON.parse(await readFile(progressFile, 'utf8'));
    if (record.error) failed.push(record);
    else articles.push(record);
  }

  // Sort chronologically (newest first), nulls last
  articles.sort((a, b) => {
    if (!a.publishedAt && !b.publishedAt) return 0;
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });

  const output = {
    scrapedAt: new Date().toISOString(),
    source: 'https://uknow.uky.edu',
    totalArticles: articles.length,
    sections: SECTIONS.map((s) => ({
      slug: s.slug,
      label: s.label,
      count: articles.filter((a) => a.section === s.slug).length,
    })),
    articles,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Saved ${articles.length} articles to uknow-articles.json`);

  if (failed.length) {
    await writeFile(FAILED_FILE, JSON.stringify(failed, null, 2));
    console.warn(`${failed.length} failed articles saved to failed.json`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== UKNow News Article Scraper ===');
  console.log(`Sections: ${SECTIONS.map((s) => s.slug).join(', ')}`);
  console.log(`Concurrency: ${CONCURRENCY} workers | Delay: ${DELAY_MS}ms per worker\n`);

  await mkdir(OUTPUT_DIR,   { recursive: true });
  await mkdir(PROGRESS_DIR, { recursive: true });

  console.log('--- Phase 1: Collecting article URLs ---');
  const articleUrls = await collectArticleUrls();
  console.log(`${articleUrls.length} unique articles found.\n`);

  console.log('--- Phase 2: Fetching article detail pages ---');
  await scrapeAllArticles(articleUrls);

  console.log('--- Phase 3: Merging results ---');
  await mergeResults(articleUrls);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
