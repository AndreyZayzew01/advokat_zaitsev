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
