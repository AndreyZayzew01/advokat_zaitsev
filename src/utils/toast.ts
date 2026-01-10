// Система toast-уведомлений

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  type?: ToastType;
}

export function showToast(message: string, options: ToastOptions = {}): void {
  const { duration = 5000, type = 'info' } = options;
  
  // Создаем контейнер для toast, если его нет
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  // Создаем элемент toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  
  // Иконка в зависимости от типа
  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Закрыть">&times;</button>
  `;

  // Добавляем в контейнер
  toastContainer.appendChild(toast);

  // Анимация появления
  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  // Обработчик закрытия
  const closeBtn = toast.querySelector('.toast-close');
  const closeToast = () => {
    toast.classList.remove('toast-show');
    setTimeout(() => {
      toast.remove();
      // Удаляем контейнер, если он пустой
      if (toastContainer && toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  };

  closeBtn?.addEventListener('click', closeToast);

  // Автоматическое закрытие
  if (duration > 0) {
    setTimeout(closeToast, duration);
  }
}

// Экранирование HTML для безопасности
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

