import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed';
import type { Appointment, CashMovement, DemoData } from '../../src/demo/model';

const storageKey = 'dental_flow_demo_v1';
const referenceDate = '2026-10-03';
function populated(): DemoData {
  const data = createSeed();
  const appointment = (id: string, date: string, time: string, patientId: string, status: Appointment['status']): Appointment => ({ id, date, time, patientId, status, doctorId: 'd1', procedure: 'Profilaxia', duration: 30, observation: '', attendance: '', budgetId: '', cancelReason: status === 'Cancelada' ? 'Paciente solicitou cancelamento.' : '', history: [] });
  data.appointments = [appointment('appt-a', referenceDate, '09:00', 'p1', 'Agendada'), appointment('appt-b', referenceDate, '10:00', 'p2', 'Confirmada'), appointment('appt-c', referenceDate, '11:00', 'p3', 'Concluída'), appointment('appt-d', referenceDate, '12:00', 'p4', 'Cancelada'), appointment('appt-e', '2026-10-04', '09:00', 'p2', 'Agendada'), appointment('appt-f', '2026-09-30', '09:00', 'p3', 'Confirmada')];
  const cash = (id: string, date: string, type: CashMovement['type'], amountCents: number): CashMovement => ({ id, date, type, amountCents, description: 'Movimentação informada para teste', category: '', paymentMethod: '', responsible: '', observation: '', history: [] });
  data.cashMovements = [cash('cash-a', referenceDate, 'Entrada', 100000), cash('cash-b', referenceDate, 'Saída', 25000), cash('cash-c', '2026-09-30', 'Entrada', 30000), cash('cash-d', '2026-04-01', 'Entrada', 500000)];
  data.budgets.push({ id: 'budget-local', code: 'ORC-004', patientId: 'p3', doctorId: 'd2', createdOn: referenceDate, validUntil: '', approvedOn: '', statusLabel: 'Registro local', local: true, observation: '', paymentNote: '', items: [{ id: 'item-local', procedure: 'Restauração em resina', tooth: '55', surface: '', quantity: 1, unitPriceCents: 25000, observation: '' }], history: [] });
  return data;
}
async function inject(page: Page, data: DemoData) {
  await page.addInitScript(({ key, saved }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(saved)); }, { key: storageKey, saved: data });
}
async function open(page: Page, route = `/painel?date=${referenceDate}`) {
  await page.goto(`./#${route}`);
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
  await expect(page.getByText('Carregando registros…')).toHaveCount(0);
  await expect(page.getByLabel('Resumo da clínica')).toBeVisible();
}
async function scenario(page: Page, value: string) {
  await page.keyboard.press('Control+Alt+r');
  await page.getByLabel('Cenário de revisão').selectOption(value);
  await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
}
async function totals(page: Page, expected: string[], month = 'outubro de 2026') {
  await expect(page.getByLabel(`Totais do caixa de ${month}`).locator('dd')).toHaveText(expected);
}
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-10-03T15:00:00Z')); });

test('painel é a página inicial e leitura mantém caixa vazio sem gerar recebimentos', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveURL(/#\/painel$/);
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
  await expect(page.getByLabel('Resumo da clínica').locator('dd > span')).toHaveText(['0', '4', '3', '3']);
  await expect(page.getByRole('heading', { name: 'Nenhuma consulta para este dia' })).toBeVisible();
  await totals(page, ['R$ 0,00', 'R$ 0,00', 'R$ 0,00']);
  await expect(page.getByText('Nenhuma entrada ou saída registrada nos últimos seis meses deste período.')).toBeVisible();
  const appointments = await page.getByRole('region', { name: 'Consultas de 03/10/2026', exact: true }).boundingBox();
  const cash = await page.getByRole('region', { name: 'Caixa de outubro de 2026', exact: true }).boundingBox();
  expect(cash!.y - (appointments!.y + appointments!.height)).toBeGreaterThanOrEqual(20);
  expect(cash!.y - (appointments!.y + appointments!.height)).toBeLessThanOrEqual(28);
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    const stock = await page.getByRole('region', { name: 'Atenção ao estoque', exact: true }).boundingBox();
    expect(cash!.y).toBeLessThan(stock!.y + stock!.height);
  }
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await page.reload();
  await expect(page.getByLabel('Dia de referência')).toHaveValue(referenceDate);
});

test('data usa dia de São Paulo e Hoje retorna à referência correta', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-03T02:30:00Z'));
  await open(page, '/painel');
  await expect(page.getByLabel('Dia de referência')).toHaveValue('2026-10-02');
  await page.getByLabel('Dia de referência').fill('2026-09-30');
  await expect(page.getByRole('heading', { name: 'Consultas de 30/09/2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Hoje', exact: true }).click();
  await expect(page.getByLabel('Dia de referência')).toHaveValue('2026-10-02');
  await open(page, '/dashboard?date=2026-09-30');
  await expect(page).toHaveURL(/#\/painel\?date=2026-09-30$/);
  await expect(page.getByLabel('Dia de referência')).toHaveValue('2026-09-30');
  if (await page.getByRole('button', { name: 'Abrir navegação', exact: true }).isVisible()) await page.getByRole('button', { name: 'Abrir navegação', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Painel', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('consultas, estoque, orçamentos e caixa refletem dados e visão não modifica snapshot', async ({ page }) => {
  const saved = populated(); await inject(page, saved); await open(page);
  await expect(page.getByLabel('Resumo da clínica').locator('dd > span')).toHaveText(['4', '4', '4', '3']);
  const appointments = page.getByRole('region', { name: 'Consultas de 03/10/2026', exact: true });
  const dayList = appointments.getByRole('list', { name: 'Consultas do dia', exact: true });
  await expect(dayList.getByRole('listitem')).toHaveCount(4);
  await expect(dayList.locator('time')).toHaveText(['09:0030 min', '10:0030 min', '11:0030 min', '12:0030 min']);
  await expect(appointments.getByText('Cancelada', { exact: true })).toBeVisible();
  const weeklyChart = page.getByRole('figure', { name: 'Consultas registradas por dia', exact: true });
  await expect(weeklyChart.getByRole('link')).toHaveCount(7);
  await expect(weeklyChart.getByRole('link', { name: 'Abrir agenda de 30/09/2026: 1 consulta registrada', exact: true })).toBeVisible();
  await expect(weeklyChart.getByRole('link', { name: 'Abrir agenda de 03/10/2026: 4 consultas registradas', exact: true })).toBeVisible();
  await expect(weeklyChart.getByText('A contagem inclui todos os registros de consulta; a situação de cada atendimento aparece na Agenda.', { exact: true })).toBeVisible();
  await totals(page, ['R$ 1.000,00', 'R$ 250,00', 'R$ 750,00']);
  const budgets = page.getByRole('region', { name: 'Orçamentos recentes', exact: true });
  await expect(budgets.locator('li').first().getByRole('link')).toHaveText('ORC-004');
  await expect(budgets.locator('li').first().getByText('R$ 250,00', { exact: true })).toBeVisible();
  const stock = page.getByRole('region', { name: 'Atenção ao estoque', exact: true });
  await expect(stock.getByText('Sem saldo', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(JSON.stringify(saved));
});

test('gráfico semanal abre o dia correspondente e o Painel reflui em 320 px', async ({ page }, testInfo) => {
  await inject(page, populated()); await open(page);
  await page.screenshot({ path: testInfo.outputPath(`painel_semana_${testInfo.project.name}.png`), fullPage: true });
  await page.getByRole('figure', { name: 'Consultas registradas por dia', exact: true }).getByRole('link', { name: 'Abrir agenda de 30/09/2026: 1 consulta registrada', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  await expect(page.getByLabel('Ir para a data', { exact: true })).toHaveValue('2026-09-30');
  await page.setViewportSize({ width: 320, height: 812 });
  await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByLabel('Dia de referência')).toBeVisible();
  await expect(page.getByLabel('Resumo da clínica')).toBeVisible();
});

test('mês e gráfico conservam centavos, excluem datas fora do período e persistem seleção', async ({ page }) => {
  await inject(page, populated()); await open(page);
  await page.locator('summary').click();
  const table = page.getByRole('table', { name: /^Entradas e saídas registradas em cada mês/ });
  await expect(table.locator('tbody tr')).toHaveCount(6);
  await expect(table.locator('tbody tr').last().locator('td')).toHaveText(['R$ 1.000,00', 'R$ 250,00']);
  await expect(table.locator('tbody tr').nth(4).locator('td')).toHaveText(['R$ 300,00', 'R$ 0,00']);
  await expect(table.getByText('R$ 5.000,00', { exact: true })).toHaveCount(0);
  await page.getByLabel('Dia de referência').fill('2026-09-30');
  await totals(page, ['R$ 300,00', 'R$ 0,00', 'R$ 300,00'], 'setembro de 2026');
  await expect(page.getByRole('link', { name: 'Ver caixa do mês', exact: true })).toHaveAttribute('href', '#/caixa?de=2026-09-01&ate=2026-09-30');
  await page.reload();
  await expect(page.getByLabel('Dia de referência')).toHaveValue('2026-09-30');
  await totals(page, ['R$ 300,00', 'R$ 0,00', 'R$ 300,00'], 'setembro de 2026');
});

test('atalhos abrem consulta, material, orçamento e caixa com o contexto correto', async ({ page }) => {
  await inject(page, populated()); await open(page);
  await page.getByRole('region', { name: 'Consultas de 03/10/2026', exact: true }).getByRole('link', { name: 'Marina Albuquerque', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Consulta de Marina Albuquerque', exact: true })).toBeVisible();
  await open(page);
  await page.getByRole('region', { name: 'Atenção ao estoque', exact: true }).getByRole('link', { name: 'Ácido fosfórico 37%', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ácido fosfórico 37%', exact: true })).toBeVisible();
  await open(page);
  await page.getByRole('region', { name: 'Orçamentos recentes', exact: true }).getByRole('link', { name: 'ORC-004', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Orçamento ORC-004', exact: true })).toBeVisible();
  await open(page);
  await page.getByRole('link', { name: 'Ver caixa do mês', exact: true }).click();
  await expect(page.getByLabel('Data inicial', { exact: true })).toHaveValue('2026-10-01');
  await expect(page.getByLabel('Data final', { exact: true })).toHaveValue('2026-10-31');
});

test('novos cadastros atualizam painel após recarregar mantendo módulos independentes', async ({ page }) => {
  await open(page, '/painel?date=2026-10-12');
  await page.getByRole('link', { name: 'Agendar consulta', exact: true }).first().click();
  await expect(page.getByLabel('Data (obrigatória)', { exact: true })).toHaveValue('2026-10-12');
  for (const [id, value] of [['patientId', 'p1'], ['doctorId', 'd1'], ['procedure', 'Profilaxia']]) await page.locator(`#appointment_${id}`).selectOption(value);
  await page.locator('#appointment_time').fill('09:00'); await page.locator('#appointment_duration').fill('30');
  await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Consulta agendada', exact: true })).toBeVisible();
  await open(page, '/painel?date=2026-10-12');
  await expect(page.getByLabel('Resumo da clínica').locator('dd > span').first()).toHaveText('1');
  await totals(page, ['R$ 0,00', 'R$ 0,00', 'R$ 0,00']);
  await page.getByRole('link', { name: 'Registrar entrada', exact: true }).click();
  await page.locator('#cash_amount').fill('150,25'); await page.locator('#cash_date').fill('2026-10-12'); await page.locator('#cash_description').fill('Recebimento informado');
  await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Entrada registrada', exact: true })).toBeVisible();
  await open(page, '/painel?date=2026-10-12'); await page.reload();
  await totals(page, ['R$ 150,25', 'R$ 0,00', 'R$ 150,25']);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(saved.budgets).toEqual(createSeed().budgets); expect(saved.products).toEqual(createSeed().products);
});

test('estado vazio, carregamento e erro preservam referência e permitem recuperar', async ({ page }) => {
  const empty = { ...createSeed(), patients: [], doctors: [], budgets: [], products: [], movements: [] }; await inject(page, empty); await open(page);
  await expect(page.getByLabel('Resumo da clínica').locator('dd > span')).toHaveText(['0', '0', '0', '0']);
  await expect(page.getByRole('heading', { name: 'Ainda não há materiais cadastrados', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ainda não há orçamentos', exact: true })).toBeVisible();
  await scenario(page, 'slow'); await expect(page.getByText('Carregando registros…')).toBeVisible();
  await expect(page.getByLabel('Resumo da clínica')).toHaveCount(0); await expect(page.getByLabel('Resumo da clínica')).toBeVisible({ timeout: 15_000 });
  await scenario(page, 'read-error'); await expect(page.getByText('Não foi possível carregar o painel', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Resumo da clínica')).toHaveCount(0); await expect(page.getByLabel('Dia de referência')).toHaveValue(referenceDate);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(page.getByText('Não foi possível carregar o painel', { exact: true })).toBeVisible();
  await scenario(page, 'normal'); await expect(page.getByLabel('Resumo da clínica')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(JSON.stringify(empty));
});

test('painel tem teclado, gráfico acessível e layout legível em ambas as larguras', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await inject(page, populated()); await open(page);
  await expect(page.locator('main h1')).toBeFocused(); await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle); expect(outline).not.toBe('none');
  await page.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('table', { name: /^Entradas e saídas registradas em cada mês/ })).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); expect(result.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('summary').click(); await page.getByLabel('Dia de referência').focus();
  await page.screenshot({ path: testInfo.outputPath(`painel_${testInfo.project.name}.png`), fullPage: true });
  await page.getByRole('region', { name: 'Caixa de outubro de 2026', exact: true }).screenshot({ path: testInfo.outputPath(`painel_cash_${testInfo.project.name}.png`) });
  if (testInfo.project.name === 'mobile_375') {
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.getByRole('button', { name: 'Abrir navegação', exact: true }).click();
      await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Painel', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Abrir navegação', exact: true })).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('main h1')).toBeFocused();
    }
  }
  expect(errors).toEqual([]);
});
