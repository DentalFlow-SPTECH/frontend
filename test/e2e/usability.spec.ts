import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed';
import type { DemoData } from '../../src/demo/model';

const storageKey = 'dental_flow_demo_v1';
function scenarioData(): DemoData {
  const data = createSeed();
  data.appointments = [
    { id: 'ux-appointment', patientId: 'p1', doctorId: 'd1', procedure: 'Profilaxia', date: '2026-10-03', time: '09:00', duration: 30, status: 'Confirmada', observation: '', attendance: '', budgetId: 'b1', cancelReason: '', history: [] },
    { id: 'ux-appointment-next', patientId: 'p2', doctorId: 'd1', procedure: 'Profilaxia', date: '2026-10-04', time: '10:00', duration: 30, status: 'Agendada', observation: '', attendance: '', budgetId: '', cancelReason: '', history: [] },
  ];
  data.cashMovements = [
    { id: 'ux-cash', type: 'Entrada', amountCents: 150000, date: '2026-10-03', description: 'Recebimento registrado', category: 'Atendimento', paymentMethod: 'Pix', responsible: '', observation: '', history: [] },
    { id: 'ux-cash-exit', type: 'Saída', amountCents: 30000, date: '2026-10-02', description: 'Compra de materiais', category: 'Materiais', paymentMethod: 'Pix', responsible: '', observation: '', history: [] },
    { id: 'ux-cash-before', type: 'Entrada', amountCents: 80000, date: '2026-09-10', description: 'Entrada anterior', category: '', paymentMethod: '', responsible: '', observation: '', history: [] },
  ];
  data.users = [{ id: 'ux-user', name: 'Clara Monteiro', email: 'clara@example.com', phone: '', login: 'clara', profile: 'Recepção', permissions: ['agenda:visualizar'], blocked: false, history: [] }];
  return data;
}
async function inject(page: Page, data = scenarioData()) {
  await page.addInitScript(({ key, saved }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(saved)); }, { key: storageKey, saved: data });
}
async function open(page: Page, route: string) {
  await page.goto(`./#${route}`);
  await expect(page.getByText('Carregando registros…')).toHaveCount(0);
  await expect(page.locator('main h1')).toBeVisible();
}
async function scenario(page: Page, value: string) {
  await page.keyboard.press('Control+Alt+r');
  await page.getByLabel('Cenário de revisão').selectOption(value);
  await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
  if (value !== 'slow' && value !== 'read-error') await expect(page.getByText('Carregando registros…')).toHaveCount(0);
}

test('busca de paciente em orçamentos acompanha detalhe, retorno e recarregamento', async ({ page }) => {
  await open(page, '/orcamentos');
  await page.getByLabel('Buscar paciente', { exact: true }).filter({ visible: true }).fill('Marina');
  await expect(page).toHaveURL(/q=Marina/);
  await page.getByRole('link', { name: 'Ver orçamento ORC-001', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Orçamento ORC-001', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Orçamentos do paciente/ }).click();
  await expect(page.getByLabel('Buscar paciente', { exact: true }).filter({ visible: true })).toHaveValue('Marina');
  await page.reload();
  await expect(page.getByLabel('Buscar paciente', { exact: true }).filter({ visible: true })).toHaveValue('Marina');
});

test('sem pacientes o orçamento orienta cadastro e oferece o próximo passo após salvar', async ({ page }) => {
  const data = createSeed(); data.patients = []; data.budgets = [];
  await inject(page, data);
  await open(page, '/orcamentos');
  await page.getByRole('link', { name: 'Cadastrar paciente', exact: true }).click();
  await page.locator('#patient_name').fill('Lia Exemplo');
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Paciente cadastrado', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Criar orçamento', exact: true }).click();
  await expect(page.locator('#budget_patientId')).toHaveValue(/.+/);
  await expect(page.locator('#budget_patientId option:checked')).toHaveText('Lia Exemplo');
  await page.locator('#budget_doctorId').selectOption('d1');
  await page.getByRole('button', { name: 'Adicionar procedimento', exact: true }).click();
  await page.getByLabel('Procedimento', { exact: true }).selectOption('Profilaxia');
  await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
  await expect(page.getByText('Orçamento salvo.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Lia Exemplo', exact: true })).toBeVisible();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(saved.patients).toHaveLength(1); expect(saved.budgets[0].patientId).toBe(saved.patients[0].id);
  expect(saved.cashMovements).toHaveLength(0);
});

for (const operation of ['material', 'entrada', 'saida'] as const) {
  test(`falha de gravação de ${operation} no estoque recebe foco e conserva dados até tentar novamente`, async ({ page }) => {
    const route = operation === 'material' ? '/estoque/novo' : `/estoque/s1/${operation}`;
    await open(page, route);
    if (operation === 'material') {
      await page.locator('#product_name').fill('Material de exemplo'); await page.locator('#product_unit').fill('caixa');
    } else {
      await page.locator(`#${operation === 'entrada' ? 'entry' : 'exit'}_quantity`).fill('1');
      if (operation === 'saida') await page.locator('#exit_reason').selectOption('Consumo interno');
    }
    await scenario(page, 'write-error');
    const save = operation === 'material' ? 'Salvar material' : operation === 'entrada' ? 'Salvar entrada' : 'Salvar saída';
    await page.getByRole('button', { name: save, exact: true }).click();
    await expect(page.getByRole('alert').locator('..')).toBeFocused();
    await expect(page.getByRole('alert')).toContainText('Seu preenchimento foi mantido');
    await scenario(page, 'normal');
    await page.getByRole('button', { name: save, exact: true }).click();
    await expect(page.getByRole('heading', { name: operation === 'material' ? 'Material cadastrado' : operation === 'entrada' ? 'Entrada registrada' : 'Saída registrada', exact: true })).toBeVisible();
    await page.reload();
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
    if (operation === 'material') expect(saved.products.some((product: { name: string }) => product.name === 'Material de exemplo')).toBe(true);
    else expect(saved.products.find((product: { id: string }) => product.id === 's1').quantity).toBe(operation === 'entrada' ? 9 : 7);
  });
}

test('leitura do cadastro de material conserva formulário e recupera falha', async ({ page }) => {
  await open(page, '/estoque/novo');
  await page.locator('#product_name').fill('Nome preservado');
  await scenario(page, 'read-error');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await scenario(page, 'normal');
  await expect(page.locator('#product_name')).toHaveValue('Nome preservado');
});

test('agenda móvel seleciona dia por teclado e conserva dia e doutor ao voltar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile_375', 'Fluxo específico da apresentação móvel.');
  await inject(page); await open(page, '/agenda?date=2026-10-03&doutor=d1');
  await page.getByRole('button', { name: 'Ver consultas de 04/10/2026', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Consultas de 04/10/2026', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Rafael Nogueira/ }).filter({ visible: true }).click();
  await page.getByRole('link', { name: /Voltar à agenda/ }).click();
  await expect(page.locator('#agenda_date')).toHaveValue('2026-10-04');
  await expect(page.locator('#agenda_doctor')).toHaveValue('d1');
  await page.reload(); await expect(page.locator('#agenda_date')).toHaveValue('2026-10-04');
  await page.getByRole('button', { name: 'Ver grade de horários da semana' }).click();
  await expect(page.getByRole('region', { name: 'Agenda semanal, dias e horários' })).toBeVisible();
});

test('tabela do gráfico de caixa abre o mês exato e mantém os totais em centavos', async ({ page }) => {
  await inject(page); await open(page, '/painel?date=2026-10-03');
  await page.getByText('Ver valores por mês', { exact: true }).click();
  await page.getByRole('link', { name: 'Ver caixa de setembro de 2026', exact: true }).click();
  await expect(page.locator('#cash_from')).toHaveValue('2026-09-01');
  await expect(page.locator('#cash_until')).toHaveValue('2026-09-30');
  await expect(page.getByLabel('Totais das movimentações exibidas').locator('dd')).toHaveText(['R$ 800,00', 'R$ 0,00', 'R$ 800,00']);
});

const screens = [
  ['painel', '/painel?date=2026-10-03'], ['agenda', '/agenda?date=2026-10-03'], ['agenda-mes', '/agenda?date=2026-10-03&view=month'],
  ['consulta', '/agenda/ux-appointment?date=2026-10-03'], ['consulta-nova', '/agenda/nova?date=2026-10-03'], ['consulta-editar', '/agenda/ux-appointment/editar?date=2026-10-03'],
  ['pacientes', '/pacientes'], ['paciente', '/pacientes/p1'], ['paciente-novo', '/pacientes/novo'], ['paciente-editar', '/pacientes/p1/editar'],
  ['doutores', '/doutores'], ['doutor', '/doutores/d1'], ['doutor-novo', '/doutores/novo'], ['doutor-editar', '/doutores/d1/editar'],
  ['orcamentos', '/orcamentos?paciente=p1'], ['orcamento', '/orcamentos/b1'], ['orcamento-novo', '/orcamentos/novo?paciente=p1'],
  ['estoque', '/estoque'], ['material', '/estoque/s1'], ['material-novo', '/estoque/novo'], ['estoque-entrada', '/estoque/s1/entrada'], ['estoque-saida', '/estoque/s1/saida'],
  ['caixa', '/caixa?de=2026-10-01&ate=2026-10-31'], ['movimentacao', '/caixa/ux-cash'], ['caixa-entrada', '/caixa/entrada'], ['caixa-saida', '/caixa/saida'],
  ['administracao', '/administracao'], ['usuario', '/administracao/ux-user'], ['usuario-novo', '/administracao/novo'], ['usuario-editar', '/administracao/ux-user/editar'], ['revisao', '/revisao'],
] as const;

test('todas as telas: axe, textos longos, 320 px, ampliação equivalente a 200% e capturas', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const data = scenarioData();
  const longName = 'PacienteExemplo'.repeat(24);
  data.patients[0].name = longName;
  data.doctors[0].specialty = 'Especialidade'.repeat(24);
  data.products[0].name = 'MaterialExemplo'.repeat(24);
  data.users[0].name = 'UsuarioExemplo'.repeat(24);
  await inject(page, data);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const originalViewport = page.viewportSize()!;
  for (const [name, route] of screens) {
    await page.setViewportSize(originalViewport); await open(page, route);
    expect((await new AxeBuilder({ page }).analyze()).violations, name).toEqual([]);
    for (const viewport of [originalViewport, { width: 320, height: 812 }, { width: 720, height: 480 }]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} em ${viewport.width}px`).toBe(true);
    }
  }
  expect(errors).toEqual([]);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(JSON.stringify(data));
});

test('capturas das telas com cenário fictício de revisão', async ({ page }, testInfo) => {
  test.setTimeout(120_000); await inject(page);
  for (const [name, route] of screens) {
    await open(page, route); await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  }
});
