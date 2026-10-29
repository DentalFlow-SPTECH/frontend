import { expect, test } from '@playwright/test';
import { chooseOption, now, signIn, useFakeApi } from './fake_api.js';

// Ajustes pedidos depois do primeiro teste de uso (28/10/2026).
test.describe('ajustes de uso', () => {
    test('Estoque alterna Materiais e Equipamentos sem erro', async ({ page }) => {
        await useFakeApi(page);
        await signIn(page, 'ana', '/estoque');
        const tipo = page.getByRole('group', { name: 'Tipo' });
        for (let round = 0; round < 3; round += 1) {
            await tipo.getByRole('button', { name: 'Equipamentos' }).click();
            await expect(page.getByRole('link', { name: /Autoclave/ })).toBeVisible();
            await tipo.getByRole('button', { name: 'Materiais' }).click();
            await expect(page.getByRole('link', { name: /Luva de procedimento/ })).toBeVisible();
        }
        await expect(page.getByText('Algo deu errado')).toHaveCount(0);
    });

    test('F5 mantém a sessão e 30 minutos sem uso levam de volta a Entrar', async ({ page }) => {
        await useFakeApi(page);
        await signIn(page, 'carla', '/pacientes');
        await page.reload();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pacientes');
        await page.clock.setFixedTime(new Date(now.getTime() + 31 * 60 * 1000));
        await page.mouse.click(5, 300);
        await expect(page.getByText('Sua sessão terminou por inatividade. Entre novamente para continuar.')).toBeVisible();
        await expect(page).toHaveURL(/#\/entrar/);
    });

    test('barra de cima sem o botão de busca solto', async ({ page, isMobile }) => {
        test.skip(isMobile, 'a barra de cima é do computador');
        await useFakeApi(page);
        await signIn(page, 'ana');
        await expect(page.getByRole('banner').getByRole('link', { name: /buscar|ir para pacientes/i })).toHaveCount(0);
    });

    test('marca: símbolo verde sem quadrado na barra e favicon com o ícone', async ({ page }) => {
        await useFakeApi(page);
        await signIn(page, 'ana');
        const mark = page.getByRole('link', { name: 'Dental Flow — Hoje' }).filter({ visible: true }).locator('img');
        await expect.poll(() => mark.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
        for (const rel of ['icon', 'apple-touch-icon']) {
            const href = await page.locator(`link[rel="${rel}"]`).first().getAttribute('href');
            const response = await page.request.get(new URL(href, page.url()).href);
            expect(response.ok()).toBe(true);
            expect(response.headers()['content-type']).toContain('image/png');
        }
    });

    test('clicar num horário vazio abre o agendamento com dia e hora; a linha "agora" cruza a grade', async ({ page, isMobile }) => {
        test.skip(isMobile, 'a semana em grade é da tela larga');
        await useFakeApi(page);
        await signIn(page, 'carla', '/agenda');
        const grid = page.getByRole('region', { name: /Agenda:/ });
        const line = await page.locator('[data-now-line]').boundingBox();
        const box = await grid.boundingBox();
        expect(line.width).toBeGreaterThan(box.width * .9);
        // Quinta 29 às 15:00: 650 px abaixo das 07:00 (80 px por hora).
        await page.locator('[data-date="2026-10-29"]').click({ position: { x: 30, y: 650 } });
        await expect(page).toHaveURL(/#\/agenda\/nova\?data=2026-10-29&hora=15:00/);
        await expect(page.getByLabel('Horário', { exact: true })).toHaveValue('15:00');
    });

    test('Hoje: o detalhe rola dentro do próprio painel e as etapas batem com o botão', async ({ page, isMobile }) => {
        test.skip(isMobile, 'o painel lateral é da tela larga');
        await page.setViewportSize({ width: 1440, height: 640 });
        await useFakeApi(page);
        await signIn(page, 'carla');
        await page.getByRole('list').getByRole('button', { name: /10:00.*Ana Clara Mendes/ }).click();
        const side = page.getByRole('complementary', { name: 'Consulta selecionada' });
        const fits = await side.evaluate(element => getComputedStyle(element).overflowY === 'auto' && element.getBoundingClientRect().height <= window.innerHeight);
        expect(fits).toBe(true);
        const steps = side.getByRole('list', { name: 'Etapas da consulta' });
        await expect(steps.getByRole('listitem').filter({ hasText: 'Confirmado' })).toHaveAttribute('data-state', 'done');
        await expect(steps.getByRole('listitem').filter({ hasText: 'Em atendimento' })).toHaveAttribute('data-state', 'next');
        await expect(side.getByText('Próximo: iniciar atendimento')).toBeVisible();
        await expect(side.getByRole('button', { name: 'Iniciar atendimento' })).toBeVisible();
    });

    for (const width of [320, 375, 768, 1440]) {
        test(`Agendar consulta em ${width} px: sem rolagem lateral, avatar redondo e botão visível`, async ({ page }) => {
            await page.setViewportSize({ width, height: 800 });
            await useFakeApi(page);
            await signIn(page, 'carla', '/agenda/nova?data=2026-10-29&paciente=1&dentista=3');
            await chooseOption(page, 'Procedimento', 'avalia', /^Avaliação/);
            const avatar = await page.locator('form').getByText('AM', { exact: true }).boundingBox();
            expect(Math.abs(avatar.width - avatar.height)).toBeLessThan(2);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
            await expect(page.getByRole('button', { name: /^Agendar( consulta)?$/ })).toBeVisible();
            await expect(page.getByRole('region', { name: 'Horários livres: Manhã' })).toBeVisible();
        });
    }
});
