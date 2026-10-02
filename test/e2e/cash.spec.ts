import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed';
import type { CashMovement, DemoData } from '../../src/demo/model';
import { money } from '../../src/demo/format';

const storageKey = 'dental_flow_demo_v1';
const fixtures: CashMovement[] = [
  { id: 'cash-a', type: 'Entrada', amountCents: 100000, date: '2026-10-01', description: 'Recebimento informado', category: 'Atendimento', paymentMethod: 'PIX', responsible: 'Clara Monteiro', observation: '', history: [] },
  { id: 'cash-b', type: 'Saída', amountCents: 25000, date: '2026-10-02', description: 'Compra avulsa de materiais', category: 'Materiais', paymentMethod: 'Cartão', responsible: '', observation: '', history: [] },
  { id: 'cash-c', type: 'Entrada', amountCents: 30000, date: '2026-09-30', description: 'Entrada de setembro', category: 'Atendimento', paymentMethod: 'Dinheiro', responsible: '', observation: '', history: [] },
  { id: 'cash-d', type: 'Saída', amountCents: 20000, date: '2026-10-03', description: 'Revisão de equipamento', category: 'Manutenção', paymentMethod: 'Transferência', responsible: '', observation: '', history: [] },
];

async function open(page: Page, route = '/caixa') {
  await page.goto(`./#${route}`);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByText('Carregando registros…')).toHaveCount(0, { timeout: 15_000 });
}

async function snapshot(page: Page): Promise<DemoData> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
}

async function inject(page: Page, data: object) {
  await page.addInitScript(({ key, saved }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(saved)); }, { key: storageKey, saved: data });
}

async function fill(page: Page, values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) await page.locator(`#cash_${key}`).fill(value);
}

async function expectFields(page: Page, values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) await expect(page.locator(`#cash_${key}`)).toHaveValue(value);
}

async function scenario(page: Page, value: string) {
  if (!(await page.getByRole('dialog', { name: 'Revisão da interface' }).isVisible())) await page.keyboard.press('Control+Alt+r');
  await expect(page.getByRole('dialog', { name: 'Revisão da interface' })).toBeVisible();
  await page.getByLabel('Cenário de revisão').selectOption(value);
  await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
  if (value !== 'read-error' && value !== 'slow') await expect(page.getByText('Carregando registros…')).toHaveCount(0);
}

async function totals(page: Page, entries: number, exits: number) {
  const summary = page.locator('dl[aria-label="Totais das movimentações exibidas"] dd');
  await expect(summary).toHaveText([money(entries), money(exits), money(entries - exits)]);
}

test('caixa inicial é vazio sem contabilizar orçamentos aprovados ou estoque', async ({ page }) => {
  await open(page);
  await expect(page.locator('main h1')).toHaveText('Caixa');
  await expect(page.getByRole('heading', { name: 'Ainda não há movimentações', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Registrar entrada', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Registrar saída', exact: true })).toBeVisible();
  await totals(page, 0, 0);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
});

test('entrada mínima conserva centavos, registro e histórico após recarregar', async ({ page }) => {
  await open(page, '/caixa/entrada');
  await fill(page, { amount: '123,45', date: '2026-10-02', description: 'Entrada manual de teste' });
  await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Entrada registrada');
  await expect(page.locator('main h1')).toBeFocused();
  const saved = await snapshot(page);
  expect(saved.cashMovements).toHaveLength(1);
  const movement = saved.cashMovements[0];
  expect(movement).toMatchObject({ type: 'Entrada', amountCents: 12345, date: '2026-10-02', description: 'Entrada manual de teste', category: '', paymentMethod: '', responsible: '', observation: '' });
  expect(movement.history).toHaveLength(1);
  expect(movement.history[0].actor).toBe('Você');
  await page.getByRole('link', { name: 'Ver movimentação', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText(movement.description);
  await expect(page.getByRole('heading', { name: 'Histórico da movimentação', exact: true })).toBeVisible();
  await expect(page.getByText(movement.history[0].description, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('main h1')).toHaveText(movement.description);
  expect((await snapshot(page)).cashMovements[0]).toEqual(movement);
  await page.getByRole('link', { name: /Voltar ao caixa/ }).click();
  await totals(page, 12345, 0);
});

test('saída completa é independente do estoque, dos orçamentos e de saldo inicial', async ({ page }) => {
  await open(page, '/caixa/saida');
  const values = { amount: '2345,67', date: '2026-10-02', description: 'Compra informada de material', category: 'Materiais especiais', paymentMethod: 'Forma acordada', responsible: 'Clara Monteiro', observation: 'Fornecedor fictício; conferência por Clara.' };
  await fill(page, values);
  await page.getByRole('button', { name: 'Salvar saída', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Saída registrada');
  const saved = await snapshot(page);
  expect(saved.cashMovements).toHaveLength(1);
  expect(saved.cashMovements[0]).toMatchObject({ type: 'Saída', amountCents: 234567, date: values.date, description: values.description, category: values.category, paymentMethod: values.paymentMethod, responsible: values.responsible, observation: values.observation });
  const seed = createSeed();
  for (const key of ['patients', 'doctors', 'budgets', 'products', 'movements', 'appointments'] as const) expect(saved[key]).toEqual(seed[key]);
  await page.getByRole('link', { name: 'Ver movimentação', exact: true }).click();
  for (const key of ['category', 'paymentMethod', 'responsible', 'observation'] as const) await expect(page.getByText(values[key], { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('main h1')).toHaveText(values.description);
  await page.getByRole('link', { name: /Voltar ao caixa/ }).click();
  await totals(page, 0, 234567);
});

test('valor positivo, data e descrição recebem erros associados com foco sem apagar opcionais', async ({ page }) => {
  await open(page, '/caixa/entrada');
  await fill(page, { date: '', category: 'Categoria livre', observation: 'Manter esta observação.' });
  await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
  await expect(page.locator('#cash_amount')).toBeFocused();
  await expect(page.locator('#cash_amount')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#cash_amount')).toHaveAttribute('aria-describedby', /cash_amount_error/);
  await expect(page.locator('#cash_date_error')).toBeVisible();
  await expect(page.locator('#cash_description_error')).toBeVisible();
  for (const invalid of ['0', '-5', '1,234', 'abc']) {
    await fill(page, { amount: invalid });
    await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
    await expect(page.locator('#cash_amount')).toBeFocused();
    await expect(page.locator('#cash_amount_error')).toBeVisible();
  }
  await fill(page, { amount: '0,01' });
  await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
  await expect(page.locator('#cash_date')).toBeFocused();
  await fill(page, { date: '2026-10-02' });
  await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
  await expect(page.locator('#cash_description')).toBeFocused();
  await expectFields(page, { category: 'Categoria livre', observation: 'Manter esta observação.' });
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await fill(page, { description: 'Centavo registrado' });
  await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Entrada registrada');
  expect((await snapshot(page)).cashMovements[0].amountCents).toBe(1);
});

test('falha de gravação mantém todos os campos, foca aviso e permite repetir sem duplicar', async ({ page }) => {
  await open(page, '/caixa/saida');
  const values = { amount: '45,90', date: '2026-10-01', description: 'Saída para manutenção', category: 'Manutenção', paymentMethod: 'PIX', responsible: 'Clara Monteiro', observation: 'Não apagar preenchimento.' };
  await fill(page, values);
  await scenario(page, 'write-error');
  await page.getByRole('button', { name: 'Salvar saída', exact: true }).click();
  await expect(page.getByText('Não foi possível salvar', { exact: true })).toBeVisible();
  await expect(page.locator(':focus')).toContainText('Não foi possível salvar');
  await expectFields(page, values);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await scenario(page, 'normal');
  await expectFields(page, values);
  await page.getByRole('button', { name: 'Salvar saída', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Saída registrada');
  expect((await snapshot(page)).cashMovements).toHaveLength(1);
});

test('saída do formulário permite conservar ou descartar e mantém filtros do caixa', async ({ page }) => {
  await open(page, '/caixa/entrada?de=2026-10-01&categoria=Materiais');
  await fill(page, { description: 'Preenchimento pendente', amount: '55,00' });
  page.once('dialog', dialog => { expect(dialog.type()).toBe('confirm'); return dialog.dismiss(); });
  await page.getByRole('link', { name: /Voltar ao caixa/ }).click();
  await expectFields(page, { description: 'Preenchimento pendente', amount: '55,00' });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('link', { name: /Voltar ao caixa/ }).click();
  await expect(page.getByLabel('Data inicial', { exact: true })).toHaveValue('2026-10-01');
  await expect(page.getByLabel('Filtrar por categoria', { exact: true })).toHaveValue('Materiais');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
});

test('período, tipo, categoria e forma de pagamento filtram resultados e seus totais', async ({ page }) => {
  await inject(page, { ...createSeed(), cashMovements: fixtures });
  await open(page);
  await totals(page, 130000, 45000);
  await page.getByLabel('Data inicial', { exact: true }).fill('2026-10-01');
  await page.getByLabel('Data final', { exact: true }).fill('2026-10-02');
  await totals(page, 100000, 25000);
  await expect(page.getByRole('status').filter({ hasText: '2 registros' })).toBeVisible();
  await page.getByLabel('Tipo de movimentação', { exact: true }).selectOption('Saída');
  await page.getByLabel('Filtrar por categoria', { exact: true }).fill('materiais');
  await page.getByLabel('Filtrar por forma de pagamento', { exact: true }).fill('cartao');
  await totals(page, 0, 25000);
  await expect(page.getByRole('link', { name: 'Compra avulsa de materiais', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver movimentação: Compra avulsa de materiais', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Compra avulsa de materiais');
  await page.getByRole('link', { name: /Voltar ao caixa/ }).click();
  await expect(page.getByLabel('Filtrar por forma de pagamento', { exact: true })).toHaveValue('cartao');
  await expect(page.getByLabel('Tipo de movimentação', { exact: true })).toHaveValue('Saída');
  await page.getByLabel('Filtrar por categoria', { exact: true }).fill('sem esta categoria');
  await expect(page.getByRole('heading', { name: 'Nenhuma movimentação encontrada', exact: true })).toBeVisible();
  await totals(page, 0, 0);
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).first().click();
  await totals(page, 130000, 45000);
  await page.getByLabel('Data inicial', { exact: true }).fill('2026-10-03');
  await page.getByLabel('Data final', { exact: true }).fill('2026-10-01');
  await expect(page.getByText('A data final deve ser igual ou posterior à data inicial.', { exact: true })).toBeVisible();
});

test('carregamento e falha de leitura não apagam filtros nem preenchimento do caixa', async ({ page }) => {
  await inject(page, { ...createSeed(), cashMovements: fixtures });
  await open(page, '/caixa?categoria=Manuten%C3%A7%C3%A3o');
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await scenario(page, 'slow');
  await expect(page.getByText('Carregando registros…')).toBeVisible();
  await page.clock.runFor(1600);
  await expect(page.getByText('Carregando registros…')).toHaveCount(0);
  await page.clock.resume();
  await scenario(page, 'read-error');
  await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
  await scenario(page, 'normal');
  await expect(page.getByLabel('Filtrar por categoria', { exact: true })).toHaveValue('Manutenção');
  await expect(page.getByRole('link', { name: 'Revisão de equipamento', exact: true })).toBeVisible();
  await open(page, '/caixa/entrada');
  await fill(page, { amount: '90,00', description: 'Manter campos durante erro de leitura' });
  await scenario(page, 'read-error');
  await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar entrada', exact: true })).toHaveCount(0);
  await scenario(page, 'normal');
  await expectFields(page, { amount: '90,00', description: 'Manter campos durante erro de leitura' });
});

test('registro ausente oferece retorno ao caixa com o período preservado', async ({ page }) => {
  await open(page, '/caixa/sem-registro?de=2026-10-01');
  await expect(page.locator('main h1')).toHaveText('Movimentação não encontrada');
  await page.getByRole('link', { name: 'Voltar ao caixa', exact: true }).click();
  await expect(page.getByLabel('Data inicial', { exact: true })).toHaveValue('2026-10-01');
});

test('snapshot antigo recebe coleção de caixa sem modificar registros nem saldo de estoque', async ({ page }) => {
  const { appointments: _appointments, cashMovements: _cash, users: _users, audit: _audit, ...legacy } = createSeed();
  legacy.products = legacy.products.map(product => product.id === 's1' ? { ...product, quantity: 17 } : product);
  await inject(page, legacy);
  await open(page);
  await expect(page.getByRole('heading', { name: 'Ainda não há movimentações', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Registrar entrada', exact: true }).click();
  await fill(page, { amount: '25,00', date: '2026-10-02', description: 'Nova entrada em base anterior' });
  await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Entrada registrada');
  const saved = await snapshot(page);
  expect(saved.cashMovements).toHaveLength(1);
  expect(saved.budgets).toEqual(legacy.budgets);
  expect(saved.products).toEqual(legacy.products);
  expect(saved.movements).toEqual(legacy.movements);
  expect(saved.patients).toEqual(legacy.patients);
  await page.getByRole('link', { name: 'Ver movimentação', exact: true }).click();
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('Nova entrada em base anterior');
});

test('lista, entrada, saída e detalhe têm rótulos acessíveis e cabem na largura da tela', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await inject(page, { ...createSeed(), cashMovements: fixtures });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/caixa', '/caixa/entrada', '/caixa/saida', '/caixa/cash-a']) {
    await open(page, route);
    await expect(page.locator('main h1')).toBeFocused();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '_')}_${testInfo.project.name}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});
