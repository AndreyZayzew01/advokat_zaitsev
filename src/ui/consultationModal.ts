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
