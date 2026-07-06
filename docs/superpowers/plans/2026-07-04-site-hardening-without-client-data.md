# Site Hardening Without Client Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the existing адвокатский сайт without requiring new photos, contacts, backend credentials, or legal copy from the client.

**Architecture:** Keep the current Vite + TypeScript SPA, but make the high-risk behavior honest and testable: no fake successful form delivery, less duplicated initialization logic, better article SEO metadata, and repeatable project checks. Split large browser behavior out of `src/main.ts` into focused modules while preserving the existing routes and HTML views.

**Tech Stack:** Vite 5, TypeScript 5, vanilla HTML/CSS, Vitest, jsdom, GitHub Pages.

## Global Constraints

- Do not replace placeholder phone, email, Telegram, address, photo, or attorney details with invented real data.
- Do not remove existing pages or visible content unless a task explicitly replaces behavior with a safer equivalent.
- Preserve the current SPA route shape: `/`, `/services`, `/achievements`, `/career`, `/contacts`, `/useful`, `/privacy`, `/404`.
- Preserve GitHub Pages deployment through `.github/workflows/deploy.yml`.
- Keep new source files in UTF-8 and avoid mojibake in newly added text.
- Every task must end with `npm run build` passing before commit.

---

## File Structure

- `package.json`: add test and audit scripts plus Vitest dependencies.
- `vitest.config.ts`: configure Vitest with jsdom for browser-oriented unit tests.
- `src/utils/formHandler.ts`: keep validation/formatting/submission logic, but remove demo success and read EmailJS settings from Vite env.
- `src/utils/formHandler.test.ts`: unit tests for validation, phone formatting, rate limiting, and unconfigured submission.
- `src/ui/consultationModal.ts`: delegated CTA modal open/close logic with focus restoration.
- `src/ui/consultationForm.ts`: form binding, phone formatting, submit loading state, validation display.
- `src/ui/mobileMenu.ts`: mobile menu behavior with idempotent initialization.
- `src/ui/faq.ts`: FAQ accordion behavior with idempotent initialization.
- `src/pages/articlesPage.ts`: article list/detail rendering and article SEO calls.
- `src/pages/homeArticles.ts`: home page article preview rendering.
- `src/utils/seo.ts`: dynamic title/meta/canonical/JSON-LD helpers.
- `src/utils/renderArticleCard.ts`: shared article card renderer.
- `scripts/audit-content.mjs`: local content audit for placeholder/demo launch risks.
- `scripts/generate-sitemap.mjs`: generate `public/sitemap.xml` from static routes and `src/data/articles.json`.
- `.github/workflows/deploy.yml`: run tests and content audit before Pages build.

---

### Task 1: Add Test Harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/utils/formHandler.test.ts`

**Interfaces:**
- Consumes: existing exports from `src/utils/formHandler.ts`
- Produces: `npm run test:run` command for later tasks

- [ ] **Step 1: Install test dependencies**

Run:

```powershell
npm install -D vitest jsdom
```

Expected: `package-lock.json` updates and install exits with code 0.

- [ ] **Step 2: Update package scripts**

In `package.json`, replace the `scripts` object with:

```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "audit:content": "node scripts/audit-content.mjs",
  "sitemap": "node scripts/generate-sitemap.mjs"
}
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write initial failing tests**

Create `src/utils/formHandler.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkRateLimit,
  formatPhone,
  getUserIdentifier,
  resetRateLimitForTests,
  submitForm,
  validateForm,
} from './formHandler';

describe('validateForm', () => {
  it('requires name, phone, and consent', () => {
    const result = validateForm({
      name: 'A',
      phone: 'bad-phone',
      email: '',
      type: '',
      message: '',
      consent: false,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Имя должно содержать минимум 2 символа');
    expect(result.errors).toContain('Введите корректный номер телефона');
    expect(result.errors).toContain('Необходимо согласие на обработку персональных данных');
  });

  it('accepts a valid Russian phone and optional email', () => {
    const result = validateForm({
      name: 'Иван',
      phone: '+7 (913) 123-45-67',
      email: 'client@example.com',
      type: 'criminal',
      message: 'Нужна консультация',
      consent: true,
    });

    expect(result).toEqual({ isValid: true, errors: [] });
  });
});

describe('formatPhone', () => {
  it('formats Russian phone digits', () => {
    expect(formatPhone('79131234567')).toBe('+7 (913) 123-45-67');
  });
});

describe('rate limiting', () => {
  beforeEach(() => {
    resetRateLimitForTests();
  });

  it('blocks the fourth submit inside the time window', () => {
    expect(checkRateLimit('client', 3, 60_000)).toBe(true);
    expect(checkRateLimit('client', 3, 60_000)).toBe(true);
    expect(checkRateLimit('client', 3, 60_000)).toBe(true);
    expect(checkRateLimit('client', 3, 60_000)).toBe(false);
  });
});

describe('getUserIdentifier', () => {
  it('creates a stable browser-derived identifier', () => {
    expect(getUserIdentifier()).toContain(navigator.language);
  });
});

describe('submitForm', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete (window as Window & { emailjs?: unknown }).emailjs;
  });

  it('does not pretend success when delivery is not configured', async () => {
    const result = await submitForm({
      name: 'Иван',
      phone: '+7 (913) 123-45-67',
      email: '',
      type: '',
      message: '',
      consent: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Форма пока не подключена к отправке. Пожалуйста, свяжитесь по телефону или через Telegram.');
  });
});
```

- [ ] **Step 5: Run tests to verify the expected failure**

Run:

```powershell
npm run test:run
```

Expected: FAIL because `resetRateLimitForTests` is not exported yet and `submitForm` still returns demo success.

- [ ] **Step 6: Commit the harness**

Run after the expected failure is observed:

```powershell
git add package.json package-lock.json vitest.config.ts src/utils/formHandler.test.ts
git commit -m "test: add vitest harness for form handling"
```

---

### Task 2: Make Form Submission Honest And Configurable

**Files:**
- Modify: `src/utils/formHandler.ts`
- Modify: `src/utils/formHandler.test.ts`

**Interfaces:**
- Consumes: Vite env names `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY`, `VITE_FORM_RECIPIENT_EMAIL`
- Produces: `submitForm(formData: ConsultationFormData): Promise<FormSubmitResult>`

- [ ] **Step 1: Replace form handler implementation**

Replace `src/utils/formHandler.ts` with:

```ts
export interface ConsultationFormData {
  name: string;
  phone: string;
  email?: string;
  type: string;
  message: string;
  consent: boolean;
}

export interface FormSubmitResult {
  success: boolean;
  message: string;
}

interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  recipientEmail: string;
}

type EmailJSClient = {
  send: (
    serviceId: string,
    templateId: string,
    params: Record<string, string>,
    publicKey: string
  ) => Promise<unknown>;
};

const FORM_NOT_CONFIGURED_MESSAGE =
  'Форма пока не подключена к отправке. Пожалуйста, свяжитесь по телефону или через Telegram.';

export function validateForm(formData: ConsultationFormData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!formData.name || formData.name.trim().length < 2) {
    errors.push('Имя должно содержать минимум 2 символа');
  }

  if (!formData.phone || !isValidPhone(formData.phone)) {
    errors.push('Введите корректный номер телефона');
  }

  if (formData.email && !isValidEmail(formData.email)) {
    errors.push('Введите корректный email адрес');
  }

  if (!formData.consent) {
    errors.push('Необходимо согласие на обработку персональных данных');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s()+-]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 10;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.startsWith('8') ? `7${digits.slice(1)}` : digits;

  if (normalized.length === 0) return '';
  if (normalized.length <= 1) return `+7 (${normalized.slice(1)}`;
  if (normalized.length <= 4) return `+7 (${normalized.slice(1)}`;
  if (normalized.length <= 7) return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4)}`;
  if (normalized.length <= 9) return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7)}`;
  return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9, 11)}`;
}

const submitHistory: Map<string, number[]> = new Map();

export function checkRateLimit(identifier: string, maxSubmits = 3, timeWindow = 60_000): boolean {
  const now = Date.now();
  const userSubmits = submitHistory.get(identifier) || [];
  const recentSubmits = userSubmits.filter(time => now - time < timeWindow);

  if (recentSubmits.length >= maxSubmits) {
    return false;
  }

  recentSubmits.push(now);
  submitHistory.set(identifier, recentSubmits);
  return true;
}

export function resetRateLimitForTests(): void {
  submitHistory.clear();
}

export function getUserIdentifier(): string {
  return `${navigator.userAgent}:${navigator.language || ''}`;
}

function getEmailJSConfig(): EmailJSConfig | null {
  const env = import.meta.env;
  const serviceId = env.VITE_EMAILJS_SERVICE_ID;
  const templateId = env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = env.VITE_EMAILJS_PUBLIC_KEY;
  const recipientEmail = env.VITE_FORM_RECIPIENT_EMAIL || 'info@advokat-zaitsev.ru';

  if (!serviceId || !templateId || !publicKey) {
    return null;
  }

  return {
    serviceId,
    templateId,
    publicKey,
    recipientEmail,
  };
}

export function isFormDeliveryConfigured(): boolean {
  return Boolean(getEmailJSConfig() && (window as Window & { emailjs?: EmailJSClient }).emailjs);
}

export async function submitForm(formData: ConsultationFormData): Promise<FormSubmitResult> {
  const config = getEmailJSConfig();
  const emailjs = (window as Window & { emailjs?: EmailJSClient }).emailjs;

  if (!config || !emailjs) {
    return {
      success: false,
      message: FORM_NOT_CONFIGURED_MESSAGE,
    };
  }

  try {
    await emailjs.send(
      config.serviceId,
      config.templateId,
      {
        from_name: formData.name,
        from_phone: formData.phone,
        from_email: formData.email || 'не указан',
        consultation_type: formData.type || 'не указан',
        message: formData.message || 'не указано',
        to_email: config.recipientEmail,
      },
      config.publicKey
    );

    return {
      success: true,
      message: 'Заявка успешно отправлена. Я свяжусь с вами в ближайшее время.',
    };
  } catch (error) {
    console.error('Ошибка отправки формы:', error);
    return {
      success: false,
      message: 'Не удалось отправить заявку. Пожалуйста, попробуйте позже или свяжитесь напрямую.',
    };
  }
}
```

- [ ] **Step 2: Run tests**

Run:

```powershell
npm run test:run
```

Expected: PASS for `src/utils/formHandler.test.ts`.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm run build
```

Expected: TypeScript and Vite build both pass.

- [ ] **Step 4: Commit**

```powershell
git add src/utils/formHandler.ts src/utils/formHandler.test.ts
git commit -m "fix: make consultation form delivery explicit"
```

---

### Task 3: Split Browser Behavior Out Of main.ts

**Files:**
- Create: `src/ui/consultationModal.ts`
- Create: `src/ui/consultationForm.ts`
- Create: `src/ui/mobileMenu.ts`
- Create: `src/ui/faq.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `validateForm`, `formatPhone`, `checkRateLimit`, `getUserIdentifier`, `submitForm`
- Produces: `initConsultationModal()`, `initConsultationForm()`, `initMobileMenu()`, `initFAQ()`

- [ ] **Step 1: Create modal module**

Create `src/ui/consultationModal.ts`:

```ts
import { trackCTAClick } from '../utils/analytics';

const INIT_KEY = 'ctaInitialized';

export function initConsultationModal(): void {
  const modal = document.getElementById('consultationModal') as HTMLElement | null;
  if (!modal || document.body.dataset[INIT_KEY] === 'true') return;

  document.body.dataset[INIT_KEY] = 'true';
  let opener: HTMLElement | null = null;

  document.body.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const button = target.closest('.cta-button') as HTMLButtonElement | null;

    if (button && button.type !== 'submit' && !button.closest('#consultationForm')) {
      event.preventDefault();
      event.stopPropagation();
      opener = button;
      trackCTAClick(button.closest('section')?.className || 'cta');
      openModal(modal);
    }

    if (target.closest('.modal-close') || target === modal) {
      closeModal(modal, opener);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('active')) {
      closeModal(modal, opener);
    }
  });
}

function openModal(modal: HTMLElement): void {
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const firstField = modal.querySelector<HTMLInputElement>('input, select, textarea, button');
  firstField?.focus();
}

function closeModal(modal: HTMLElement, opener: HTMLElement | null): void {
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  document.getElementById('consultationForm')?.dispatchEvent(new CustomEvent('consultation:reset'));
  opener?.focus();
}
```

- [ ] **Step 2: Create form module**

Create `src/ui/consultationForm.ts`:

```ts
import {
  checkRateLimit,
  ConsultationFormData,
  formatPhone,
  getUserIdentifier,
  submitForm,
  validateForm,
} from '../utils/formHandler';
import { showToast } from '../utils/toast';
import { trackFormSubmit } from '../utils/analytics';

const INIT_KEY = 'consultationFormInitialized';

export function initConsultationForm(): void {
  const form = document.getElementById('consultationForm') as HTMLFormElement | null;
  if (!form || form.dataset[INIT_KEY] === 'true') return;

  form.dataset[INIT_KEY] = 'true';

  const phoneInput = document.getElementById('clientPhone') as HTMLInputElement | null;
  phoneInput?.addEventListener('input', event => {
    const target = event.target as HTMLInputElement;
    const formatted = formatPhone(target.value);
    if (formatted !== target.value) target.value = formatted;
  });

  form.addEventListener('consultation:reset', () => {
    form.reset();
    clearFormErrors(form);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    clearFormErrors(form);

    const formData = readFormData(form);
    const validation = validateForm(formData);

    if (!validation.isValid) {
      showToast(validation.errors.join('\n'), { type: 'error' });
      highlightFormErrors(form, validation.errors);
      return;
    }

    if (!checkRateLimit(getUserIdentifier())) {
      showToast('Слишком много запросов. Попробуйте позже.', { type: 'error' });
      return;
    }

    setSubmitState(form, true);
    const result = await submitForm(formData);
    setSubmitState(form, false);

    showToast(result.message, { type: result.success ? 'success' : 'error' });

    if (result.success) {
      trackFormSubmit('consultation');
      form.reset();
      document.getElementById('consultationModal')?.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

function readFormData(form: HTMLFormElement): ConsultationFormData {
  return {
    name: (form.querySelector('#clientName') as HTMLInputElement | null)?.value.trim() || '',
    phone: (form.querySelector('#clientPhone') as HTMLInputElement | null)?.value.trim() || '',
    email: (form.querySelector('#clientEmail') as HTMLInputElement | null)?.value.trim() || '',
    type: (form.querySelector('#requestType') as HTMLSelectElement | null)?.value || '',
    message: (form.querySelector('#clientMessage') as HTMLTextAreaElement | null)?.value.trim() || '',
    consent: Boolean((form.querySelector('#consent') as HTMLInputElement | null)?.checked),
  };
}

function clearFormErrors(form: HTMLFormElement): void {
  form.querySelectorAll('.form-error').forEach(node => node.remove());
}

function highlightFormErrors(form: HTMLFormElement, errors: string[]): void {
  errors.forEach(error => {
    const field = error.toLowerCase().includes('имя')
      ? '#clientName'
      : error.toLowerCase().includes('телефон')
        ? '#clientPhone'
        : error.toLowerCase().includes('email')
          ? '#clientEmail'
          : '#consent';

    const element = form.querySelector(field) as HTMLElement | null;
    if (!element) return;

    const message = document.createElement('span');
    message.className = 'form-error';
    message.textContent = error;
    element.closest('.form-group')?.appendChild(message);
  });
}

function setSubmitState(form: HTMLFormElement, isSubmitting: boolean): void {
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!submitButton) return;

  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? 'Отправка...' : 'Отправить';
}
```

- [ ] **Step 3: Create mobile menu module**

Create `src/ui/mobileMenu.ts`:

```ts
const INIT_KEY = 'mobileMenuInitialized';

export function initMobileMenu(): void {
  const menuToggle = document.querySelector('.mobile-menu-toggle') as HTMLButtonElement | null;
  const navigation = document.getElementById('mainNavigation');

  if (!menuToggle || !navigation || menuToggle.dataset[INIT_KEY] === 'true') return;

  menuToggle.dataset[INIT_KEY] = 'true';

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
```

- [ ] **Step 4: Create FAQ module**

Create `src/ui/faq.ts`:

```ts
const INIT_KEY = 'faqInitialized';

export function initFAQ(): void {
  document.querySelectorAll<HTMLElement>('.faq-item').forEach(item => {
    if (item.dataset[INIT_KEY] === 'true') return;

    item.dataset[INIT_KEY] = 'true';
    const question = item.querySelector('.faq-question');

    question?.addEventListener('click', () => {
      item.classList.toggle('open');
    });
  });
}
```

- [ ] **Step 5: Update `src/main.ts` imports and remove moved functions**

At the top of `src/main.ts`, remove these imports:

```ts
import { validateForm, formatPhone, checkRateLimit, getUserIdentifier, submitForm } from './utils/formHandler';
import { showToast } from './utils/toast';
import { trackFormSubmit, trackCTAClick } from './utils/analytics';
```

Add:

```ts
import { initConsultationModal } from './ui/consultationModal';
import { initConsultationForm } from './ui/consultationForm';
import { initMobileMenu } from './ui/mobileMenu';
import { initFAQ } from './ui/faq';
```

Replace calls to `initCTAButtons()` with `initConsultationModal()`.

Delete the local function bodies for `initCTAButtons`, `initConsultationForm`, `initMobileMenu`, and `initFAQ` from `src/main.ts`.

- [ ] **Step 6: Verify**

Run:

```powershell
npm run test:run
npm run build
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```powershell
git add src/main.ts src/ui/consultationModal.ts src/ui/consultationForm.ts src/ui/mobileMenu.ts src/ui/faq.ts
git commit -m "refactor: split browser UI initializers"
```

---

### Task 4: Extract Article Rendering And SEO Helpers

**Files:**
- Create: `src/utils/seo.ts`
- Create: `src/utils/renderArticleCard.ts`
- Create: `src/pages/homeArticles.ts`
- Create: `src/pages/articlesPage.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `Article`, `loadArticles`, `loadArticleHtml`, `formatDate`
- Produces: `initHomeArticles()`, `initArticlesPage()`, `setPageSEO(opts)`, `setArticleJsonLd(article)`

- [ ] **Step 1: Create SEO helper**

Create `src/utils/seo.ts`:

```ts
import type { Article } from './articles';

export type PageSEOOptions = {
  title: string;
  description: string;
  ogType?: 'website' | 'article';
  canonicalPath?: string;
};

export function setPageSEO(opts: PageSEOOptions): void {
  document.title = opts.title;
  setMetaByName('description', opts.description);
  setMetaByProperty('og:title', opts.title);
  setMetaByProperty('og:description', opts.description);
  if (opts.ogType) setMetaByProperty('og:type', opts.ogType);
  if (opts.canonicalPath) setCanonical(opts.canonicalPath);
}

export function setArticleJsonLd(article: Article): void {
  const existing = document.getElementById('article-json-ld');
  existing?.remove();

  const script = document.createElement('script');
  script.id = 'article-json-ld';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    author: {
      '@type': 'Person',
      name: 'Зайцев В.О.',
    },
  });
  document.head.appendChild(script);
}

export function clearArticleJsonLd(): void {
  document.getElementById('article-json-ld')?.remove();
}

function setMetaByName(name: string, content: string): void {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function setMetaByProperty(property: string, content: string): void {
  let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function setCanonical(path: string): void {
  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const href = `${origin}${base}${normalizedPath}`;

  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}
```

- [ ] **Step 2: Create shared article card renderer**

Create `src/utils/renderArticleCard.ts`:

```ts
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
```

- [ ] **Step 3: Create home articles module**

Create `src/pages/homeArticles.ts`:

```ts
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
```

- [ ] **Step 4: Create articles page module**

Create `src/pages/articlesPage.ts` with the article logic currently inside `src/main.ts`, using these imports:

```ts
import { formatDate, loadArticleHtml, loadArticles } from '../utils/articles';
import { clearArticleJsonLd, setArticleJsonLd, setPageSEO } from '../utils/seo';
import { escapeHtml, renderArticleCard } from '../utils/renderArticleCard';
```

Use these exact SEO values:

```ts
setPageSEO({
  title: `${article.title} — Адвокат Зайцев В.О.`,
  description: article.excerpt,
  ogType: 'article',
  canonicalPath: `/useful?article=${encodeURIComponent(article.slug)}`,
});
setArticleJsonLd(article);
```

For the list view, use:

```ts
clearArticleJsonLd();
setPageSEO({
  title: 'Полезное — Адвокат Зайцев В.О.',
  description: 'Подборка статей и разборов кейсов по семейному, наследственному, уголовному праву и недвижимости.',
  ogType: 'website',
  canonicalPath: '/useful',
});
```

- [ ] **Step 5: Update main.ts**

Remove local `initHomeArticles`, `initArticlesPage`, `renderArticleCard`, `escapeHtml`, and SEO helper functions from `src/main.ts`.

Add imports:

```ts
import { initHomeArticles } from './pages/homeArticles';
import { initArticlesPage } from './pages/articlesPage';
```

- [ ] **Step 6: Verify**

Run:

```powershell
npm run test:run
npm run build
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```powershell
git add src/main.ts src/utils/seo.ts src/utils/renderArticleCard.ts src/pages/homeArticles.ts src/pages/articlesPage.ts
git commit -m "refactor: isolate article rendering and seo"
```

---

### Task 5: Add Content Audit Script

**Files:**
- Create: `scripts/audit-content.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: repository files
- Produces: `npm run audit:content`

- [ ] **Step 1: Create script directory**

Run:

```powershell
New-Item -ItemType Directory -Force -Path scripts | Out-Null
```

- [ ] **Step 2: Create content audit script**

Create `scripts/audit-content.mjs`:

```js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'src/utils/formHandler.ts',
    pattern: /Заявка принята! В демо-режиме|YOUR_SERVICE_ID|YOUR_TEMPLATE_ID|YOUR_PUBLIC_KEY/,
    message: 'Form handler must not contain demo-success delivery or hardcoded EmailJS placeholders.',
    severity: 'error',
  },
  {
    file: 'index.html',
    pattern: /advokat-zaitsev\.example/,
    message: 'Structured data still contains example domain.',
    severity: 'warning',
  },
  {
    file: 'index.html',
    pattern: /\+7-777-777-77-77|tel:\+77777777777|https:\/\/t\.me\/"/,
    message: 'Public launch contact placeholders are still present.',
    severity: 'warning',
  },
  {
    file: 'public/sitemap.xml',
    pattern: /2026-01-15/,
    message: 'Sitemap lastmod values look stale.',
    severity: 'warning',
  },
];

let errorCount = 0;
let warningCount = 0;

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  if (!check.pattern.test(content)) continue;

  const prefix = check.severity === 'error' ? 'ERROR' : 'WARN';
  console.log(`${prefix}: ${check.file}: ${check.message}`);

  if (check.severity === 'error') {
    errorCount += 1;
  } else {
    warningCount += 1;
  }
}

console.log(`Content audit complete: ${errorCount} error(s), ${warningCount} warning(s).`);

if (errorCount > 0) {
  process.exit(1);
}
```

- [ ] **Step 3: Verify script is wired**

Run:

```powershell
npm run audit:content
```

Expected: exits with code 0 after Task 2; warnings about public placeholder contacts are acceptable until real client data is provided.

- [ ] **Step 4: Verify full project**

Run:

```powershell
npm run test:run
npm run build
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```powershell
git add scripts/audit-content.mjs package.json package-lock.json
git commit -m "chore: add content launch audit"
```

---

### Task 6: Generate Sitemap From Routes And Articles

**Files:**
- Create: `scripts/generate-sitemap.mjs`
- Modify: `public/sitemap.xml`
- Modify: `package.json`

**Interfaces:**
- Consumes: `src/data/articles.json`
- Produces: `public/sitemap.xml`

- [ ] **Step 1: Create sitemap generator**

Create `scripts/generate-sitemap.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const siteUrl = 'https://advokat-zaitsev.ru';
const today = new Date().toISOString().slice(0, 10);
const articles = JSON.parse(readFileSync(join(root, 'src/data/articles.json'), 'utf8'));

const staticRoutes = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/services', changefreq: 'monthly', priority: '0.8' },
  { loc: '/achievements', changefreq: 'monthly', priority: '0.7' },
  { loc: '/career', changefreq: 'monthly', priority: '0.7' },
  { loc: '/contacts', changefreq: 'monthly', priority: '0.8' },
  { loc: '/useful', changefreq: 'weekly', priority: '0.8' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

const articleRoutes = articles.map(article => ({
  loc: `/useful?article=${encodeURIComponent(article.slug)}`,
  lastmod: article.date,
  changefreq: 'monthly',
  priority: '0.6',
}));

const urls = [...staticRoutes.map(route => ({ ...route, lastmod: today })), ...articleRoutes];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${escapeXml(`${siteUrl}${url.loc}`)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

writeFileSync(join(root, 'public/sitemap.xml'), xml);
console.log(`Generated sitemap with ${urls.length} URLs.`);

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
```

- [ ] **Step 2: Generate sitemap**

Run:

```powershell
npm run sitemap
```

Expected: `public/sitemap.xml` includes static routes and all article query URLs.

- [ ] **Step 3: Run content audit and build**

Run:

```powershell
npm run audit:content
npm run test:run
npm run build
```

Expected: audit exits 0, tests pass, build passes.

- [ ] **Step 4: Commit**

```powershell
git add scripts/generate-sitemap.mjs public/sitemap.xml package.json
git commit -m "chore: generate sitemap from content"
```

---

### Task 7: Strengthen CI Before Deploy

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: npm scripts `test:run`, `audit:content`, `build`
- Produces: Pages deployment that runs tests and audit before upload

- [ ] **Step 1: Update workflow build steps**

In `.github/workflows/deploy.yml`, insert after `npm ci`:

```yaml
      - name: Run tests
        run: npm run test:run

      - name: Run content audit
        run: npm run audit:content
```

Keep the existing `Build`, `Copy SPA fallback`, and deploy steps.

- [ ] **Step 2: Verify workflow YAML locally**

Run:

```powershell
npm run test:run
npm run audit:content
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 3: Commit**

```powershell
git add .github/workflows/deploy.yml
git commit -m "ci: verify tests and content audit before deploy"
```

---

### Task 8: Manual Browser Verification

**Files:**
- No source files unless verification finds a defect.

**Interfaces:**
- Consumes: built app behavior
- Produces: verified user flows

- [ ] **Step 1: Start local dev server**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/advokat_zaitsev/`.

- [ ] **Step 2: Verify navigation**

Open the local URL and click:

```text
Главная
Услуги
Достижения
Карьера
Контакты
Полезное
Политика конфиденциальности
```

Expected: each route renders without full page reload, active nav updates, mobile menu closes after nav click.

- [ ] **Step 3: Verify form behavior without delivery config**

Open the consultation modal, enter:

```text
Имя: Иван
Телефон: +7 (913) 123-45-67
Email: client@example.com
Тип обращения: любое значение
Кратко о ситуации: Нужна консультация
Согласие: checked
```

Submit.

Expected: error toast says `Форма пока не подключена к отправке. Пожалуйста, свяжитесь по телефону или через Telegram.` and does not claim successful delivery.

- [ ] **Step 4: Verify article list and detail**

Open `/useful`, search for `допрос`, open the matching article.

Expected: detail view renders article HTML, title changes to the article title, back link returns to `/useful`.

- [ ] **Step 5: Final verification commands**

Stop the dev server and run:

```powershell
npm run test:run
npm run audit:content
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 6: Commit only if a verification fix was needed**

If a source fix was made during manual verification:

```powershell
git add .
git commit -m "fix: address browser verification issue"
```

If no source fix was needed, do not create a commit for this task.

---

## Self-Review

**Spec coverage:** The plan covers form honesty/configuration, modularization of `main.ts`, article SEO helpers, sitemap generation, content audit, CI checks, and manual verification. It intentionally does not replace real contacts, photo, address, Telegram handle, pricing, or legal claims because those require client-provided information.

**Placeholder scan:** No task relies on undefined future data. The audit script records public placeholder contacts as warnings, not errors, because replacing them is outside this plan.

**Type consistency:** `ConsultationFormData`, `FormSubmitResult`, `initConsultationModal`, `initConsultationForm`, `initMobileMenu`, `initFAQ`, `initHomeArticles`, `initArticlesPage`, `setPageSEO`, and `renderArticleCard` are defined before later tasks consume them.
