// Обработчик формы консультации

interface FormData {
  name: string;
  phone: string;
  email?: string;
  type: string;
  contactMethod: string;
  contactTime: string;
  consent: boolean;
}

// Валидация формы
export function validateForm(formData: FormData): { isValid: boolean; errors: string[] } {
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

  if (!formData.contactMethod) {
    errors.push('Выберите удобный способ связи');
  }

  if (!formData.contactTime) {
    errors.push('Укажите удобное время для звонка/связи');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Проверка телефона
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s()+-]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 10;
}

// Проверка email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Форматирование телефона
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  if (digits.length <= 1) return `+7 (${digits}`;
  if (digits.length <= 4) return `+7 (${digits.slice(1)}`;
  if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

// Rate limiting - простая защита от спама
const submitHistory: Map<string, number[]> = new Map();

export function checkRateLimit(identifier: string, maxSubmits: number = 3, timeWindow: number = 60000): boolean {
  const now = Date.now();
  const userSubmits = submitHistory.get(identifier) || [];
  
  // Удаляем старые записи
  const recentSubmits = userSubmits.filter(time => now - time < timeWindow);
  
  if (recentSubmits.length >= maxSubmits) {
    return false;
  }
  
  recentSubmits.push(now);
  submitHistory.set(identifier, recentSubmits);
  return true;
}

// Получение идентификатора пользователя (упрощенный вариант)
export function getUserIdentifier(): string {
  return navigator.userAgent + (navigator.language || '');
}

// Отправка формы через EmailJS
export async function submitForm(formData: FormData): Promise<{ success: boolean; message: string }> {
  // Проверка наличия EmailJS
  if (typeof (window as any).emailjs === 'undefined') {
    // Fallback: просто показываем сообщение об успехе (для демо)
    console.warn('EmailJS не загружен. Используется демо-режим.');
    return {
      success: true,
      message: 'Заявка принята! В демо-режиме данные не отправляются. Настройте EmailJS для реальной отправки.'
    };
  }

  try {
    const emailjs = (window as any).emailjs;
    
    // Параметры для EmailJS (нужно настроить в EmailJS dashboard)
    const serviceId = 'YOUR_SERVICE_ID'; // Заменить на реальный
    const templateId = 'YOUR_TEMPLATE_ID'; // Заменить на реальный
    const publicKey = 'YOUR_PUBLIC_KEY'; // Заменить на реальный

    const templateParams = {
      from_name: formData.name,
      from_phone: formData.phone,
      from_email: formData.email || 'не указан',
      consultation_type: formData.type || 'не указан',
      message: formData.message || 'не указано',
      to_email: 'info@advokat-zaitsev.ru'
    };

    await emailjs.send(serviceId, templateId, templateParams, publicKey);
    
    return {
      success: true,
      message: 'Заявка успешно отправлена! Я свяжусь с вами в ближайшее время.'
    };
  } catch (error) {
    console.error('Ошибка отправки формы:', error);
    return {
      success: false,
      message: 'Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже или свяжитесь со мной напрямую.'
    };
  }
}

