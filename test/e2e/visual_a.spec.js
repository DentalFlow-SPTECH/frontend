import { chooseRecord } from './record_picker_helpers.js';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed.js';

const key = 'dental_flow_demo_v1';
function visualData() {
    const data = createSeed();
    data.doctors.push({ id: 'd3', name: 'Dra. Clara Monteiro', specialty: 'Clínica geral' });
    const appointment = (id, date, time, duration, patientId, doctorId, status) => ({ id, date, time, duration, patientId, doctorId, status, procedure: 'Profilaxia', observation: '', attendance: '', budgetId: '', cancelReason: '', history: [] });
    data.appointments = [
        appointment('a', '2026-10-07', '09:30', 60, 'p1', 'd1', 'Confirmada'),
        appointment('b', '2026-10-07', '10:00', 30, 'p2', 'd2', 'Agendada'),
        appointment('c', '2026-10-07', '11:00', 90, 'p3', 'd1', 'Concluída'),
        appointment('d', '2026-10-07', '13:00', 60, 'p4', 'd2', 'Cancelada'),
        appointment('e', '2026-10-04', '23:30', 90, 'p1', 'd1', 'Em atendimento'),
        appointment('f', '2026-10-08', '10:00', 45, 'p2', 'd2', 'Faltou'),
        // Mesmo horário com outro doutor e uma consulta cancelada sobreposta à do mesmo doutor.
        appointment('g', '2026-10-07', '10:15', 30, 'p3', 'd3', 'Confirmada'),
        appointment('h', '2026-10-07', '11:30', 45, 'p4', 'd1', 'Cancelada'),
        appointment('i', '2026-10-08', '14:00', 90, 'p2', 'd1', 'Agendada'),
    ];
    return data;
}
async function openGrid(page, route) {
    await page.goto(`./#${route}`);
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
    if ((page.viewportSize()?.width ?? 0) < 1280) await page.getByRole('button', { name: 'Calendário', exact: true }).click();
    return page.getByRole('region', { name: 'Agenda semanal, dias e horários' });
}
test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); }, { key, data: visualData() });
});
test('com doutor filtrado a grade posiciona minutos e duração, reúne a sobreposição e inclui a continuação da semana anterior', async ({ page }) => {
    const grid = await openGrid(page, '/agenda?date=2026-10-07&doutor=d1');
    await expect(grid.getByRole('link', { name: 'Agendar em 07/10/2026 às 00:00', exact: true })).toBeAttached();
    await expect(grid.getByRole('link', { name: 'Agendar em 07/10/2026 às 23:00', exact: true })).toBeAttached();
    await expect(grid.locator('[data-appointment-id="e"]')).toHaveAttribute('aria-label', /continuação do dia anterior/);
    const a = await grid.locator('[data-appointment-id="a"]').boundingBox();
    const e = await grid.locator('[data-appointment-id="e"]').boundingBox();
    const i = await grid.locator('[data-appointment-id="i"]').boundingBox();
    expect(e.height).toBeCloseTo(a.height, 0);
    expect(i.height).toBeCloseTo(a.height * 1.5, 0);
    expect(a.y - e.y).toBeCloseTo(a.height * 9.5, 0);
    expect(a.width).toBeGreaterThanOrEqual(76);
    // A consulta cancelada das 11:30 se sobrepõe à das 11:00: as duas ficam em um bloco com contagem, nenhuma some.
    await expect(grid.locator('[data-appointment-id="c"], [data-appointment-id="h"]')).toHaveCount(0);
    const group = grid.locator('[data-group="2026-10-07:660"]');
    await expect(group).toHaveAttribute('aria-label', /^2 consultas em 07\/10\/2026, das 11:00 às 12:30: 1 Concluída, 1 Cancelada\./);
    expect((await group.boundingBox()).height).toBeCloseTo(a.height * 1.5, 0);
    expect((await group.boundingBox()).width).toBeCloseTo(a.width, 0);
    await group.click();
    await expect(page).toHaveURL(/date=2026-10-07&view=week&doutor=d1&faixa=660-750$/);
    const panel = page.getByRole('region', { name: 'Consultas de 07/10/2026' });
    await expect(panel.getByRole('heading', { name: 'Consultas de 07/10/2026', exact: true })).toBeFocused();
    await expect(panel.getByText('Das 11:00 às 12:30 · 2 consultas', { exact: true })).toBeVisible();
    await expect(panel.locator('li')).toHaveCount(2);
    await expect(panel.getByRole('link', { name: 'Beatriz Campos', exact: true })).toHaveAttribute('href', /#\/agenda\/c\?date=2026-10-07&view=week&doutor=d1&faixa=660-750$/);
    await expect(panel.getByRole('link', { name: 'André Siqueira', exact: true })).toBeVisible();
    await panel.getByRole('link', { name: 'Ver o dia inteiro (3)', exact: true }).click();
    await expect(panel.locator('li')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.reload();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).appointments.length, key)).toBe(9);
});
test('com todos os doutores cada horário vira um bloco com contagem e todas as consultas continuam acessíveis', async ({ page }) => {
    const grid = await openGrid(page, '/agenda?date=2026-10-07');
    const morning = grid.locator('[data-group="2026-10-07:600"]');
    await expect(morning).toHaveAttribute('aria-label', /^2 consultas em 07\/10\/2026, das 10:00 às 11:00: 1 Agendada, 1 Confirmada\./);
    await expect(grid.locator('[data-group="2026-10-07:660"]')).toHaveAttribute('aria-label', /1 Concluída, 1 Cancelada/);
    // Cada consulta aparece uma vez: sozinha no horário ou dentro de um bloco.
    const singles = await grid.locator('[data-appointment-id]').count();
    const grouped = (await grid.locator('[data-group] strong').allTextContents()).reduce((total, text) => total + Number.parseInt(text, 10), 0);
    expect([singles, grouped]).toEqual([5, 4]);
    const single = await grid.locator('[data-appointment-id="a"]').boundingBox();
    const block = await morning.boundingBox();
    expect(block.height).toBeCloseTo(single.height, 0);
    expect(block.width).toBeGreaterThanOrEqual(76);
    const colors = await page.getByLabel('Situações das consultas').locator('i').evaluateAll(items => items.map(item => getComputedStyle(item).backgroundColor));
    expect(new Set(colors).size).toBe(6);
    await morning.click();
    await expect(page).toHaveURL(/date=2026-10-07&view=week&faixa=600-660$/);
    const panel = page.getByRole('region', { name: 'Consultas de 07/10/2026' });
    await expect(panel.getByText('Das 10:00 às 11:00 · 2 consultas', { exact: true })).toBeVisible();
    // Em telas estreitas a lista do horário substitui o calendário na mesma área.
    if ((page.viewportSize()?.width ?? 0) >= 1280)
        await expect(morning).toHaveAttribute('aria-current', 'true');
    else
        await expect(page.getByRole('button', { name: 'Consultas do dia', exact: true })).toHaveAttribute('aria-pressed', 'true');
    // Doutores diferentes no mesmo horário: lista com paciente, doutor, horário, duração, procedimento e situação, sem conflito.
    const rows = panel.locator('li');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('10:00–10:30 · 30 min');
    await expect(rows.nth(0)).toContainText('Rafael Nogueira');
    await expect(rows.nth(0)).toContainText('Dr. Lucas Azevedo · Profilaxia');
    await expect(rows.nth(0)).toContainText('Agendada');
    await expect(rows.nth(1)).toContainText('10:15–10:45 · 30 min');
    await expect(rows.nth(1)).toContainText('Dra. Clara Monteiro · Profilaxia');
    await expect(page.getByText(/já tem uma consulta nesse intervalo/)).toHaveCount(0);
    // O dia tem seis consultas: a lista mostra quatro por página e alcança as demais pela paginação.
    await panel.getByRole('link', { name: 'Ver o dia inteiro (6)', exact: true }).click();
    await expect(rows).toHaveCount(4);
    await expect(panel.getByRole('status').last()).toHaveText('Mostrando 1–4 de 6 registros');
    await panel.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await expect(rows).toHaveCount(2);
    await rows.nth(0).getByRole('link').first().click();
    await expect(page.getByRole('heading', { name: 'Dados da consulta', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar à agenda', exact: false }).click();
    await expect(page).toHaveURL(/date=2026-10-07&view=week&pagina=2$/);
    await expect(page.getByRole('region', { name: 'Consultas de 07/10/2026' }).locator('li')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.reload();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).appointments.length, key)).toBe(9);
});
test('a agenda semanal cabe na primeira tela e permite alcançar horários fora da área visível', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1280, 'Resoluções de referência do desktop.');
    for (const size of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
        await page.setViewportSize(size);
        const grid = await openGrid(page, '/agenda?date=2026-10-07');
        await expect(page.getByRole('region', { name: 'Consultas de 07/10/2026' }).getByRole('button', { name: 'Próxima', exact: true })).toBeInViewport({ ratio: 1 });
        await expect(grid).toBeInViewport({ ratio: 1 });
        expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), `${size.width}×${size.height}`).toBe(true);
    }
    const grid = page.getByRole('region', { name: 'Agenda semanal, dias e horários' });
    await page.getByRole('group', { name: 'Ir para o horário' }).getByRole('button', { name: 'Noite', exact: true }).click();
    await expect(grid.getByRole('link', { name: 'Agendar em 07/10/2026 às 19:00', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: /^↑ 9 consultas antes das \d{2}:00$/ })).toBeVisible();
    await page.getByRole('button', { name: /^↑ 9 consultas antes/ }).click();
    await expect(grid.locator('[data-appointment-id="e"]')).toBeInViewport();
});
test('mês mostra eventos e mais consultas, preserva filtro/contexto e seleção pelo teclado', async ({ page }) => {
    await page.goto('./#/agenda?date=2026-10-07&view=month');
    const day = page.getByRole('button', { name: '07/10/2026, 6 consultas', exact: true });
    await expect(day).toBeVisible();
    await day.focus();
    await page.keyboard.press('Enter');
    const details = page.getByRole('region', { name: 'Consultas de 07/10/2026' });
    await expect(details.locator('li')).toHaveCount(4);
    if ((page.viewportSize()?.width ?? 0) >= 768) {
        await expect(page.getByRole('button', { name: 'Ver mais 3', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Ver mais 3', exact: true }).click();
    }
    await chooseRecord(page, page.locator('#agenda_doctor'), 'd2');
    await expect(page.getByRole('button', { name: '07/10/2026, 2 consultas', exact: true })).toBeVisible();
    await details.getByRole('link', { name: 'Rafael Nogueira', exact: true }).click();
    await expect(page).toHaveURL(/view=month&doutor=d2/);
    await page.getByRole('link', { name: 'Voltar à agenda', exact: false }).click();
    await expect(page.locator('#agenda_doctor')).toHaveAttribute('value', 'd2');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
