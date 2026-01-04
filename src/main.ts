// Точка входа приложения
import { Router } from './router';

console.log('Приложение загружено');

// Инициализация роутера
document.addEventListener('DOMContentLoaded', () => {
  const router = new Router()
    .register('/', () => fetch('/src/views/home.html').then(r => r.text()))
    .register('/services', () => fetch('/src/views/services.html').then(r => r.text()))
    .register('/achievements', () => fetch('/src/views/achievements.html').then(r => r.text()))
    .register('/career', () => fetch('/src/views/career.html').then(r => r.text()))
    .register('/contacts', () => fetch('/src/views/contacts.html').then(r => r.text()))
    .register('/useful', () => fetch('/src/views/useful.html').then(r => r.text()))
    .register('/404', () => fetch('/src/views/404.html').then(r => r.text()));
  
  // Инициализация после регистрации всех маршрутов
  router.init();

  // Обработчик для кнопок CTA (будет переинициализирован роутером при смене страницы)
  const initCTAButtons = () => {
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

    // Закрытие модального окна по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal?.classList.contains('active')) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  };

  // Инициализация CTA-кнопок на начальной странице
  initCTAButtons();
});

