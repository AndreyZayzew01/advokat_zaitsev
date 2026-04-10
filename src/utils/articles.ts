export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  image?: string;
  category: string;
  tags: string[];
}

let articlesCache: Article[] | null = null;

const articleHtmlLoaders = import.meta.glob('/src/content/articles/*.html', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

export async function loadArticles(): Promise<Article[]> {
  if (articlesCache) return articlesCache;
  try {
    const mod = (await import('../data/articles.json')) as unknown as { default: Article[] };
    articlesCache = mod.default || [];
    return articlesCache;
  } catch (error) {
    console.error('Ошибка загрузки статей:', error);
    return [];
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  const articles = await loadArticles();
  return articles.find(article => article.id === id) || null;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await loadArticles();
  return articles.find(article => article.slug === slug) || null;
}

export async function loadArticleHtml(slug: string): Promise<string | null> {
  const key = `/src/content/articles/${slug}.html`;
  const loader = articleHtmlLoaders[key];
  if (!loader) return null;
  return await loader();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'января','февраля','марта','апреля','мая','июня',
    'июля','августа','сентября','октября','ноября','декабря'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
