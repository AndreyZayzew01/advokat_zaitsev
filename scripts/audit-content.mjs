import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'src/utils/formHandler.ts',
    pattern: /Заявка принята! В демо-режиме|YOUR_SERVICE_ID|YOUR_TEMPLATE_ID|YOUR_PUBLIC_KEY/,
    message: 'Form handler must not contain demo-success delivery or hardcoded EmailJS placeholders.',
    severity: 'error',
  },
  {
    file: 'index.html',
    pattern: /advokat-zaitsev\.example/,
    message: 'Structured data still contains example domain.',
    severity: 'warning',
  },
  {
    file: 'index.html',
    pattern: /\+7-777-777-77-77|tel:\+77777777777|https:\/\/t\.me\/"/,
    message: 'Public launch contact placeholders are still present.',
    severity: 'warning',
  },
  {
    file: 'public/sitemap.xml',
    pattern: /2026-01-15/,
    message: 'Sitemap lastmod values look stale.',
    severity: 'warning',
  },
];

let errorCount = 0;
let warningCount = 0;

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  if (!check.pattern.test(content)) continue;

  const prefix = check.severity === 'error' ? 'ERROR' : 'WARN';
  console.log(`${prefix}: ${check.file}: ${check.message}`);

  if (check.severity === 'error') {
    errorCount += 1;
  } else {
    warningCount += 1;
  }
}

console.log(`Content audit complete: ${errorCount} error(s), ${warningCount} warning(s).`);

if (errorCount > 0) {
  process.exit(1);
}
