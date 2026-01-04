// Легковесный SPA-роутер для навигации без перезагрузки страницы

type RouteView = () => Promise<string>;

interface Route {
  path: string;
  view: RouteView;
}

export class Router {
  private routes: Route[] = [];
  private appContainer: HTMLElement | null = null;

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
    history.pushState(null, '', url);
    this.handleRoute();
    this.updateActiveLink();
  }

  // Обработка текущего маршрута
  async handleRoute(): Promise<void> {
    if (!this.appContainer) return;

    const path = window.location.pathname || '/';
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
        
        // Вставляем контент
        this.appContainer.innerHTML = html;
        
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
            this.appContainer.innerHTML = html;
          } catch (e) {
            this.appContainer.innerHTML = '<h1>Ошибка 404</h1><p>Страница не найдена</p>';
          }
        }
      }
    }
  }

  // Обновление активной ссылки в навигации
  private updateActiveLink(): void {
    const path = window.location.pathname || '/';
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

  // Переинициализация обработчиков событий для нового контента
  private reinitializeEventHandlers(): void {
    // Переинициализация CTA-кнопок
    const ctaButtons = document.querySelectorAll('.cta-button');
    const modal = document.getElementById('consultationModal');
    const modalClose = document.querySelector('.modal-close');
    const modalOverlay = document.getElementById('consultationModal');

    // Открытие модального окна
    ctaButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (modal) {
          modal.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      });
    });

    // Закрытие модального окна по кнопке
    if (modalClose) {
      modalClose.addEventListener('click', () => {
        if (modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    }

    // Закрытие модального окна по клику на overlay
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          modalOverlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    }

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
}

