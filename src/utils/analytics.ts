// Утилиты для аналитики

// Инициализация Google Analytics
export function initGoogleAnalytics(measurementId?: string): void {
  if (!measurementId) {
    console.warn('Google Analytics measurement ID не указан');
    return;
  }

  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId);
}

// Инициализация Яндекс.Метрики
export function initYandexMetrika(counterId?: number): void {
  if (!counterId) {
    console.warn('Яндекс.Метрика counter ID не указан');
    return;
  }

  (window as any).ym = (window as any).ym || function(...args: any[]) {
    ((window as any).ym.a = (window as any).ym.a || []).push(args);
  };
  (window as any).ym.l = 1 * new Date().getTime();

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://mc.yandex.ru/metrika/tag.js`;
  document.head.appendChild(script);

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${counterId}" style="position:absolute; left:-9999px;" alt="" /></div>`;
  document.body.appendChild(noscript);

  (window as any).ym(counterId, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true
  });
}

// Отслеживание события
export function trackEvent(category: string, action: string, label?: string): void {
  if ((window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }

  if ((window as any).ym) {
    (window as any).ym('reachGoal', `${category}_${action}`, { label });
  }
}

// Отслеживание отправки формы
export function trackFormSubmit(formType: string): void {
  trackEvent('Form', 'Submit', formType);
}

// Отслеживание клика по CTA
export function trackCTAClick(ctaLocation: string): void {
  trackEvent('CTA', 'Click', ctaLocation);
}

