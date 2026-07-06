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
