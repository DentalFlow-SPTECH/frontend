// Exporta as versões do logotipo de variants.html em PNG transparente e gera a prancha de aprovação.
// Uso: python -I scripts/brand/make_marks.py && node scripts/brand/export_variants.mjs
// O símbolo usado no sistema e os favicons saem do make_marks.py; aqui ficam as demais versões.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out', 'export');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1400 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(here, 'variants.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.locator('.board').screenshot({ path: path.join(out, 'prancha_logotipo.png') });
// Sem os fundos da prancha, cada peça sai com transparência em volta.
await page.addStyleTag({ content: 'body, .card, .stage, .stage.split > div { background: transparent !important; }' });
for (const element of await page.locator('[data-export]').all()) {
    const name = await element.getAttribute('data-export');
    await element.screenshot({ path: path.join(out, `${name}.png`), omitBackground: true });
}
await browser.close();
console.log(out);
