import { describe, expect, it } from 'vitest';
import { readBundle } from './bundle-fixture';

describe('Claude bundle baseline', () => {
  it('keeps the supplied unpacker and custom runtime', () => {
    const { html, template, manifest } = readBundle();

    expect(html).toContain('id="__bundler_loading"');
    expect(html).toContain('type="__bundler/manifest"');
    expect(html).toContain('type="__bundler/template"');
    expect(template).toContain('<x-dc>');
    expect(template).toContain('<sc-if');
    expect(template).toContain('<sc-for');
    expect(template).toContain('class Component extends DCLogic');
    expect(Object.keys(manifest).length).toBeGreaterThan(10);
  });

  it('keeps the Claude palette and all one-page sections', () => {
    const { template } = readBundle();

    expect(template).toContain('scroll-behavior:smooth');

    for (const color of [
      '#111925',
      '#1c2430',
      '#bd9a5c',
      '#c8a763',
      '#f4f1ea',
      '#f4efe6',
      '#fdfbf7',
    ]) {
      expect(template).toContain(color);
    }

    for (const id of [
      'trust',
      'services',
      'situations',
      'process',
      'formats',
      'geo',
      'about',
      'docs',
      'reviews',
      'cases',
      'contacts',
      'form',
      'faq',
      'articles',
    ]) {
      expect(template).toContain(`id="${id}"`);
    }
  });
});

describe('personalized content', () => {
  it('uses existing lawyer and contact data', () => {
    const { template } = readBundle();

    expect(template).toContain("name: 'Зайцев Валерий Олегович'");
    expect(template).toContain("monogram: 'ЗО'");
    expect(template).toContain("phoneDisplay: '+7 (777) 777-77-77'");
    expect(template).toContain("phoneHref: '+77777777777'");
    expect(template).toContain("tgUrl: 'https://t.me/'");
    expect(template).toContain("email: 'info@advokat-zaitsev.ru'");
    expect(template).toContain("address: 'с. Бея, ул. Магистральная, д. 11г'");
    expect(template).toContain('Более 15 лет практики');
    expect(template).toContain('Приём в офисе в с. Бея.');
    expect(template).toContain("y: '2008'");
    expect(template).toContain("y: '2020–настоящее время'");
  });

  it('embeds the existing portrait in the bundle manifest', () => {
    const { template, manifest } = readBundle();
    const photo = manifest['advokat-zaitsev-photo'];

    expect(photo.mime).toBe('image/jpeg');
    expect(photo.compressed).toBe(false);
    expect(photo.data.length).toBeGreaterThan(1_000);
    expect(template).toContain('src="advokat-zaitsev-photo"');
    expect(template).toContain(
      'alt="Адвокат Зайцев Валерий Олегович"',
    );
  });

  it('uses the six existing article titles and excerpts', () => {
    const { template } = readBundle();

    for (const title of [
      'Как защитить свои права при разводе',
      'Наследство: что нужно знать',
      'Покупка квартиры на вторичном рынке: что проверить до сделки',
      'Если вас задержали: что делать сразу',
      'Допрос: как себя вести, чтобы не навредить себе',
      'Повестка, вызов, опрос, допрос: в чем разница и почему это важно',
    ]) {
      expect(template).toContain(title);
    }
  });
});
