import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed';

const storageKey = 'dental_flow_demo_v1';
const optionalFields = ['cpf', 'birthDate', 'phone', 'mobile', 'email', 'postalCode', 'street', 'number', 'complement', 'district', 'city', 'state', 'observation', 'emergencyContact', 'insurance', 'insuranceNumber'] as const;
const completePatient = {
  name: 'Clara Monteiro', cpf: '000.000.000-00', birthDate: '1994-02-17', phone: '(11) 4000-0199', mobile: '(11) 90000-0199', email: 'clara@example.com',
  postalCode: '00000-000', street: 'Rua do Horizonte', number: '42', complement: 'Sala 2', district: 'Jardim Central', city: 'São Paulo', state: 'SP',
  observation: 'Prefere contato no período da tarde.', emergencyContact: 'Bruno Monteiro — (11) 90000-0198', insurance: 'Convênio Horizonte', insuranceNumber: 'PLANO-0099',
};
interface SavedPatient { id: string; code: string; name: string; history: { description: string }[] }
interface SavedSnapshot { version: number; patients: SavedPatient[]; budgets: { id: string; code: string; patientId: string }[]; products: unknown[]; movements: unknown[] }

async function open(page: Page, route = '/pacientes') {
  await page.goto(`./#${route}`);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByText('Carregando registros…')).toHaveCount(0, { timeout: 15_000 });
}

async function openReview(page: Page) {
  if (!(await page.getByRole('dialog', { name: 'Revisão da interface' }).isVisible())) await page.keyboard.press('Control+Alt+r');
  await expect(page.getByRole('dialog', { name: 'Revisão da interface' })).toBeVisible();
}

async function scenario(page: Page, value: string) {
  await openReview(page);
  await page.getByLabel('Cenário de revisão').selectOption(value);
  await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
  if (value !== 'read-error' && value !== 'slow') await expect(page.getByText('Carregando registros…')).toHaveCount(0);
}

async function snapshot(page: Page): Promise<SavedSnapshot> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
}

async function fillPatient(page: Page, values: Record<string, string>) {
  for (const [field, value] of Object.entries(values)) {
    await expect(page.locator(`#patient_${field}`)).toBeVisible();
    await page.locator(`#patient_${field}`).fill(value);
  }
}

async function createPatient(page: Page, values: Record<string, string> = { name: 'Clara Monteiro' }) {
  await open(page, '/pacientes/novo');
  await fillPatient(page, values);
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Paciente cadastrado', exact: true })).toBeVisible();
  const saved = await snapshot(page);
  const patient = saved.patients.find(value => value.name === values.name)!;
  expect(patient).toBeDefined();
  return patient;
}

async function expectValues(page: Page, values: Record<string, string>) {
  for (const [field, value] of Object.entries(values)) await expect(page.locator(`#patient_${field}`)).toHaveValue(value);
}

test('busca de pacientes conserva o filtro no detalhe, cadastro e retorno', async ({ page }) => {
  await open(page);
  await page.getByLabel('Buscar paciente', { exact: true }).fill('Marina');
  await expect(page).toHaveURL(/#\/pacientes\?q=Marina$/);
  await expect(page.getByRole('heading', { name: 'Marina Albuquerque', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rafael Nogueira', exact: true })).toHaveCount(0);
  await page.locator('main a[href^="#/pacientes/p1"]').filter({ visible: true }).first().click();
  await expect(page.locator('main h1')).toHaveText('Marina Albuquerque');
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('Marina Albuquerque');
  await page.getByRole('link', { name: /Voltar aos pacientes/ }).click();
  await expect(page.getByLabel('Buscar paciente', { exact: true })).toHaveValue('Marina');
  await page.getByRole('link', { name: 'Novo paciente', exact: true }).click();
  await expect(page.locator('#patient_name')).toBeVisible();
  await page.getByRole('link', { name: /Voltar aos pacientes/ }).click();
  await expect(page.getByLabel('Buscar paciente', { exact: true })).toHaveValue('Marina');
  await page.reload();
  await expect(page.getByLabel('Buscar paciente', { exact: true })).toHaveValue('Marina');
  await page.getByLabel('Buscar paciente', { exact: true }).fill('Nome sem registro');
  await expect(page.getByRole('heading', { name: 'Nenhum paciente encontrado', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca', exact: true }).click();
  await expect(page.getByLabel('Buscar paciente', { exact: true })).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Rafael Nogueira', exact: true })).toBeVisible();
});

test('somente nome completo permite cadastrar e mantém todos os campos opcionais vazios', async ({ page }) => {
  const patient = await createPatient(page, { name: 'Lívia Duarte' });
  expect(patient.code).toBe('PAC-005');
  expect(patient.history).toHaveLength(1);
  expect(patient.history[0].description).toBe('Cadastro criado.');
  await page.getByRole('link', { name: 'Ver paciente', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Lívia Duarte');
  await expect(page.getByRole('heading', { name: 'Histórico cadastral', exact: true })).toBeVisible();
  await expect(page.getByText('Cadastro criado.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('Lívia Duarte');
  await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
  await expectValues(page, { name: 'Lívia Duarte', ...Object.fromEntries(optionalFields.map(field => [field, ''])) });
  expect((await snapshot(page)).patients.find(value => value.id === patient.id)).toEqual(patient);
});

test('cadastro completo conserva contatos, endereço e informações complementares após recarregar', async ({ page }) => {
  const patient = await createPatient(page, completePatient);
  await page.getByRole('link', { name: 'Ver paciente', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText(completePatient.name);
  for (const field of ['cpf', 'phone', 'mobile', 'email', 'street', 'complement', 'district', 'city', 'observation', 'emergencyContact', 'insurance', 'insuranceNumber'] as const) {
    await expect(page.getByText(completePatient[field], { exact: true })).toBeVisible();
  }
  await page.reload();
  await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
  await expectValues(page, completePatient);
  const saved = await snapshot(page);
  expect(saved.patients).toHaveLength(5);
  expect(saved.patients.find(value => value.id === patient.id)?.code).toBe(patient.code);
  expect(saved.budgets).toEqual(createSeed().budgets);
});

test('novo paciente recebe orçamento e edição preserva identidade, relação e histórico', async ({ page }) => {
  const patient = await createPatient(page, completePatient);
  await page.getByRole('link', { name: 'Ver orçamentos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ainda não há orçamentos', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: completePatient.name, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Criar primeiro orçamento', exact: true }).click();
  await expect(page.getByLabel('Paciente', { exact: true })).toHaveValue(patient.id);
  await page.getByLabel('Doutor', { exact: true }).selectOption('d1');
  await page.getByRole('button', { name: 'Adicionar procedimento', exact: true }).click();
  await page.getByLabel('Procedimento', { exact: true }).selectOption({ label: 'Profilaxia' });
  await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Orçamento ORC-004', exact: true })).toBeVisible();
  const beforeEdit = await snapshot(page);
  const budget = beforeEdit.budgets.find(value => value.patientId === patient.id)!;
  expect(budget).toBeDefined();
  await page.getByRole('link', { name: 'Ver paciente', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText(completePatient.name);
  await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
  await fillPatient(page, { name: 'Clara Monteiro Lima', email: 'clara.lima@example.com' });
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cadastro atualizado', exact: true })).toBeVisible();
  const afterEdit = await snapshot(page);
  const updated = afterEdit.patients.find(value => value.id === patient.id)!;
  expect(updated.code).toBe(patient.code);
  expect(updated.name).toBe('Clara Monteiro Lima');
  expect(afterEdit.patients).toHaveLength(beforeEdit.patients.length);
  expect(afterEdit.budgets).toEqual(beforeEdit.budgets);
  expect(updated.history).toHaveLength(2);
  expect(updated.history[0]).toEqual(patient.history[0]);
  expect(updated.history[1].description).toContain('Nome completo');
  expect(updated.history[1].description).toContain('E-mail');
  await page.getByRole('link', { name: 'Ver paciente', exact: true }).click();
  await expect(page.getByText(updated.history[1].description, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('Clara Monteiro Lima');
  await page.getByRole('link', { name: 'Ver orçamentos', exact: true }).click();
  await expect(page.getByRole('link', { name: `Ver orçamento ${budget.code}`, exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('link', { name: `Ver orçamento ${budget.code}`, exact: true }).filter({ visible: true }).click();
  await expect(page.getByLabel('Paciente', { exact: true })).toHaveValue(patient.id);
  await expect(page.getByRole('heading', { name: 'Clara Monteiro Lima', exact: true })).toBeVisible();
  await expect(page.getByLabel('Procedimento', { exact: true })).toHaveValue('Profilaxia');
});

test('CPF e celular são pesquisáveis sem pontuação e edição sem mudanças não cria histórico', async ({ page }) => {
  const patient = await createPatient(page, completePatient);
  await open(page, '/pacientes?q=00000000000');
  await expect(page.getByRole('heading', { name: completePatient.name, exact: true })).toBeVisible();
  await expect(page.locator('main ul').first().locator('li')).toHaveCount(1);
  await page.getByLabel('Buscar paciente', { exact: true }).fill('11900000199');
  await expect(page.getByRole('heading', { name: completePatient.name, exact: true })).toBeVisible();
  await page.getByRole('link', { name: completePatient.name, exact: true }).click();
  await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cadastro atualizado', exact: true })).toBeVisible();
  expect((await snapshot(page)).patients.find(value => value.id === patient.id)?.history).toEqual(patient.history);
  await page.getByRole('link', { name: 'Ver paciente', exact: true }).click();
  await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
  await fillPatient(page, { cpf: '', mobile: '', birthDate: '' });
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cadastro atualizado', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver paciente', exact: true }).click();
  await page.reload();
  await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
  await expectValues(page, { cpf: '', mobile: '', birthDate: '', phone: completePatient.phone });
  expect((await snapshot(page)).patients.find(value => value.id === patient.id)?.history).toHaveLength(2);
});

test('nome obrigatório associa o erro e recebe foco sem apagar os campos opcionais', async ({ page }) => {
  await open(page, '/pacientes/novo');
  await fillPatient(page, { cpf: '000.000.000-00', observation: 'Prefere atendimento no início da tarde.' });
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.locator('#patient_name')).toBeFocused();
  await expect(page.locator('#patient_name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#patient_name')).toHaveAttribute('aria-describedby', /patient_name_error/);
  await expect(page.locator('#patient_name_error')).toBeVisible();
  await expectValues(page, { cpf: '000.000.000-00', observation: 'Prefere atendimento no início da tarde.' });
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await page.locator('#patient_name').fill('Lívia Duarte');
  await expect(page.locator('#patient_name')).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Paciente cadastrado', exact: true })).toBeVisible();
});

test('falha de cadastro conserva preenchimento, foca o aviso e permite salvar uma vez', async ({ page }) => {
  await open(page, '/pacientes/novo');
  await fillPatient(page, completePatient);
  await scenario(page, 'write-error');
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByText('Não foi possível salvar', { exact: true })).toBeVisible();
  await expect(page.locator(':focus')).toContainText('Não foi possível salvar');
  await expectValues(page, completePatient);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await scenario(page, 'normal');
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Paciente cadastrado', exact: true })).toBeVisible();
  const saved = await snapshot(page);
  expect(saved.patients.filter(value => value.name === completePatient.name)).toHaveLength(1);
  expect(saved.patients.find(value => value.name === completePatient.name)?.history).toHaveLength(1);
});

test('erro de edição e nome vazio preservam os dados salvos até repetir o envio', async ({ page }) => {
  const patient = await createPatient(page, completePatient);
  const beforeEdit = await snapshot(page);
  await page.getByRole('link', { name: 'Ver paciente', exact: true }).click();
  await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
  await fillPatient(page, { name: '', observation: 'Retornar contato na quinta-feira.' });
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.locator('#patient_name')).toBeFocused();
  await expectValues(page, { observation: 'Retornar contato na quinta-feira.', email: completePatient.email });
  expect(await snapshot(page)).toEqual(beforeEdit);
  await fillPatient(page, { name: 'Clara Monteiro Lima' });
  await scenario(page, 'write-error');
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByText('Não foi possível salvar', { exact: true })).toBeVisible();
  await expectValues(page, { name: 'Clara Monteiro Lima', observation: 'Retornar contato na quinta-feira.', email: completePatient.email });
  expect(await snapshot(page)).toEqual(beforeEdit);
  await scenario(page, 'normal');
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cadastro atualizado', exact: true })).toBeVisible();
  const afterEdit = await snapshot(page);
  expect(afterEdit.patients.find(value => value.id === patient.id)?.history).toHaveLength(2);
  expect(afterEdit.budgets).toEqual(beforeEdit.budgets);
});

test('aviso ao sair permite conservar ou descartar o novo cadastro sem perder a busca', async ({ page }) => {
  await open(page, '/pacientes/novo?q=Marina');
  await fillPatient(page, { name: 'Lívia Duarte', mobile: '(11) 90000-0197' });
  page.once('dialog', dialog => { expect(dialog.type()).toBe('confirm'); return dialog.dismiss(); });
  await page.getByRole('link', { name: /Voltar aos pacientes/ }).click();
  await expectValues(page, { name: 'Lívia Duarte', mobile: '(11) 90000-0197' });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('link', { name: /Voltar aos pacientes/ }).click();
  await expect(page.getByLabel('Buscar paciente', { exact: true })).toHaveValue('Marina');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
});

test('descarte de edição mantém o cadastro original e o caminho de retorno à busca', async ({ page }) => {
  await open(page, '/pacientes/p1/editar?q=Marina');
  await fillPatient(page, { name: 'Marina Albuquerque Lima', observation: 'Entrar em contato na próxima semana.' });
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('link', { name: /Voltar ao paciente/ }).click();
  await expectValues(page, { name: 'Marina Albuquerque Lima', observation: 'Entrar em contato na próxima semana.' });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('link', { name: /Voltar ao paciente/ }).click();
  await expect(page.locator('main h1')).toHaveText('Marina Albuquerque');
  await expect(page.getByText('Entrar em contato na próxima semana.', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: /Voltar aos pacientes/ }).click();
  await expect(page.getByLabel('Buscar paciente', { exact: true })).toHaveValue('Marina');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
});

test('carregamento e falha de leitura de pacientes permitem recuperar a busca', async ({ page }) => {
  await open(page, '/pacientes?q=Marina');
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
  await expect(page.getByLabel('Buscar paciente', { exact: true })).toHaveValue('Marina');
  await expect(page.getByRole('heading', { name: 'Marina Albuquerque', exact: true })).toBeVisible();
});

test('detalhe e formulários apresentam erro de leitura com recuperação', async ({ page }) => {
  test.setTimeout(60_000);
  for (const route of ['/pacientes/p1', '/pacientes/novo', '/pacientes/p1/editar']) {
    await open(page, route);
    await scenario(page, 'read-error');
    await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar paciente', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
    await scenario(page, 'normal');
    await expect(page.getByText('Não foi possível carregar', { exact: true })).toHaveCount(0);
    if (route !== '/pacientes/p1') await expect(page.locator('#patient_name')).toBeVisible();
    else await expect(page.getByRole('link', { name: 'Editar cadastro', exact: true })).toBeVisible();
  }
});

test('lista vazia orienta novo cadastro e rotas sem paciente oferecem retorno', async ({ page }) => {
  const empty = { ...createSeed(), patients: [], budgets: [] };
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: storageKey, data: empty });
  await open(page);
  await expect(page.getByRole('heading', { name: /Nenhum paciente|Ainda não há pacientes/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Novo paciente', exact: true })).toBeVisible();
  for (const route of ['/pacientes/sem-registro', '/pacientes/sem-registro/editar']) {
    await open(page, route);
    await expect(page.getByRole('heading', { name: 'Paciente não encontrado', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar paciente', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: /Voltar aos pacientes/ }).click();
    await expect(page.locator('main h1')).toHaveText('Pacientes');
  }
});

test('snapshot anterior conserva campos originais, identificadores e orçamentos na primeira edição', async ({ page }) => {
  const current = createSeed();
  const previousPatient = { id: 'previous-patient', code: 'PAC-024', name: 'Cecília Santos', birthDate: '', phone: '(11) 90000-0196', email: 'cecilia@example.com', observation: 'Contato na parte da manhã.' };
  const previousBudget = { ...current.budgets[0], id: 'previous-budget', code: 'ORC-024', patientId: previousPatient.id, local: true, observation: 'Planejamento informado em atendimento anterior.', history: [{ id: 'previous-history', date: '2026-10-01', actor: 'Você', description: 'Orçamento criado.' }] };
  const legacy = { ...current, patients: [...current.patients.map(({ id, code, name, birthDate, phone, email, observation }) => ({ id, code, name, birthDate, phone, email, observation })), previousPatient], budgets: [...current.budgets, previousBudget], products: current.products.map(product => product.id === 's1' ? { ...product, quantity: 17 } : product) };
  await page.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); }, { key: storageKey, data: legacy });
  await open(page, '/pacientes/p1');
  await expect(page.locator('main h1')).toHaveText('Marina Albuquerque');
  await expect(page.getByText('(11) 90000-0101', { exact: true })).toBeVisible();
  await expect(page.getByText('marina@example.com', { exact: true })).toBeVisible();
  await expect(page.getByText(/Não foi possível abrir os dados salvos/)).toHaveCount(0);
  await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
  await expectValues(page, { name: 'Marina Albuquerque', birthDate: '1991-06-14', phone: '(11) 90000-0101', email: 'marina@example.com', ...Object.fromEntries(optionalFields.filter(field => !['birthDate', 'phone', 'email', 'observation'].includes(field)).map(field => [field, ''])) });
  await fillPatient(page, { name: 'Marina Albuquerque Lima', cpf: '000.000.000-00' });
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cadastro atualizado', exact: true })).toBeVisible();
  const saved = await snapshot(page);
  expect(saved.version).toBe(1);
  expect(saved.patients).toHaveLength(legacy.patients.length);
  expect(saved.patients.find(value => value.id === 'p1')).toMatchObject({ code: 'PAC-001', name: 'Marina Albuquerque Lima', birthDate: '1991-06-14', phone: '(11) 90000-0101', email: 'marina@example.com', cpf: '000.000.000-00' });
  expect(saved.patients.find(value => value.id === previousPatient.id)).toMatchObject(previousPatient);
  expect(saved.budgets).toEqual(legacy.budgets);
  expect(saved.products).toEqual(legacy.products);
  expect(saved.movements).toEqual(legacy.movements);
  await page.getByRole('link', { name: 'Ver paciente', exact: true }).click();
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('Marina Albuquerque Lima');
  expect((await snapshot(page)).patients.find(value => value.id === previousPatient.id)).toMatchObject(previousPatient);
  await page.getByRole('link', { name: 'Ver orçamentos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Marina Albuquerque Lima', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ver orçamento ORC-00[12]/ }).filter({ visible: true })).toHaveCount(2);
});

test('gravação pendente bloqueia descarte, alteração de cenário e restauração do paciente', async ({ page }) => {
  await open(page, '/pacientes/novo');
  await fillPatient(page, { name: 'Lívia Duarte' });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await scenario(page, 'slow');
  await page.clock.runFor(1600);
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await expect(page.locator('#patient_name')).toBeDisabled();
  await openReview(page);
  await expect(page.getByRole('button', { name: 'Restaurar dados de teste', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Cenário de revisão')).toBeDisabled();
  await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
  page.once('dialog', dialog => { expect(dialog.type()).toBe('alert'); return dialog.accept(); });
  await page.getByRole('link', { name: /Voltar aos pacientes/ }).click();
  await expect(page.locator('#patient_name')).toHaveValue('Lívia Duarte');
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: 'Paciente cadastrado', exact: true })).toBeVisible();
  const saved = await snapshot(page);
  expect(saved.patients).toHaveLength(5);
  expect(saved.patients.find(value => value.name === 'Lívia Duarte')?.history).toHaveLength(1);
});

test('novas telas e confirmação de pacientes têm acessibilidade, foco e largura sem overflow', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const patient = await createPatient(page, completePatient);
  const routes = ['/pacientes', '/pacientes/novo', `/pacientes/${patient.id}`, `/pacientes/${patient.id}/editar`, '/pacientes/sem-registro', '/pacientes?q=SemResultado'];
  async function inspect(label: string) {
    await expect(page.locator('main h1')).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `Overflow em ${label}`).toBe(false);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })), label).toEqual([]);
  }
  await inspect('confirmação de cadastro');
  await page.screenshot({ path: testInfo.outputPath(`patient_success_${testInfo.project.name}.png`), fullPage: true });
  for (const route of routes) {
    await open(page, route);
    await inspect(route);
    if (route === '/pacientes/novo' || route === `/pacientes/${patient.id}/editar`) {
      for (const field of ['name', ...optionalFields]) await expect(page.locator(`#patient_${field}`)).toBeVisible();
      await page.locator('#patient_name').focus();
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => { const active = document.activeElement!; return { tag: active.tagName, outline: getComputedStyle(active).outlineStyle }; });
      expect(focus.tag).not.toBe('BODY');
      expect(focus.outline).not.toBe('none');
    }
    if (route === '/pacientes/novo' || route === `/pacientes/${patient.id}` || route === '/pacientes') await page.screenshot({ path: testInfo.outputPath(`patient_${route.replaceAll('/', '_').replaceAll('?', '_')}_${testInfo.project.name}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});
