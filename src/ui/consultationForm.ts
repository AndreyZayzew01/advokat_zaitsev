import {
  checkRateLimit,
  formatPhone,
  getUserIdentifier,
  submitForm,
  validateForm,
} from '../utils/formHandler';
import type { ConsultationFormData } from '../utils/formHandler';
import { trackFormSubmit } from '../utils/analytics';
import { showToast } from '../utils/toast';

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
