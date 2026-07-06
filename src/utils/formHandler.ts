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
