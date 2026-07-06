import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const siteUrl = 'https://advokat-zaitsev.ru';
const today = new Date().toISOString().slice(0, 10);
const articles = JSON.parse(readFileSync(join(root, 'src/data/articles.json'), 'utf8'));

const staticRoutes = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/services', changefreq: 'monthly', priority: '0.8' },
  { loc: '/achievements', changefreq: 'monthly', priority: '0.7' },
  { loc: '/career', changefreq: 'monthly', priority: '0.7' },
  { loc: '/contacts', changefreq: 'monthly', priority: '0.8' },
  { loc: '/useful', changefreq: 'weekly', priority: '0.8' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

const articleRoutes = articles.map(article => ({
  loc: `/useful?article=${encodeURIComponent(article.slug)}`,
  lastmod: article.date,
  changefreq: 'monthly',
  priority: '0.6',
}));

const urls = [...staticRoutes.map(route => ({ ...route, lastmod: today })), ...articleRoutes];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${escapeXml(`${siteUrl}${url.loc}`)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

writeFileSync(join(root, 'public/sitemap.xml'), xml);
console.log(`Generated sitemap with ${urls.length} URLs.`);

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
