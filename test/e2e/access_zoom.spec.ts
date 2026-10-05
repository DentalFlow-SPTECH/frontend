import { test, expect, chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

test('Login e Cadastro em zoom nativo de 200% no Edge', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Zoom nativo de desktop; celular já tem reflow próprio.');
  test.setTimeout(60_000);
  const profile = testInfo.outputPath('native-zoom-profile');
  await mkdir(profile, { recursive: true });
  const options = { channel: 'msedge' as const, viewport: { width: 1440, height: 960 } };
  const metrics = () => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, visualScale: visualViewport!.scale, overflow: document.documentElement.scrollWidth > innerWidth });
  let context = await chromium.launchPersistentContext(profile, options);
  const baseline = await (await context.newPage()).evaluate(metrics);
  await context.close();
  const prefsPath = join(profile, 'Default', 'Preferences');
  const prefs = JSON.parse(await readFile(prefsPath, 'utf8'));
  prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } };
  await writeFile(prefsPath, JSON.stringify(prefs));
  context = await chromium.launchPersistentContext(profile, options);
  const results = [];
  try {
    const page = await context.newPage();
    const captureSession = await context.newCDPSession(page);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const baseURL = testInfo.project.use.baseURL!;
    for (const route of ['/login', '/cadastro']) {
      await page.goto(`${baseURL}#${route}`);
      await expect(page.locator('main h1')).toHaveText(route === '/login' ? 'Login' : 'Criar conta');
      const actual = await page.evaluate(metrics);
      expect(actual.width).toBe(baseline.width / 2);
      expect(actual.dpr).toBe(baseline.dpr * 2);
      expect(actual.visualScale).toBe(1);
      expect(actual.overflow).toBe(false);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByRole('button', { name: route === '/login' ? 'Entrar' : 'Criar conta', exact: true }).click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(metrics)).toEqual(actual);
      // Capture the native viewport; fullPage screenshots misapply browser zoom.
      const capture = await captureSession.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      await writeFile(testInfo.outputPath(`${route.slice(1)}-200.png`), Buffer.from(capture.data, 'base64'));
      results.push({ route, ...actual, axeViolations: 0 });
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    await writeFile(testInfo.outputPath('native-zoom-results.json'), JSON.stringify({ baseURL, baseline, zoom: '200%', results, errors }, null, 2));
  } finally { await context.close(); }
});
