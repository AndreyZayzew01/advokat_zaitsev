import type { Article } from './articles';

export type PageSEOOptions = {
  title: string;
  description: string;
  ogType?: 'website' | 'article';
  canonicalPath?: string;
};

export function setPageSEO(opts: PageSEOOptions): void {
  document.title = opts.title;
  setMetaByName('description', opts.description);
  setMetaByProperty('og:title', opts.title);
  setMetaByProperty('og:description', opts.description);
  if (opts.ogType) setMetaByProperty('og:type', opts.ogType);
  if (opts.canonicalPath) setCanonical(opts.canonicalPath);
}

export function setArticleJsonLd(article: Article): void {
  const existing = document.getElementById('article-json-ld');
  existing?.remove();

  const script = document.createElement('script');
  script.id = 'article-json-ld';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    author: {
      '@type': 'Person',
      name: 'Зайцев В.О.',
    },
  });
  document.head.appendChild(script);
}

export function clearArticleJsonLd(): void {
  document.getElementById('article-json-ld')?.remove();
}

function setMetaByName(name: string, content: string): void {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function setMetaByProperty(property: string, content: string): void {
  let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function setCanonical(path: string): void {
  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const href = `${origin}${base}${normalizedPath}`;

  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}
