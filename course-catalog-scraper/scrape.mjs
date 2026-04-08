/**
 * University of Kentucky Course Catalog Scraper
 * Target: https://catalogs.uky.edu (Modern Campus Catalog / Acalog ACMS)
 * Catalog: 2025-2026 Undergraduate (catoid=18)
 *
 * Strategy:
 *  1. Iterate listing pages 1–49 to collect all course IDs (coid)
 *  2. Fetch each course detail page for full data
 *     - Resumable: each course written to progress/{coid}.json immediately
 *     - On restart, already-scraped coids are skipped automatically
 *     - 3-way concurrency (semaphore) to cut runtime from ~81 min to ~27 min
 *  3. Merge progress files into course-catalog.json
 *
 * Rate limit: 1 request/second per worker (3 concurrent = 3 req/s total)
 */

import { writeFile, readFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL   = 'https://catalogs.uky.edu';
const CATOID     = 18;
const TOTAL_PAGES = 49;
const DELAY_MS   = 1000;   // ms between requests per worker
const CONCURRENCY = 3;     // parallel workers
const OUTPUT_DIR  = join(__dirname, 'output');
const PROGRESS_DIR = join(OUTPUT_DIR, 'progress');
const OUTPUT_FILE  = join(OUTPUT_DIR, 'course-catalog.json');
const IDS_FILE     = join(OUTPUT_DIR, 'course-ids.json');
const FAILED_FILE  = join(OUTPUT_DIR, 'failed.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Semaphore ─────────────────────────────────────────────────────────────────

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

// ── HTTP ──────────────────────────────────────────────────────────────────────

async function fetchHtml(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UKCourseCatalogScraper/1.0; educational research)',
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

// ── Phase 1: Collect course IDs ───────────────────────────────────────────────

async function collectCourseIds() {
  // Re-use existing checkpoint if available
  if (existsSync(IDS_FILE)) {
    console.log('Found existing course-ids.json — skipping Phase 1.\n');
    const raw = await readFile(IDS_FILE, 'utf8');
    return JSON.parse(raw);
  }

  const ids = new Map();

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const url = `${BASE_URL}/content.php?catoid=${CATOID}&navoid=1032&filter[item_type]=3&filter[only_active]=1&filter[3]=1&filter[cpage]=${page}`;
    console.log(`Listing page ${page}/${TOTAL_PAGES} ...`);

    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    $('a[href*="preview_course_nopop.php"]').each((_, el) => {
      const href = $(el).attr('href');
      const match = href.match(/coid=(\d+)/);
      if (match) {
        const coid = match[1];
        if (!ids.has(coid)) {
          ids.set(coid, {
            coid,
            shortTitle: $(el).text().trim(),
            href: href.startsWith('http') ? href : `${BASE_URL}/${href}`,
          });
        }
      }
    });

    await sleep(DELAY_MS);
  }

  const list = [...ids.values()];
  await writeFile(IDS_FILE, JSON.stringify(list, null, 2));
  console.log(`Saved course-ids.json (${list.length} courses).\n`);
  return list;
}

// ── Phase 2: Parse course detail HTML ────────────────────────────────────────

function parseCourseDetail(html, coid) {
  const $ = cheerio.load(html);

  const h1 = $('h1').first().text().trim().replace(/\u00a0/g, ' ');
  const h1Match = h1.match(/^([A-Z&]{1,4}(?:\s[A-Z&]{1,4})?)\s+(\d{3}[A-Z]?)\s*[-–]\s*(.+)$/);
  let prefix = '', number = '', title = h1;
  if (h1Match) {
    prefix = h1Match[1].trim();
    number = h1Match[2].trim();
    title  = h1Match[3].trim();
  }

  let creditHours = '';
  const strongTexts = $('strong').map((_, el) => $(el).text().trim()).get();
  const bracketIdx = strongTexts.indexOf('[');
  const creditIdx  = strongTexts.indexOf('Credit Hours');
  if (bracketIdx !== -1 && creditIdx !== -1 && creditIdx > bracketIdx) {
    creditHours = strongTexts.slice(bracketIdx + 1, creditIdx).join(' ').trim();
  }

  let contentText = '';
  $('td').each((_, el) => {
    const t = $(el).text().replace(/\u00a0/g, ' ');
    if (t.includes(h1) && t.includes('Credit Hours')) {
      contentText = t;
      return false;
    }
  });

  let courseBody = contentText.replace(/\s+/g, ' ').trim();
  const PORTFOLIO = 'Add to Portfolio (opens a new window)';
  const portfolioIdx = courseBody.indexOf(PORTFOLIO);
  if (portfolioIdx !== -1) courseBody = courseBody.slice(portfolioIdx + PORTFOLIO.length).trim();
  const backToTopIdx = courseBody.indexOf('Back to Top');
  if (backToTopIdx !== -1) courseBody = courseBody.slice(0, backToTopIdx).trim();

  const afterTitle = courseBody.replace(h1, '').replace(/^\s*\[[^\]]+\]\s*/, '').trim();

  let description = afterTitle;
  const labelMatch = afterTitle.search(/Prereq[^:]*:|Course Attributes:|Repeatable/i);
  if (labelMatch !== -1) description = afterTitle.slice(0, labelMatch).trim();

  let prerequisites = '';
  const prereqMatch = afterTitle.match(/Prereq[^:]*:\s*(.+?)(?=\s*(?:Course Attributes:|Repeatable|$))/is);
  if (prereqMatch) prerequisites = prereqMatch[1].replace(/\s+/g, ' ').trim().replace(/\.$/, '');

  let attributes = [];
  const attrMatch = afterTitle.match(/Course Attributes:\s*(.+?)(?=\s*(?:Repeatable|Prereq|$))/is);
  if (attrMatch) attributes = attrMatch[1].split(',').map((a) => a.trim()).filter(Boolean);

  let repeatability = '';
  const repeatMatch = afterTitle.match(/Repeatable[^.]*\./i);
  if (repeatMatch) repeatability = repeatMatch[0].trim();

  return {
    coid,
    prefix,
    number,
    courseCode: prefix && number ? `${prefix} ${number}` : '',
    title,
    creditHours,
    description,
    prerequisites,
    attributes,
    repeatability,
  };
}

// ── Phase 2: Scrape one course (writes to progress/{coid}.json) ───────────────

async function scrapeOne(courseEntry, index, total, sem) {
  const { coid, shortTitle } = courseEntry;
  const progressFile = join(PROGRESS_DIR, `${coid}.json`);

  // Skip if already done
  if (existsSync(progressFile)) {
    process.stdout.write(`\r  [${index + 1}/${total}] SKIP ${shortTitle.slice(0, 50).padEnd(50)}`);
    return;
  }

  await sem.acquire();
  try {
    const url = `${BASE_URL}/preview_course_nopop.php?catoid=${CATOID}&coid=${coid}`;
    process.stdout.write(`\r  [${index + 1}/${total}] ${shortTitle.slice(0, 55).padEnd(55)}`);

    let record;
    try {
      const html = await fetchHtml(url);
      record = parseCourseDetail(html, coid);
    } catch (err) {
      console.error(`\n  ERROR coid=${coid}: ${err.message}`);
      record = { coid, shortTitle, error: err.message };
    }

    await writeFile(progressFile, JSON.stringify(record));
    await sleep(DELAY_MS);
  } finally {
    sem.release();
  }
}

// ── Phase 2: Orchestrate concurrent scraping ───────────────────────────────────

async function scrapeCourseDetails(courseIds) {
  await mkdir(PROGRESS_DIR, { recursive: true });

  const already = (await readdir(PROGRESS_DIR)).filter((f) => f.endsWith('.json')).length;
  const remaining = courseIds.length - already;
  console.log(`Progress: ${already}/${courseIds.length} already scraped. Fetching ${remaining} remaining.\n`);

  const sem = createSemaphore(CONCURRENCY);
  const total = courseIds.length;

  // Launch all tasks; semaphore limits concurrency to CONCURRENCY
  await Promise.all(
    courseIds.map((entry, i) => scrapeOne(entry, i, total, sem))
  );

  console.log('\n');
}

// ── Phase 3: Merge progress files into final output ───────────────────────────

async function mergeResults(courseIds) {
  console.log('Merging progress files into course-catalog.json ...');

  const courses = [];
  const failed  = [];

  for (const { coid, shortTitle } of courseIds) {
    const progressFile = join(PROGRESS_DIR, `${coid}.json`);
    if (!existsSync(progressFile)) {
      failed.push({ coid, shortTitle, error: 'progress file missing' });
      continue;
    }
    const record = JSON.parse(await readFile(progressFile, 'utf8'));
    if (record.error) failed.push(record);
    else courses.push(record);
  }

  const output = {
    scrapedAt: new Date().toISOString(),
    catalog: '2025-2026 Undergraduate',
    catoid: CATOID,
    totalCourses: courses.length,
    courses,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Saved ${courses.length} courses to course-catalog.json`);

  if (failed.length) {
    await writeFile(FAILED_FILE, JSON.stringify(failed, null, 2));
    console.warn(`${failed.length} failed courses saved to failed.json`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== UK Course Catalog Scraper ===');
  console.log(`Catalog: 2025-2026 Undergraduate (catoid=${CATOID})`);
  console.log(`Concurrency: ${CONCURRENCY} workers | Delay: ${DELAY_MS}ms per worker`);
  console.log(`Output: ${OUTPUT_FILE}\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Phase 1
  console.log('--- Phase 1: Collecting course IDs ---');
  const courseIds = await collectCourseIds();
  console.log(`${courseIds.length} unique courses.\n`);

  // Phase 2
  console.log('--- Phase 2: Fetching course detail pages ---');
  await scrapeCourseDetails(courseIds);

  // Phase 3
  console.log('--- Phase 3: Merging results ---');
  await mergeResults(courseIds);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
