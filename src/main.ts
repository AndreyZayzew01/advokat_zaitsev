// Точка входа приложения
import { Router } from './router';
import { validateForm, formatPhone, checkRateLimit, getUserIdentifier, submitForm } from './utils/formHandler';
import { showToast } from './utils/toast';
import { loadArticles, formatDate } from './utils/articles';
import { initGoogleAnalytics, initYandexMetrika, trackFormSubmit, trackCTAClick } from './utils/analytics';

console.log('Приложение загружено');

// Инициализация роутера
document.addEventListener('DOMContentLoaded', () => {
  // Сначала инициализируем обработчики CTA-кнопок, чтобы они работали даже для статического контента в index.html
  // Инициализация обработчиков CTA-кнопок с использованием делегирования событий
  // Это позволяет обрабатывать кнопки, добавленные динамически
  let ctaHandlersInitialized = false;

  // Прямое навешивание обработчиков на существующие CTA-кнопки
  // Нужно на случай, если по каким-то причинам делегирование кликов не срабатывает
  const bindDirectCTAButtons = () => {
    const modal = document.getElementById('consultationModal');
    if (!modal) {
      return;
    }

    const buttons = document.querySelectorAll<HTMLButtonElement>('.cta-button');
    buttons.forEach(button => {
      // Пропускаем кнопку отправки формы и кнопки внутри формы консультации
      if (button.type === 'submit') return;
      if (button.closest('#consultationForm')) return;

      // Чтобы не навешивать дубликаты, проверяем флаг на элементе
      if ((button as any)._ctaBound) return;
      (button as any)._ctaBound = true;

      button.addEventListener('click', (e) => {
        e.preventDefault();
        // Останавливаем всплытие, чтобы не сработало делегирование второй раз
        e.stopPropagation();

        const location = button.closest('section')?.className || 'unknown';
        trackCTAClick(location);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });
  };

  const initCTAButtons = () => {
    // Предотвращаем множественную регистрацию обработчиков
    if (ctaHandlersInitialized) {
      return;
    }
    ctaHandlersInitialized = true;
    
    // Проверяем наличие модального окна
    const modal = document.getElementById('consultationModal');
    if (!modal) {
      console.warn('Модальное окно consultationModal не найдено в DOM при инициализации');
    }

    // Используем делегирование событий для обработки всех CTA-кнопок
    document.body.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Ищем кнопку с классом cta-button (может быть сам target или его родитель)
      const button = target.closest('.cta-button') as HTMLButtonElement | null;
      
      if (button && button instanceof HTMLButtonElement) {
        // Предотвращаем открытие, если это кнопка отправки формы
        // ВАЖНО: Все CTA-кнопки должны иметь type="button", чтобы не считаться submit-кнопками
        // Кнопка отправки формы в модалке имеет type="submit" и класс form-submit-btn
        if (button.type === 'submit') {
          return;
        }
        
        // Предотвращаем открытие, если кнопка находится внутри формы консультации (кроме самой кнопки submit)
        const form = button.closest('form');
        if (form && form.id === 'consultationForm') {
          return;
        }
        
        // Получаем модальное окно в момент клика
        const modal = document.getElementById('consultationModal');
        if (modal) {
          e.preventDefault();
          e.stopPropagation();
          const location = button.closest('section')?.className || 'unknown';
          trackCTAClick(location);
          modal.classList.add('active');
          document.body.style.overflow = 'hidden';
        } else {
          console.error('Модальное окно consultationModal не найдено в DOM');
        }
      }
    });

    // Закрытие модального окна по кнопке (используем делегирование событий)
    document.body.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const closeButton = target.closest('.modal-close');
      
      if (closeButton) {
        const modal = document.getElementById('consultationModal');
        if (modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
          resetForm();
        }
      }
    });

    // Закрытие модального окна по клику на overlay (используем делегирование событий)
    document.body.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const modal = document.getElementById('consultationModal');
      
      if (modal && target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        resetForm();
      }
    });

    // Закрытие модального окна по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('consultationModal');
        if (modal && modal.classList.contains('active')) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
          resetForm();
        }
      }
    });
  };

  // Инициализируем обработчики CTA-кнопок ДО инициализации роутера
  initCTAButtons();
  // Подстраховка: привязываем обработчики напрямую к уже существующим кнопкам
  bindDirectCTAButtons();

  const router = new Router()
    .register('/', () => fetch('/src/views/home/home.html').then(r => r.text()))
    .register('/services', () => fetch('/src/views/services/services.html').then(r => r.text()))
    .register('/achievements', () => fetch('/src/views/achievements/achievements.html').then(r => r.text()))
    .register('/career', () => fetch('/src/views/career/career.html').then(r => r.text()))
    .register('/contacts', () => fetch('/src/views/contacts/contacts.html').then(r => r.text()))
    .register('/useful', () => fetch('/src/views/useful/useful.html').then(r => r.text()))
    .register('/privacy', () => fetch('/src/views/privacy/privacy.html').then(r => r.text()))
    .register('/404', () => fetch('/src/views/404/404.html').then(r => r.text()));
  
  // Инициализация после регистрации всех маршрутов
  router.init();

  // Инициализация аналитики (раскомментируйте и укажите реальные ID)
  // initGoogleAnalytics('G-XXXXXXXXXX');
  // initYandexMetrika(12345678);

  // Инициализация формы консультации
  const initConsultationForm = () => {
    const form = document.getElementById('consultationForm') as HTMLFormElement;
    if (!form) return;

    const phoneInput = document.getElementById('clientPhone') as HTMLInputElement;
    
    // Маска для телефона
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const formatted = formatPhone(target.value);
        if (formatted !== target.value) {
          target.value = formatted;
        }
      });

      phoneInput.addEventListener('keydown', (e) => {
        // Разрешаем удаление, backspace, tab, escape, enter
        if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
          // Разрешаем Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true) ||
          // Разрешаем home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {
          return;
        }
        // Запрещаем все, кроме цифр
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
          e.preventDefault();
        }
      });
    }

    // Валидация в реальном времени
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        validateField(input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement);
      });
    });

    // Обработчик отправки формы
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      const originalText = submitButton.textContent;
      
      // Проверка rate limiting
      const userIdentifier = getUserIdentifier();
      if (!checkRateLimit(userIdentifier, 3, 60000)) {
        showToast('Слишком много попыток. Пожалуйста, подождите минуту перед повторной отправкой.', { type: 'warning', duration: 5000 });
        return;
      }

      // Сбор данных формы
      const formData = {
        name: (form.querySelector('#clientName') as HTMLInputElement)?.value.trim() || '',
        phone: (form.querySelector('#clientPhone') as HTMLInputElement)?.value.trim() || '',
        email: (form.querySelector('#clientEmail') as HTMLInputElement)?.value.trim() || '',
        type: (form.querySelector('#consultationType') as HTMLSelectElement)?.value || '',
        message: (form.querySelector('#clientMessage') as HTMLTextAreaElement)?.value.trim() || '',
        consent: (form.querySelector('#consent') as HTMLInputElement)?.checked || false
      };

      // Валидация
      const validation = validateForm(formData);
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          showToast(error, { type: 'error' });
        });
        highlightFormErrors(validation.errors);
        return;
      }

      // Блокируем кнопку отправки
      submitButton.disabled = true;
      submitButton.textContent = 'Отправка...';

      try {
        const result = await submitForm(formData);
        
        if (result.success) {
          showToast(result.message, { type: 'success', duration: 6000 });
          trackFormSubmit('consultation');
          form.reset();
          clearFormErrors();
          
          // Закрываем модальное окно через 2 секунды
          setTimeout(() => {
            const modal = document.getElementById('consultationModal');
            if (modal) {
              modal.classList.remove('active');
              document.body.style.overflow = '';
            }
          }, 2000);
        } else {
          showToast(result.message, { type: 'error', duration: 6000 });
        }
      } catch (error) {
        console.error('Ошибка при отправке формы:', error);
        showToast('Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже или свяжитесь со мной напрямую.', { type: 'error' });
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText || 'Отправить заявку';
      }
    });
  };

  // Валидация отдельного поля
  function validateField(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
    const fieldGroup = field.closest('.form-group');
    if (!fieldGroup) return;

    // Удаляем предыдущие ошибки
    const existingError = fieldGroup.querySelector('.form-error');
    if (existingError) {
      existingError.remove();
    }
    field.classList.remove('form-input-error');

    let isValid = true;
    let errorMessage = '';

    if (field.hasAttribute('required') && !field.value.trim()) {
      isValid = false;
      errorMessage = 'Это поле обязательно для заполнения';
    } else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
      isValid = false;
      errorMessage = 'Введите корректный email адрес';
    } else if (field.id === 'clientPhone' && field.value) {
      const digits = field.value.replace(/\D/g, '');
      if (digits.length < 10) {
        isValid = false;
        errorMessage = 'Введите корректный номер телефона';
      }
    } else if (field.id === 'clientName' && field.value.trim().length < 2) {
      isValid = false;
      errorMessage = 'Имя должно содержать минимум 2 символа';
    }

    if (!isValid) {
      field.classList.add('form-input-error');
      const errorElement = document.createElement('span');
      errorElement.className = 'form-error';
      errorElement.textContent = errorMessage;
      fieldGroup.appendChild(errorElement);
    }
  }

  // Подсветка ошибок в форме
  function highlightFormErrors(errors: string[]): void {
    const form = document.getElementById('consultationForm');
    if (!form) return;

    clearFormErrors();

    errors.forEach(error => {
      if (error.includes('Имя')) {
        const nameField = form.querySelector('#clientName') as HTMLInputElement;
        if (nameField) {
          nameField.classList.add('form-input-error');
          showFieldError(nameField, error);
        }
      } else if (error.includes('телефон')) {
        const phoneField = form.querySelector('#clientPhone') as HTMLInputElement;
        if (phoneField) {
          phoneField.classList.add('form-input-error');
          showFieldError(phoneField, error);
        }
      } else if (error.includes('email')) {
        const emailField = form.querySelector('#clientEmail') as HTMLInputElement;
        if (emailField) {
          emailField.classList.add('form-input-error');
          showFieldError(emailField, error);
        }
      } else if (error.includes('согласие')) {
        const consentField = form.querySelector('#consent') as HTMLInputElement;
        if (consentField) {
          consentField.classList.add('form-input-error');
          showFieldError(consentField, error);
        }
      }
    });
  }

  // Показать ошибку поля
  function showFieldError(field: HTMLElement, message: string): void {
    const fieldGroup = field.closest('.form-group');
    if (!fieldGroup) return;

    const errorElement = document.createElement('span');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    fieldGroup.appendChild(errorElement);
  }

  // Очистить все ошибки формы
  function clearFormErrors(): void {
    const form = document.getElementById('consultationForm');
    if (!form) return;

    form.querySelectorAll('.form-error').forEach(error => error.remove());
    form.querySelectorAll('.form-input-error').forEach(field => field.classList.remove('form-input-error'));
  }

  // Сброс формы
  function resetForm(): void {
    const form = document.getElementById('consultationForm') as HTMLFormElement;
    if (form) {
      form.reset();
      clearFormErrors();
    }
  }

  // Инициализация мобильного меню
  const initMobileMenu = () => {
    const menuToggle = document.querySelector('.mobile-menu-toggle') as HTMLButtonElement;
    const navigation = document.getElementById('mainNavigation');
    
    if (!menuToggle || !navigation) return;

    menuToggle.addEventListener('click', () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', (!isExpanded).toString());
      navigation.classList.toggle('active');
      document.body.style.overflow = isExpanded ? '' : 'hidden';
    });

    // Закрытие меню при клике на ссылку
    const navLinks = navigation.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        navigation.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    // Закрытие меню при клике на overlay
    navigation.addEventListener('click', (e) => {
      if (e.target === navigation) {
        menuToggle.setAttribute('aria-expanded', 'false');
        navigation.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Закрытие меню по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navigation.classList.contains('active')) {
        menuToggle.setAttribute('aria-expanded', 'false');
        navigation.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  };

  
  // Инициализация формы
  initConsultationForm();

  // Инициализация мобильного меню
  initMobileMenu();

  // Инициализация статей на главной странице
  const initHomeArticles = async () => {
    const container = document.getElementById('homeArticlesContainer');
    if (!container || window.location.pathname !== '/') return;

    try {
      const articles = await loadArticles();
      const recentArticles = articles.slice(0, 3);
      
      if (recentArticles.length === 0) {
        container.innerHTML = '<p class="no-articles">Статьи пока не добавлены.</p>';
        return;
      }

      container.innerHTML = recentArticles.map(article => `
        <article class="article-card">
          ${article.image ? `<div class="article-image-wrapper">
            <img src="${article.image}" alt="${article.title}" class="article-image" loading="lazy">
          </div>` : ''}
          <div class="article-date">${formatDate(article.date)}</div>
          <h3 class="article-title">${escapeHtml(article.title)}</h3>
          <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
          <a href="/useful" class="article-link" data-link>Читать далее →</a>
        </article>
      `).join('');
    } catch (error) {
      console.error('Ошибка загрузки статей:', error);
      container.innerHTML = '<p class="error-message">Ошибка загрузки статей. Пожалуйста, попробуйте позже.</p>';
    }
  };

  // Инициализация статей на странице useful
  const initArticlesPage = async () => {
    const container = document.getElementById('articlesContainer');
    if (!container || window.location.pathname !== '/useful') return;

    try {
      const articles = await loadArticles();
      
      if (articles.length === 0) {
        container.innerHTML = '<p class="no-articles">Статьи пока не добавлены.</p>';
        return;
      }

      container.innerHTML = articles.map(article => `
        <article class="article-card">
          ${article.image ? `<div class="article-image-wrapper">
            <img src="${article.image}" alt="${article.title}" class="article-image" loading="lazy">
          </div>` : ''}
          <div class="article-date">${formatDate(article.date)}</div>
          <h3 class="article-title">${escapeHtml(article.title)}</h3>
          <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
          <a href="/useful" class="article-link" data-link>Читать далее →</a>
        </article>
      `).join('');
    } catch (error) {
      console.error('Ошибка загрузки статей:', error);
      container.innerHTML = '<p class="error-message">Ошибка загрузки статей. Пожалуйста, попробуйте позже.</p>';
    }
  };

  // Экранирование HTML
  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Переинициализация статей при навигации
  const originalReinitialize = router.reinitializeEventHandlers.bind(router);
  router.reinitializeEventHandlers = function() {
    originalReinitialize();
    setTimeout(() => {
      initHomeArticles();
      initArticlesPage();
      // После подгрузки нового HTML (например, contacts.html) ещё раз привязываем обработчики к CTA-кнопкам
      bindDirectCTAButtons();
    }, 100);
  };

  // Инициализация статей при загрузке страницы
  initHomeArticles();
  initArticlesPage();
});

