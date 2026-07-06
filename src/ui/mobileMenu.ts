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
