import { chooseRecord } from './record_picker_helpers.js';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed.js';

const key = 'dental_flow_demo_v1';
function visualData() {
    const data = createSeed();
    const appointment = (id, date, time, duration, patientId, doctorId, status) => ({ id, date, time, duration, patientId, doctorId, status, procedure: 'Profilaxia', observation: '', attendance: '', budgetId: '', cancelReason: '', history: [] });
    data.appointments = [
        appointment('a', '2026-10-07', '09:30', 60, 'p1', 'd1', 'Confirmada'),
        appointment('b', '2026-10-07', '10:00', 30, 'p2', 'd2', 'Agendada'),
        appointment('c', '2026-10-07', '11:00', 90, 'p3', 'd1', 'Concluída'),
        appointment('d', '2026-10-07', '13:00', 60, 'p4', 'd2', 'Cancelada'),
        appointment('e', '2026-10-04', '23:30', 90, 'p1', 'd1', 'Em atendimento'),
        appointment('f', '2026-10-08', '10:00', 45, 'p2', 'd2', 'Faltou'),
    ];
    return data;
}
test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); }, { key, data: visualData() });
});
test('grade fixa posiciona minutos/duração, separa sobreposição e inclui continuação da semana anterior', async ({ page }) => {
    await page.goto('./#/agenda?date=2026-10-07');
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
    if ((page.viewportSize()?.width ?? 0) < 768) await page.getByRole('button', { name: 'Ver grade de horários da semana' }).click();
    const grid = page.getByRole('region', { name: 'Agenda semanal, dias e horários' });
    await expect(grid.getByRole('link', { name: 'Agendar em 07/10/2026 às 00:00', exact: true })).toBeAttached();
    await expect(grid.getByRole('link', { name: 'Agendar em 07/10/2026 às 23:00', exact: true })).toBeAttached();
    await expect(grid.locator('[data-appointment-id="e"]')).toHaveAttribute('aria-label', /continuação do dia anterior/);
    const a = await grid.locator('[data-appointment-id="a"]').boundingBox();
    const b = await grid.locator('[data-appointment-id="b"]').boundingBox();
    const c = await grid.locator('[data-appointment-id="c"]').boundingBox();
    expect(b.y - a.y).toBeCloseTo(a.height / 2, 0);
    expect(b.height).toBeCloseTo(a.height / 2, 0);
    expect(c.height).toBeCloseTo(a.height * 1.5, 0);
    expect(a.x + a.width).toBeLessThan(b.x);
    const colors = await grid.locator('[data-appointment-id]').evaluateAll(items => items.map(item => getComputedStyle(item).backgroundColor));
    expect(new Set(colors).size).toBe(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.reload();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).appointments.length, key)).toBe(6);
});
test('mês mostra eventos e mais consultas, preserva filtro/contexto e seleção pelo teclado', async ({ page }) => {
    await page.goto('./#/agenda?date=2026-10-07&view=month');
    const day = page.getByRole('button', { name: '07/10/2026, 4 consultas', exact: true });
    await expect(day).toBeVisible();
    await day.focus();
    await page.keyboard.press('Enter');
    const details = page.getByRole('region', { name: 'Consultas de 07/10/2026' });
    await expect(details.getByRole('link')).toHaveCount(5);
    if ((page.viewportSize()?.width ?? 0) >= 768) {
        await expect(page.getByRole('button', { name: 'Ver mais 1', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Ver mais 1', exact: true }).click();
    }
    await chooseRecord(page, page.locator('#agenda_doctor'), 'd2');
    await expect(page.getByRole('button', { name: '07/10/2026, 2 consultas', exact: true })).toBeVisible();
    await details.getByRole('link', { name: /Rafael Nogueira/ }).click();
    await expect(page).toHaveURL(/view=month&doutor=d2/);
    await page.getByRole('link', { name: 'Voltar à agenda', exact: false }).click();
    await expect(page.locator('#agenda_doctor')).toHaveAttribute('value', 'd2');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
