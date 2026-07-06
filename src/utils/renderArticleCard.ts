import type { Article } from './articles';
import { formatDate } from './articles';

export function renderArticleCard(article: Article): string {
  return `
    <article class="article-card">
      <div class="article-meta">${formatDate(article.date)} · ${article.category}</div>
      <h3 class="article-title">${escapeHtml(article.title)}</h3>
      <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
      <div class="article-tags">${article.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <a href="/useful?article=${encodeURIComponent(article.slug)}" class="article-link" data-link>Читать далее →</a>
    </article>`;
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
