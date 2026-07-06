import { Router } from './router';
import { initArticlesPage } from './pages/articlesPage';
import { initHomeArticles } from './pages/homeArticles';
import { initConsultationForm } from './ui/consultationForm';
import { initConsultationModal } from './ui/consultationModal';
import { initFAQ } from './ui/faq';
import { initMobileMenu } from './ui/mobileMenu';
import homeHtml from './views/home/home.html?raw';
import servicesHtml from './views/services/services.html?raw';
import achievementsHtml from './views/achievements/achievements.html?raw';
import careerHtml from './views/career/career.html?raw';
import contactsHtml from './views/contacts/contacts.html?raw';
import usefulHtml from './views/useful/useful.html?raw';
import privacyHtml from './views/privacy/privacy.html?raw';
import notFoundHtml from './views/404/404.html?raw';
import './views/home/home.css';
import './views/services/services.css';
import './views/achievements/achievements.css';
import './views/career/career.css';
import './views/contacts/contacts.css';
import './views/useful/useful.css';
import './views/privacy/privacy.css';
import './views/404/404.css';

document.addEventListener('DOMContentLoaded', () => {
  const router = new Router()
    .register('/', () => Promise.resolve(homeHtml))
    .register('/services', () => Promise.resolve(servicesHtml))
    .register('/achievements', () => Promise.resolve(achievementsHtml))
    .register('/career', () => Promise.resolve(careerHtml))
    .register('/contacts', () => Promise.resolve(contactsHtml))
    .register('/useful', () => Promise.resolve(usefulHtml))
    .register('/privacy', () => Promise.resolve(privacyHtml))
    .register('/404', () => Promise.resolve(notFoundHtml));

  const originalReinit = router.reinitializeEventHandlers.bind(router);
  router.reinitializeEventHandlers = function() {
    originalReinit();
    setTimeout(initializePageHandlers, 80);
  };

  router.init();
  initializePageHandlers();
});

function initializePageHandlers(): void {
  initConsultationModal();
  initConsultationForm();
  initMobileMenu();
  initFAQ();
  void initHomeArticles();
  void initArticlesPage();
}
