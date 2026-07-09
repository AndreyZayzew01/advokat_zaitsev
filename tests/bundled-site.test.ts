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
