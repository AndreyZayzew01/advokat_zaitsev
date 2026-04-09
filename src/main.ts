import { Router } from './router';
import { validateForm, formatPhone, checkRateLimit, getUserIdentifier, submitForm } from './utils/formHandler';
import { showToast } from './utils/toast';
import { loadArticles, formatDate } from './utils/articles';
import { trackFormSubmit, trackCTAClick } from './utils/analytics';

document.addEventListener('DOMContentLoaded', () => {
  const router = new Router()
    .register('/', () => fetch('/src/views/home/home.html').then(r => r.text()))
    .register('/services', () => fetch('/src/views/services/services.html').then(r => r.text()))
    .register('/achievements', () => fetch('/src/views/achievements/achievements.html').then(r => r.text()))
    .register('/career', () => fetch('/src/views/career/career.html').then(r => r.text()))
    .register('/contacts', () => fetch('/src/views/contacts/contacts.html').then(r => r.text()))
    .register('/useful', () => fetch('/src/views/useful/useful.html').then(r => r.text()))
    .register('/privacy', () => fetch('/src/views/privacy/privacy.html').then(r => r.text()))
    .register('/404', () => fetch('/src/views/404/404.html').then(r => r.text()));

  router.init();

  initCTAButtons();
  initConsultationForm();
  initMobileMenu();
  initLangToggle();
  initFAQ();
  initHomeArticles();
  initArticlesPage();

  const originalReinit = router.reinitializeEventHandlers.bind(router);
  router.reinitializeEventHandlers = function() {
    originalReinit();
    setTimeout(() => {
      initCTAButtons();
      initConsultationForm();
      initMobileMenu();
      initFAQ();
      initHomeArticles();
      initArticlesPage();
    }, 80);
  };

  function initCTAButtons() {
    const modalEl = document.getElementById('consultationModal');
    if (!modalEl) return;
    const modal = modalEl as HTMLElement;

    document.body.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.cta-button') as HTMLButtonElement | null;
      if (button && button.type !== 'submit' && !button.closest('#consultationForm')) {
        e.preventDefault();
        e.stopPropagation();
        trackCTAClick(button.closest('section')?.className || 'cta');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
      if (target.closest('.modal-close') || target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });

    function closeModal() {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      const formEl = document.getElementById('consultationForm') as HTMLFormElement | null;
      formEl?.reset();
    }
  }

  function initConsultationForm() {
    const formEl = document.getElementById('consultationForm') as HTMLFormElement | null;
    if (!formEl) return;
    const form = formEl as HTMLFormElement;

    const phoneInput = document.getElementById('clientPhone') as HTMLInputElement | null;
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const formatted = formatPhone(target.value);
        if (formatted !== target.value) target.value = formatted;
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = {
        name: (form.querySelector('#clientName') as HTMLInputElement)?.value.trim(),
        phone: (form.querySelector('#clientPhone') as HTMLInputElement)?.value.trim(),
        email: (form.querySelector('#clientEmail') as HTMLInputElement)?.value.trim(),
        type: (form.querySelector('#requestType') as HTMLSelectElement)?.value || '',
        message: (form.querySelector('#clientMessage') as HTMLTextAreaElement)?.value.trim(),
        consent: (form.querySelector('#consent') as HTMLInputElement)?.checked,
      };

      const validation = validateForm(formData as any);
      if (!validation.isValid) {
        showToast(validation.errors.join('\n'), { type: 'error' });
        highlightFormErrors(validation.errors);
        return;
      }

      const identifier = getUserIdentifier();
      if (!checkRateLimit(identifier)) {
        showToast('Слишком много запросов. Попробуйте позже.', { type: 'error' });
        return;
      }

      const result = await submitForm(formData as any);
      if (result.success) {
        showToast(result.message, { type: 'success' });
        trackFormSubmit('consultation');
        form.reset();
        const modal = document.getElementById('consultationModal');
        modal?.classList.remove('active');
        document.body.style.overflow = '';
      } else {
        showToast(result.message, { type: 'error' });
      }
    });

    function highlightFormErrors(errors: string[]) {
      form.querySelectorAll('.form-error').forEach(n => n.remove());
      errors.forEach(err => {
        const field = err.toLowerCase().includes('имя') ? '#clientName'
          : err.toLowerCase().includes('тел') ? '#clientPhone'
          : err.toLowerCase().includes('email') ? '#clientEmail'
          : '#consent';
        const el = form.querySelector(field) as HTMLElement | null;
        if (!el) return;
        const span = document.createElement('span');
        span.className = 'form-error';
        span.textContent = err;
        el.closest('.form-group')?.appendChild(span);
      });
    }
  }

  function initMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle') as HTMLButtonElement | null;
    const navigation = document.getElementById('mainNavigation');
    if (!menuToggle || !navigation) return;

    menuToggle.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    navigation.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navigation.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  async function initHomeArticles() {
    const container = document.getElementById('homeArticlesContainer');
    if (!container) return;
    try {
      const articles = (await loadArticles()).slice(0, 3);
      if (!articles.length) {
        container.innerHTML = '<p class="no-articles">Статьи пока не добавлены.</p>';
        return;
      }
      container.innerHTML = articles.map(renderArticleCard).join('');
    } catch (e) {
      container.innerHTML = '<p class="error-message">Не удалось загрузить статьи.</p>';
    }
  }

  async function initArticlesPage() {
    const container = document.getElementById('articlesContainer');
    if (!container) return;
    const searchInput = document.getElementById('articlesSearch') as HTMLInputElement | null;
    const categorySelect = document.getElementById('articlesCategory') as HTMLSelectElement | null;
    const articles = await loadArticles();

    const render = () => {
      const query = (searchInput?.value || '').toLowerCase();
      const category = categorySelect?.value || '';
      const filtered = articles.filter(a => {
        const matchesQuery = a.title.toLowerCase().includes(query);
        const matchesCategory = category ? a.category === category : true;
        return matchesQuery && matchesCategory;
      });
      if (!filtered.length) {
        container.innerHTML = '<p class="no-articles">Ничего не найдено.</p>';
        return;
      }
      container.innerHTML = filtered.map(renderArticleCard).join('');
    };

    searchInput?.addEventListener('input', render);
    categorySelect?.addEventListener('change', render);
    render();
  }

  function renderArticleCard(article: any): string {
    return `
      <article class="article-card">
        <div class="article-meta">${formatDate(article.date)} · ${article.category}</div>
        <h3 class="article-title">${escapeHtml(article.title)}</h3>
        <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
        <div class="article-tags">${article.tags.map((t: string) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
        <a href="/useful" class="article-link" data-link>Читать далее →</a>
      </article>`;
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function initFAQ() {
    document.querySelectorAll('.faq-item').forEach(item => {
      const question = item.querySelector('.faq-question');
      question?.addEventListener('click', () => {
        item.classList.toggle('open');
      });
    });
  }

  function initLangToggle() {
    const btn = document.getElementById('langToggle') as HTMLButtonElement | null;
    if (!btn) return;
    const saved = localStorage.getItem('lang') || 'ru';
    btn.textContent = saved.toUpperCase();
    document.documentElement.setAttribute('lang', saved);
    btn.addEventListener('click', () => {
      const next = btn.textContent?.toLowerCase() === 'ru' ? 'en' : 'ru';
      btn.textContent = next.toUpperCase();
      document.documentElement.setAttribute('lang', next);
      localStorage.setItem('lang', next);
    });
  }
});
