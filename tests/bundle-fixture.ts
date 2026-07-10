import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ManifestEntry {
  mime: string;
  data: string;
  compressed?: boolean;
}

export interface BundleFixture {
  html: string;
  template: string;
  manifest: Record<string, ManifestEntry>;
}

function scriptBody(html: string, type: string): string {
  const pattern = new RegExp(
    `<script type="${type}">\\s*([\\s\\S]*?)\\s*<\\/script>`,
  );
  const match = html.match(pattern);

  if (!match) {
    throw new Error(`Missing ${type} script`);
  }

  return match[1];
}

export function readBundle(): BundleFixture {
  const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

  return {
    html,
    manifest: JSON.parse(scriptBody(html, '__bundler/manifest')),
    template: JSON.parse(scriptBody(html, '__bundler/template')),
  };
}
