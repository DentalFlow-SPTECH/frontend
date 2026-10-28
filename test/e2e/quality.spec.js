import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signIn, useFakeApi } from './fake_api.js';

const pages = ['/hoje', '/agenda', '/agenda/nova', '/pacientes', '/pacientes/1', '/pacientes/novo', '/clinica', '/clinica/dentistas', '/painel', '/estoque', '/estoque/materiais/1', '/mapa', '/mapa/novo'];

test('telas principais sem violações do axe, sem rolagem horizontal e sem erros de JavaScript', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await useFakeApi(page);
    await page.goto('./#/entrar');
    const login = await new AxeBuilder({ page }).analyze();
    expect(login.violations.map(item => item.id), 'tela Entrar').toEqual([]);
    await signIn(page, 'ana');
    for (const route of pages) {
        await page.goto(`./#${route}`);
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        await expect(page.getByLabel('Carregando')).toHaveCount(0, { timeout: 15_000 });
        const result = await new AxeBuilder({ page }).analyze();
        expect(result.violations.map(item => `${item.id}: ${item.nodes[0]?.target}`), route).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} sem rolagem horizontal`).toBe(true);
    }
    expect(errors).toEqual([]);
});

test('reflow em 320 px mantém as telas de uso diário sem rolagem horizontal', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'medido no projeto de celular');
    await page.setViewportSize({ width: 320, height: 700 });
    await useFakeApi(page);
    await signIn(page, 'carla');
    for (const route of ['/hoje', '/agenda', '/pacientes', '/pacientes/novo', '/agenda/nova']) {
        await page.goto(`./#${route}`);
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
    }
});
