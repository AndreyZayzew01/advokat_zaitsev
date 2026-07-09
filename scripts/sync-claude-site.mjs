import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(root, 'vendor', 'claude-site.html');
const photoPath = join(root, 'assets', 'advocat_photo.jpg');
const outputPath = join(root, 'index.html');

let html = readFileSync(sourcePath, 'utf8');

function scriptMatch(type) {
  const pattern = new RegExp(
    `<script type="${type}">\\s*([\\s\\S]*?)\\s*<\\/script>`,
  );
  const match = html.match(pattern);

  if (!match) {
    throw new Error(`Missing ${type}`);
  }

  return { pattern, body: match[1] };
}

function replaceOnce(value, before, after, label) {
  const parts = value.split(before);

  if (parts.length !== 2) {
    throw new Error(`${label}: expected one match, found ${parts.length - 1}`);
  }

  return `${parts[0]}${after}${parts[1]}`;
}

function replacePatternOnce(value, pattern, after, label) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = value.match(new RegExp(pattern.source, flags));

  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: expected one match, found ${matches?.length ?? 0}`);
  }

  return value.replace(pattern, after);
}

function scriptJson(value, space) {
  return JSON.stringify(value, null, space).replace(/<\/script/gi, '<\\/script');
}

function moveNoscriptFallbackOutOfHead(value) {
  const pattern =
    /  <noscript>\r?\n    <style>#__bundler_loading \{ display: none; \}<\/style>\r?\n    (<div style="position:fixed;bottom:12px;left:12px;[\s\S]*?<\/div>)\r?\n  <\/noscript>/;
  const match = value.match(pattern);

  if (!match) {
    throw new Error('move noscript fallback: expected one head noscript block');
  }

  const headNoscript = `  <noscript>
    <style>#__bundler_loading { display: none; }</style>
  </noscript>`;
  const bodyNoscript = `<body>
  <noscript>
    ${match[1]}
  </noscript>`;

  return value.replace(pattern, headNoscript).replace('<body>', bodyNoscript);
}

const manifestScript = scriptMatch('__bundler/manifest');
const templateScript = scriptMatch('__bundler/template');
const manifest = JSON.parse(manifestScript.body);
let template = JSON.parse(templateScript.body);

manifest['advokat-zaitsev-photo'] = {
  mime: 'image/jpeg',
  data: readFileSync(photoPath).toString('base64'),
  compressed: false,
};

const literalReplacements = [
  ["name: 'Фамилия Имя Отчество'", "name: 'Зайцев Валерий Олегович'"],
  ["monogram: 'АА'", "monogram: 'ЗО'"],
  ["phoneDisplay: '+7 (000) 000-00-00'", "phoneDisplay: '+7 (777) 777-77-77'"],
  ["phoneHref: '+70000000000'", "phoneHref: '+77777777777'"],
  ["tgHandle: '@username'", "tgHandle: 'Telegram'"],
  ["tgUrl: 'https://t.me/username'", "tgUrl: 'https://t.me/'"],
  ["email: 'mail@example.ru'", "email: 'info@advokat-zaitsev.ru'"],
  [
    "address: 'г. Абакан, ул. Пример, д. 00, офис 000'",
    "address: 'с. Бея, ул. Магистральная, д. 11г'",
  ],
  [
    "mapsUrl: 'https://yandex.ru/maps/?text=Абакан'",
    "mapsUrl: 'https://yandex.ru/maps/?text=село+Бея+Магистральная+11г'",
  ],
  [
    "routeUrl: 'https://yandex.ru/maps/?rtext=~Абакан'",
    "routeUrl: 'https://yandex.ru/maps/?rtext=~село+Бея+Магистральная+11г'",
  ],
  ['Приём в офисе в Абакане.', 'Приём в офисе в с. Бея.'],
  [
    'Да — очно в Абакане и дистанционно по всей республике.',
    'Да — очно в с. Бея и дистанционно по всей республике.',
  ],
  [
    'Карта — место приёма в Абакане',
    'Карта — место приёма в с. Бея',
  ],
];

for (const [before, after] of literalReplacements) {
  template = replaceOnce(template, before, after, `replace ${before}`);
}

template = replacePatternOnce(
  template,
  /Юридическая практика — \[[^\]]+\] лет\./,
  'Юридическая практика — более 15 лет.',
  'replace practice duration',
);

template = replaceOnce(
  template,
  "{ t: 'Стаж практики', d: 'Юридическая практика — более 15 лет.' }",
  "{ t: 'Более 15 лет практики', d: 'Юридическая практика — более 15 лет.' }",
  'replace trust practice title',
);

template = replacePatternOnce(
  template,
  /Стаж практики — \[[0-9]+\] лет/,
  'Стаж практики — более 15 лет',
  'replace hero practice duration',
);

template = replacePatternOnce(
  template,
  /            <div role="img" aria-label="Профессиональное фото адвоката"[\s\S]*?<\/div>\n            <div style="position:absolute/,
  `            <img src="advokat-zaitsev-photo" alt="Адвокат Зайцев Валерий Олегович" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover;object-position:center top;border-radius:16px;border:1px solid rgba(189,154,92,.5);box-shadow:0 30px 64px rgba(0,0,0,.4)">
            <div style="position:absolute`,
  'replace hero portrait placeholder',
);

const articles = `  articles = [
    { t: 'Как защитить свои права при разводе', d: 'Практические советы по защите имущественных и личных прав при расторжении брака.' },
    { t: 'Наследство: что нужно знать', d: 'Ключевые шаги оформления наследства и ошибки, которых важно избежать.' },
    { t: 'Покупка квартиры на вторичном рынке: что проверить до сделки', d: 'Как проверить юридическую чистоту квартиры и продавца до внесения аванса и подписания договора.' },
    { t: 'Если вас задержали: что делать сразу', d: 'Первые действия при доставлении и задержании: права, адвокат, документы, сроки и фиксация нарушений.' },
    { t: 'Допрос: как себя вести, чтобы не навредить себе', d: 'Процессуальный статус, адвокат, статья 51, порядок допроса и проверка протокола.' },
    { t: 'Повестка, вызов, опрос, допрос: в чем разница и почему это важно', d: 'Различия, которые напрямую влияют на ваши права, обязанности и риски.' },
  ];`;

template = replacePatternOnce(
  template,
  /  articles = \[[\s\S]*?\n  \];/,
  articles,
  'replace articles',
);

const timeline = `  timeline = [
    { y: '2008', t: 'Начало карьеры', d: 'Начало адвокатской практики, работа в различных областях права.' },
    { y: '2010–2015', t: 'Расширение практики', d: 'Углубление специализации, работа со сложными делами.' },
    { y: '2015–2020', t: 'Профессиональный рост', d: 'Накопление опыта, успешное ведение дел различной сложности.' },
    { y: '2020–настоящее время', t: 'Современная практика', d: 'Продолжение практики и помощь клиентам в решении юридических вопросов.' },
    { y: 'Специализация', t: 'Основные направления', d: 'Уголовные, семейные, наследственные и гражданские дела.' },
  ];`;

template = replacePatternOnce(
  template,
  /  timeline = \[[\s\S]*?\n  \];/,
  timeline,
  'replace career timeline',
);

template = replaceOnce(
  template,
  `    this.setState({ submitted: true, error: '' });`,
  `    if (this._toastTimer) clearTimeout(this._toastTimer);
    this.setState({
      submitted: true,
      error: '',
      form: { name: '', phone: '', desc: '', pref: 'Телефон', consent: false },
    });
    this._toastTimer = setTimeout(() => this.setState({ submitted: false }), 4000);`,
  'replace mock submit result',
);

template = replaceOnce(
  template,
  `    window.removeEventListener('keydown', this._onKey);`,
  `    window.removeEventListener('keydown', this._onKey);
    if (this._toastTimer) clearTimeout(this._toastTimer);`,
  'clear toast timer on unmount',
);

template = replaceOnce(
  template,
  `submitted: s.submitted, notSubmitted: !s.submitted`,
  `submitted: s.submitted, notSubmitted: true`,
  'keep form visible after mock submit',
);

template = replacePatternOnce(
  template,
  /        <sc-if value="\{\{ submitted \}\}" hint-placeholder-val="\{\{ false \}\}">[\s\S]*?        <\/sc-if>\n/,
  '',
  'remove inline success replacement',
);

const toast = `  <sc-if value="{{ submitted }}" hint-placeholder-val="{{ false }}">
    <div role="status" aria-live="polite" style="position:fixed;right:22px;bottom:22px;z-index:90;display:flex;align-items:center;gap:12px;max-width:min(380px,calc(100vw - 44px));padding:16px 18px;border:1px solid rgba(189,154,92,.55);border-radius:12px;background:#1c2430;color:#f4f1ea;box-shadow:0 22px 50px rgba(0,0,0,.35)">
      <span aria-hidden="true" style="width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:50%;background:#bd9a5c;color:#161d27;font:700 16px 'Manrope',sans-serif">✓</span>
      <span style="font:600 15px 'Manrope',sans-serif">Письмо отправлено</span>
    </div>
  </sc-if>

`;

template = replaceOnce(
  template,
  `<!-- ================= ПЛАВАЮЩИЕ КНОПКИ (МОБИЛЬНЫЕ) ================= -->`,
  `${toast}<!-- ================= ПЛАВАЮЩИЕ КНОПКИ (МОБИЛЬНЫЕ) ================= -->`,
  'insert fixed success notification',
);

template = replacePatternOnce(
  template,
  /    \/\* TODO: здесь подключите отправку заявки \(email, Telegram-бот или бэкенд\)\. \*\/\n/,
  '',
  'remove obsolete submission integration comment',
);

template = replaceOnce(
  template,
  `<a href="#" onclick="{{ openPrivacy }}" style="color:#8a6d3b;text-decoration:underline">политикой конфиденциальности</a>`,
  `<button type="button" onclick="{{ openPrivacy }}" style="display:inline;padding:0;border:0;background:transparent;color:#8a6d3b;text-decoration:underline;font:inherit;cursor:pointer">политикой конфиденциальности</button>`,
  'replace form privacy anchor',
);

template = replaceOnce(
  template,
  `<a href="#" onclick="{{ openPrivacy }}" style="color:#c7cfda;font:500 12.5px 'Manrope',sans-serif" style-hover="color:#fff">Политика конфиденциальности</a>`,
  `<button type="button" onclick="{{ openPrivacy }}" style="padding:0;border:0;background:transparent;color:#c7cfda;font:500 12.5px 'Manrope',sans-serif;cursor:pointer" style-hover="color:#fff">Политика конфиденциальности</button>`,
  'replace footer privacy anchor',
);

html = html.replace(
  manifestScript.pattern,
  `<script type="__bundler/manifest">\n${scriptJson(manifest, 2)}\n</script>`,
);
html = html.replace(
  templateScript.pattern,
  `<script type="__bundler/template">\n${scriptJson(template)}\n</script>`,
);
html = moveNoscriptFallbackOutOfHead(html);

writeFileSync(outputPath, html, 'utf8');
