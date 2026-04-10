import { Router } from './router';
import { validateForm, formatPhone, checkRateLimit, getUserIdentifier, submitForm } from './utils/formHandler';
import { showToast } from './utils/toast';
import { loadArticles, loadArticleHtml, formatDate } from './utils/articles';
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
        setPageSEO({
          title: 'Статья не найдена — Адвокат Зайцев В.О.',
          description: 'Статья не найдена. Перейдите в раздел «Полезное», чтобы выбрать другую публикацию.',
          ogType: 'website',
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
      });

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

    // List view
    filterBar?.classList.remove('is-hidden');
    if (pageTitleEl) pageTitleEl.textContent = 'Полезное';
    if (pageSubtitleEl) pageSubtitleEl.textContent = 'Подборка статей и разборов кейсов.';
    setPageSEO({
      title: 'Полезное — Адвокат Зайцев В.О.',
      description: 'Подборка статей и разборов кейсов по семейному и наследственному праву.',
      ogType: 'website',
    });

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
        <a href="/useful?article=${encodeURIComponent(article.slug)}" class="article-link" data-link>Читать далее →</a>
      </article>`;
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  type PageSEOOptions = {
    title: string;
    description: string;
    ogType?: 'website' | 'article';
  };

  function setMetaByName(name: string, content: string) {
    let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function setMetaByProperty(property: string, content: string) {
    let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function setPageSEO(opts: PageSEOOptions) {
    document.title = opts.title;
    setMetaByName('description', opts.description);
    setMetaByProperty('og:title', opts.title);
    setMetaByProperty('og:description', opts.description);
    if (opts.ogType) setMetaByProperty('og:type', opts.ogType);
  }

  function initFAQ() {
    document.querySelectorAll('.faq-item').forEach(item => {
      const question = item.querySelector('.faq-question');
      question?.addEventListener('click', () => {
        item.classList.toggle('open');
      });
    });
  }

});
