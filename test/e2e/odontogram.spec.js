import { chooseRecord } from './record_picker_helpers.js';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed.js';
async function open(page, route) {
    await page.goto(`./#${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
}
async function scenario(page, value) {
    await page.keyboard.press('Control+Alt+r');
    await page.getByLabel('Cenário de revisão').selectOption(value);
    await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
}
test('odontograma permanente e infantil associa dentes e superfícies aos itens e persiste após falha', async ({ page }, testInfo) => {
    await open(page, '/orcamentos/novo?paciente=p3');
    await chooseRecord(page, page.getByLabel('Doutor', { exact: true }), 'd1');
    await expect(page.getByRole('button', { name: /Adicionar procedimento no dente/ })).toHaveCount(32);
    await page.getByRole('button', { name: 'Adicionar procedimento no dente 11', exact: true }).click();
    await expect(page.getByLabel('Procedimento', { exact: true })).toBeFocused();
    await expect(page.getByLabel('Dente (opcional)', { exact: true })).toHaveValue('11');
    await page.getByLabel('Procedimento', { exact: true }).selectOption('Restauração em resina');
    await page.getByLabel('Região/superfície (opcional)', { exact: true }).fill('Vestibular');
    await page.getByRole('button', { name: 'Infantil', exact: true }).click();
    await expect(page.getByRole('button', { name: /Adicionar procedimento no dente/ })).toHaveCount(20);
    await page.getByRole('button', { name: 'Adicionar procedimento no dente 55', exact: true }).click();
    await page.getByLabel('Procedimento', { exact: true }).nth(1).selectOption('Restauração em resina');
    await page.getByLabel('Região/superfície (opcional)', { exact: true }).nth(1).fill('Oclusal');
    await scenario(page, 'write-error');
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.getByText('Não foi possível salvar', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Dente (opcional)', { exact: true }).nth(1)).toHaveValue('55');
    await expect(page.getByLabel('Região/superfície (opcional)', { exact: true }).nth(1)).toHaveValue('Oclusal');
    await scenario(page, 'normal');
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Orçamento ORC-004', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Dente (opcional)', { exact: true }).nth(0)).toHaveValue('11');
    await expect(page.getByLabel('Dente (opcional)', { exact: true }).nth(1)).toHaveValue('55');
    await expect(page.getByLabel('Região/superfície (opcional)', { exact: true }).nth(0)).toHaveValue('Vestibular');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dental_flow_demo_v1')));
    expect(stored.budgets.at(-1).items).toEqual(expect.arrayContaining([expect.objectContaining({ tooth: '11', surface: 'Vestibular' }), expect.objectContaining({ tooth: '55', surface: 'Oclusal' })]));
    expect(stored.cashMovements).toEqual([]);
    expect(stored.appointments).toEqual([]);
    await page.getByRole('button', { name: 'Infantil', exact: true }).click();
    const errors = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(errors.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`odontogram_infantil_${testInfo.project.name}.png`), fullPage: true });
});
test('snapshots sem novas coleções continuam legíveis e orçamentos iniciais preservam somente leitura', async ({ page }) => {
    const current = createSeed();
    const { appointments, cashMovements, users, audit, ...legacy } = current;
    await page.addInitScript(data => { if (!localStorage.getItem('dental_flow_demo_v1'))
        localStorage.setItem('dental_flow_demo_v1', JSON.stringify(data)); }, legacy);
    await open(page, '/orcamentos/b2');
    await expect(page.getByText('Somente leitura', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Adicionar procedimento no dente/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Infantil', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Dente 55', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar orçamento', exact: true })).toHaveCount(0);
    const raw = await page.evaluate(() => JSON.parse(localStorage.getItem('dental_flow_demo_v1')));
    expect(raw.budgets).toEqual(legacy.budgets);
    expect(raw.products).toEqual(legacy.products);
    expect(raw.appointments).toBeUndefined();
    for (const route of ['/agenda', '/doutores', '/caixa', '/administracao']) {
        await open(page, route);
        await expect(page.getByText(/Não foi possível abrir os dados salvos/)).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
});
test('dados ilegíveis bloqueiam novas gravações até recuperação confirmada', async ({ page }) => {
    await page.addInitScript(() => { if (!localStorage.getItem('dental_flow_demo_v1'))
        localStorage.setItem('dental_flow_demo_v1', '{broken'); });
    await open(page, '/caixa/entrada');
    await page.locator('#cash_amount').fill('10,00');
    await page.locator('#cash_description').fill('Recebimento a preservar');
    await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
    await expect(page.getByText(/Faça a recuperação dos dados antes de salvar/)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('dental_flow_demo_v1'))).toBe('{broken');
    await expect(page.locator('#cash_description')).toHaveValue('Recebimento a preservar');
    await page.keyboard.press('Control+Alt+r');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Restaurar dados de teste', exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem('dental_flow_demo_v1'))).toBe('{broken');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Restaurar dados de teste', exact: true }).click();
    await expect(page.getByText('Dados iniciais restaurados.', { exact: true })).toBeVisible();
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('dental_flow_demo_v1')));
    expect(restored.cashMovements).toEqual([]);
    expect(restored.appointments).toEqual([]);
    expect(restored.users).toEqual([]);
    await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
    await page.locator('#cash_amount').fill('10,00');
    await page.locator('#cash_description').fill('Recebimento após recuperação');
    await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Entrada registrada', exact: true })).toBeVisible();
});
