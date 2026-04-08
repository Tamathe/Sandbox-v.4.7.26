/**
 * Quick test: fetch listing page 1 + one course detail page
 */
import * as cheerio from 'cheerio';

const BASE_URL = 'https://catalogs.uky.edu';
const CATOID = 18;

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; UKCourseCatalogScraper/1.0; educational research)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Test listing page 1
const listUrl = `${BASE_URL}/content.php?catoid=${CATOID}&navoid=1032&filter[item_type]=3&filter[only_active]=1&filter[3]=1&filter[cpage]=1`;
console.log('Fetching listing page 1...');
const listHtml = await fetchHtml(listUrl);
const $list = cheerio.load(listHtml);

const ids = [];
$list('a[href*="preview_course_nopop.php"]').each((_, el) => {
  const href = $list(el).attr('href');
  const match = href.match(/coid=(\d+)/);
  if (match) ids.push({ coid: match[1], title: $list(el).text().trim() });
});

console.log(`Found ${ids.length} courses on page 1:`);
ids.slice(0, 5).forEach((c) => console.log(`  coid=${c.coid}: ${c.title}`));
console.log('  ...');

// Test first course detail
const first = ids[0];
const detailUrl = `${BASE_URL}/preview_course_nopop.php?catoid=${CATOID}&coid=${first.coid}`;
console.log(`\nFetching detail for ${first.title} (coid=${first.coid})...`);
const detailHtml = await fetchHtml(detailUrl);
const $d = cheerio.load(detailHtml);

// Print body text to understand structure
const bodyText = $d('body').text().replace(/\s+/g, ' ').trim().slice(0, 1000);
console.log('\nBody text (first 1000 chars):');
console.log(bodyText);

// Print all h1/h2/h3/h4 tags
console.log('\nHeadings found:');
$d('h1,h2,h3,h4').each((_, el) => console.log(`  <${el.tagName}>: ${$d(el).text().trim()}`));

// Print all strong tags
console.log('\nStrong tags found:');
$d('strong').each((_, el) => console.log(`  ${$d(el).text().trim()}`));

console.log('\nTest complete.');
