// Утилиты для работы со статьями

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  image?: string;
  category: string;
  tags: string[];
}

let articlesCache: Article[] | null = null;

// Загрузка статей
export async function loadArticles(): Promise<Article[]> {
  if (articlesCache) {
    return articlesCache;
  }

  try {
    const response = await fetch('/src/data/articles.json');
    if (!response.ok) {
      throw new Error('Не удалось загрузить статьи');
    }
    articlesCache = await response.json();
    return articlesCache || [];
  } catch (error) {
    console.error('Ошибка загрузки статей:', error);
    return [];
  }
}

// Получить статью по ID
export async function getArticleById(id: string): Promise<Article | null> {
  const articles = await loadArticles();
  return articles.find(article => article.id === id) || null;
}

// Форматирование даты
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

