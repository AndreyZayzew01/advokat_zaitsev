import { formatDate, loadArticleHtml, loadArticles } from '../utils/articles';
import { clearArticleJsonLd, setArticleJsonLd, setPageSEO } from '../utils/seo';
import { escapeHtml, renderArticleCard } from '../utils/renderArticleCard';

export async function initArticlesPage(): Promise<void> {
  const container = document.getElementById('articlesContainer');
  if (!container) return;

  const filterBar = document.querySelector('.filter-bar') as HTMLElement | null;
  const pageTitleEl = document.querySelector('.page-header .page-title') as HTMLElement | null;
  const pageSubtitleEl = document.querySelector('.page-header .page-subtitle') as HTMLElement | null;
  const searchInput = document.getElementById('articlesSearch') as HTMLInputElement | null;
  const categorySelect = document.getElementById('articlesCategory') as HTMLSelectElement | null;
  const articles = await loadArticles();
  const params = new URLSearchParams(window.location.search);
  const articleParam = params.get('article');

  if (articleParam) {
    filterBar?.classList.add('is-hidden');

    const article = articles.find(a => a.slug === articleParam) || articles.find(a => a.id === articleParam);
    if (!article) {
      if (pageTitleEl) pageTitleEl.textContent = 'Статья не найдена';
      if (pageSubtitleEl) pageSubtitleEl.textContent = 'Вернитесь к списку статей.';
      clearArticleJsonLd();
      setPageSEO({
        title: 'Статья не найдена — Адвокат Зайцев В.О.',
        description: 'Статья не найдена. Перейдите в раздел «Полезное», чтобы выбрать другую публикацию.',
        ogType: 'website',
        canonicalPath: '/useful',
      });

      container.innerHTML = `
        <div class="article-view">
          <a class="article-back" href="/useful" data-link>← Назад к списку</a>
          <p class="no-articles">Статья не найдена.</p>
        </div>`;
      return;
    }

    if (pageTitleEl) pageTitleEl.textContent = article.title;
    if (pageSubtitleEl) pageSubtitleEl.textContent = `${formatDate(article.date)} · ${article.category}`;

    setPageSEO({
      title: `${article.title} — Адвокат Зайцев В.О.`,
      description: article.excerpt,
      ogType: 'article',
      canonicalPath: `/useful?article=${encodeURIComponent(article.slug)}`,
    });
    setArticleJsonLd(article);

    const html = await loadArticleHtml(article.slug);
    const fallbackHtml = `
      <article class="article-content">
        <div class="article-body">
          <p>${escapeHtml(article.content)}</p>
        </div>
      </article>`;

    container.innerHTML = `
      <div class="article-view">
        <a class="article-back" href="/useful" data-link>← Назад к списку</a>
        ${html || fallbackHtml}
      </div>`;

    return;
  }

  filterBar?.classList.remove('is-hidden');
  if (pageTitleEl) pageTitleEl.textContent = 'Полезное';
  if (pageSubtitleEl) pageSubtitleEl.textContent = 'Подборка статей и разборов кейсов.';
  clearArticleJsonLd();
  setPageSEO({
    title: 'Полезное — Адвокат Зайцев В.О.',
    description: 'Подборка статей и разборов кейсов по семейному, наследственному, уголовному праву и недвижимости.',
    ogType: 'website',
    canonicalPath: '/useful',
  });

  const render = () => {
    const query = (searchInput?.value || '').toLowerCase();
    const category = categorySelect?.value || '';
    const filtered = articles.filter(article => {
      const matchesQuery = article.title.toLowerCase().includes(query);
      const matchesCategory = category ? article.category === category : true;
      return matchesQuery && matchesCategory;
    });

    container.innerHTML = filtered.length
      ? filtered.map(renderArticleCard).join('')
      : '<p class="no-articles">Ничего не найдено.</p>';
  };

  searchInput?.addEventListener('input', render);
  categorySelect?.addEventListener('change', render);
  render();
}
