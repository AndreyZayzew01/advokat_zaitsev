import { loadArticles } from '../utils/articles';
import { renderArticleCard } from '../utils/renderArticleCard';

export async function initHomeArticles(): Promise<void> {
  const container = document.getElementById('homeArticlesContainer');
  if (!container) return;

  try {
    const articles = (await loadArticles()).slice(0, 3);
    container.innerHTML = articles.length
      ? articles.map(renderArticleCard).join('')
      : '<p class="no-articles">Статьи пока не добавлены.</p>';
  } catch {
    container.innerHTML = '<p class="error-message">Не удалось загрузить статьи.</p>';
  }
}
