// Легковесный SPA-роутер для навигации без перезагрузки страницы

type RouteView = () => Promise<string>;

interface Route {
  path: string;
  view: RouteView;
}

export class Router {
  private routes: Route[] = [];
  private appContainer: HTMLElement | null = null;
  private baseUrl = import.meta.env.BASE_URL || '/';

  constructor() {
    this.appContainer = document.getElementById('app');
    
    if (!this.appContainer) {
      console.error('Контейнер #app не найден');
      return;
    }

    // Обработчик кликов по ссылкам с data-link
    document.body.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('[data-link]') as HTMLAnchorElement;
      
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          this.navigate(href);
        }
      }
    });

    // Обработчик кнопок Назад/Вперед
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });
  }

  // Инициализация роутера (вызывается после регистрации всех маршрутов)
  init(): void {
    this.handleRoute();
  }

  // Регистрация маршрута
  register(path: string, view: RouteView): Router {
    this.routes.push({ path, view });
    return this;
  }

  // Навигация по URL
  navigate(url: string): void {
    history.pushState(null, '', this.toBrowserUrl(url));
    this.handleRoute();
    this.updateActiveLink();
  }

  // Обработка текущего маршрута
  async handleRoute(): Promise<void> {
    if (!this.appContainer) return;

    const path = this.getCurrentPath();
    const route = this.routes.find(r => r.path === path) || 
                  this.routes.find(r => r.path === '/404');

    if (route) {
      try {
        // Добавляем fade-out эффект
        this.appContainer.classList.add('fade-out');
        
        // Ждем завершения анимации перед загрузкой
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Загружаем HTML
        const html = await route.view();
        
        // Обрабатываем CSS ссылки перед вставкой контента
        this.loadStylesFromHTML(html);
        
        // Удаляем <link> теги из HTML перед вставкой
        const htmlWithoutLinks = html.replace(/<link[^>]*>/gi, '');
        
        // Вставляем контент
        this.appContainer.innerHTML = htmlWithoutLinks;
        
        // Прокручиваем страницу в начало после смены контента
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
        
        // Удаляем fade-out и добавляем fade-in
        this.appContainer.classList.remove('fade-out');
        this.appContainer.classList.add('fade-in');
        
        // Убираем fade-in после завершения анимации
        setTimeout(() => {
          this.appContainer?.classList.remove('fade-in');
        }, 300);
        
        // Обновляем активную ссылку
        this.updateActiveLink();
        
        // Переинициализируем обработчики событий для нового контента
        this.reinitializeEventHandlers();
      } catch (error) {
        console.error('Ошибка загрузки маршрута:', error);
        // Пытаемся загрузить страницу 404
        const notFoundRoute = this.routes.find(r => r.path === '/404');
        if (notFoundRoute) {
          try {
            const html = await notFoundRoute.view();
            // Обрабатываем CSS ссылки
            this.loadStylesFromHTML(html);
            // Удаляем <link> теги из HTML перед вставкой
            const htmlWithoutLinks = html.replace(/<link[^>]*>/gi, '');
            this.appContainer.innerHTML = htmlWithoutLinks;
          } catch (e) {
            this.appContainer.innerHTML = '<h1>Ошибка 404</h1><p>Страница не найдена</p>';
          }
        }
      }
    }
  }

  // Обновление активной ссылки в навигации
  private updateActiveLink(): void {
    const path = this.getCurrentPath();
    const navLinks = document.querySelectorAll('.nav-link[data-link]');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === path) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Загрузка CSS из HTML контента
  private loadStylesFromHTML(html: string): void {
    const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      if (href.startsWith('/src/')) continue;
      // Проверяем, не загружен ли уже этот CSS
      const existingLink = document.querySelector(`link[href="${href}"]`);
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    }
  }

  // Переинициализация обработчиков событий для нового контента
  reinitializeEventHandlers(): void {
    // Обработка ссылок внутри загруженного контента
    const internalLinks = this.appContainer?.querySelectorAll('a[data-link]');
    internalLinks?.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          this.navigate(href);
        }
      });
    });
  }

  private getCurrentPath(): string {
    const pathname = window.location.pathname || '/';
    const basePath = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;

    if (basePath !== '/' && pathname.startsWith(basePath)) {
      return pathname.slice(basePath.length - 1) || '/';
    }

    return pathname;
  }

  private toBrowserUrl(url: string): string {
    if (!url.startsWith('/')) return url;

    const basePath = this.baseUrl.replace(/\/$/, '');
    if (!basePath || url.startsWith(`${basePath}/`)) return url;

    return `${basePath}${url}`;
  }
}

