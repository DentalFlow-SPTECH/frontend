import { chooseRecord } from './record_picker_helpers.js';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed.js';
import { today } from '../../src/demo/format.js';
const storageKey = 'dental_flow_demo_v1';
const completeDoctor = { name: 'Dra. Cecília Duarte', cpf: '000.000.000-00', cro: 'CRO-EXEMPLO-01', specialty: 'Odontopediatria', phone: '(11) 90000-0195', email: 'cecilia@example.com', status: 'Atendimento às quartas' };
const completeUser = { name: 'Clara Monteiro', email: 'clara@example.com', phone: '(11) 90000-0194', login: 'clara.exemplo', profile: 'Recepção' };
async function open(page, route = '/doutores') { await page.goto(`./#${route}`); await expect(page.locator('main h1')).toBeVisible(); await expect(page.getByText('Carregando registros…')).toHaveCount(0, { timeout: 15_000 }); }
async function snapshot(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey); }
async function fill(page, prefix, values) { for (const [key, value] of Object.entries(values)) {
    const control = page.locator(`#${prefix}_${key}`);
    if (key === 'profile')
        await control.selectOption(value);
    else
        await control.fill(value);
} }
async function scenario(page, value) { if (!(await page.getByRole('dialog', { name: 'Revisão da interface' }).isVisible()))
    await page.keyboard.press('Control+Alt+r'); await page.getByLabel('Cenário de revisão').selectOption(value); await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click(); if (!['read-error', 'slow'].includes(value))
    await expect(page.getByText('Carregando registros…')).toHaveCount(0); }
async function createDoctor(page, values = completeDoctor) { await open(page, '/doutores/novo'); await fill(page, 'doctor', values); await page.getByRole('button', { name: 'Salvar doutor', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Doutor cadastrado', exact: true })).toBeVisible(); return (await snapshot(page)).doctors.find(doctor => doctor.name === values.name); }
async function createUser(page, values = completeUser) { await open(page, '/administracao/novo'); await fill(page, 'user', values); await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Usuário cadastrado', exact: true })).toBeVisible(); return (await snapshot(page)).users.find(user => user.name === values.name); }
test('doutor cadastrado com nome apenas fica disponível para orçamento e persiste ao recarregar', async ({ page }) => {
    await open(page, '/doutores/novo');
    await page.locator('#doctor_name').fill('Dra. Cecília Duarte');
    await page.getByRole('button', { name: 'Salvar doutor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Doutor cadastrado', exact: true })).toBeVisible();
    const saved = await snapshot(page);
    const doctor = saved.doctors.find(value => value.name === 'Dra. Cecília Duarte');
    expect(doctor).toBeDefined();
    for (const key of ['cpf', 'cro', 'specialty', 'phone', 'email', 'status'])
        expect(doctor[key]).toBe('');
    await page.getByRole('link', { name: 'Ver doutor', exact: true }).click();
    await page.reload();
    await expect(page.locator('main h1')).toHaveText(doctor.name);
    await open(page, '/orcamentos/novo');
    await chooseRecord(page, page.getByLabel('Doutor', { exact: true }), doctor.id, doctor.name);
    await expect(page.getByLabel('Doutor', { exact: true })).toContainText(doctor.name);
    await expect(page.getByLabel('Doutor', { exact: true })).toHaveAttribute('value', doctor.id);
});
test('cadastro e edição de doutor preservam id, vínculos e histórico sem duplicar eventos', async ({ page }) => {
    const doctor = await createDoctor(page);
    await page.getByRole('link', { name: 'Ver doutor', exact: true }).click();
    await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
    for (const [key, value] of Object.entries(completeDoctor))
        await expect(page.locator(`#doctor_${key}`)).toHaveValue(value);
    const before = await snapshot(page);
    await fill(page, 'doctor', { name: 'Dra. Cecília Duarte Lima', cro: '', status: '' });
    await page.getByRole('button', { name: 'Salvar doutor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cadastro atualizado', exact: true })).toBeVisible();
    const after = await snapshot(page);
    expect(after.doctors).toHaveLength(before.doctors.length);
    expect(after.doctors.find(value => value.id === doctor.id)).toMatchObject({ name: 'Dra. Cecília Duarte Lima', cro: '', status: '' });
    expect(after.doctors.find(value => value.id === doctor.id)?.history).toHaveLength(2);
    expect(after.budgets).toEqual(before.budgets);
    await page.getByRole('link', { name: 'Ver doutor', exact: true }).click();
    await page.reload();
    await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
    await expect(page.locator('#doctor_cro')).toHaveValue('');
    await page.getByRole('button', { name: 'Salvar doutor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cadastro atualizado', exact: true })).toBeVisible();
    expect((await snapshot(page)).doctors.find(value => value.id === doctor.id)?.history).toEqual(after.doctors.find(value => value.id === doctor.id)?.history);
});
test('busca de doutor mantém o contexto e o detalhe abre orçamento vinculado', async ({ page }) => {
    const doctor = await createDoctor(page);
    await open(page, '/doutores?q=00000000000');
    await expect(page.getByRole('link', { name: doctor.name, exact: true })).toBeVisible();
    await page.getByLabel('Buscar doutor', { exact: true }).fill('Odontopediatria');
    await page.getByRole('link', { name: doctor.name, exact: true }).click();
    await page.getByRole('link', { name: 'Editar cadastro', exact: true }).click();
    await page.getByRole('link', { name: /Voltar ao doutor/ }).click();
    await page.getByRole('link', { name: /Voltar aos doutores/ }).click();
    await expect(page.getByLabel('Buscar doutor', { exact: true })).toHaveValue('Odontopediatria');
    await open(page, '/doutores/d1');
    await expect(page.getByRole('link', { name: 'Ver orçamento ORC-001', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Ver orçamento ORC-001', exact: true }).click();
    await expect(page.locator('main dd').filter({ hasText: 'Dra. Helena Martins' })).toBeVisible();
});
test('contexto do doutor exibe consultas reais e abre agenda com o profissional selecionado', async ({ page }) => {
    const seed = createSeed();
    seed.appointments = [{ id: 'appointment-doctor-context', patientId: 'p1', doctorId: 'd1', procedure: 'Profilaxia', date: today(), time: '09:00', duration: 30, observation: '', attendance: '', budgetId: 'b1', status: 'Agendada', cancelReason: '', history: [] }];
    await page.addInitScript(({ key, data }) => { if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data)); }, { key: storageKey, data: seed });
    await open(page, '/doutores/d1');
    const appointments = page.getByRole('region', { name: 'Consultas', exact: true });
    await expect(appointments.getByRole('link', { name: 'Marina Albuquerque', exact: true })).toBeVisible();
    await appointments.getByRole('link', { name: 'Marina Albuquerque', exact: true }).click();
    await expect(page).toHaveURL(/#\/agenda\/appointment-doctor-context$/);
    await expect(page.getByRole('link', { name: 'Dra. Helena Martins', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Dra. Helena Martins', exact: true }).click();
    await page.getByRole('link', { name: 'Ver agenda', exact: true }).click();
    await expect(page.getByLabel('Filtrar por doutor', { exact: true })).toHaveAttribute('value', 'd1');
});
test('nome obrigatório e falha de doutor conservam dados e levam o foco ao erro', async ({ page }) => {
    await open(page, '/doutores/novo');
    await fill(page, 'doctor', { cro: 'CRO-EXEMPLO-02', email: 'duarte@example.com' });
    await page.getByRole('button', { name: 'Salvar doutor', exact: true }).click();
    await expect(page.locator('#doctor_name')).toBeFocused();
    await expect(page.locator('#doctor_name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#doctor_cro')).toHaveValue('CRO-EXEMPLO-02');
    await page.locator('#doctor_name').fill(completeDoctor.name);
    await scenario(page, 'write-error');
    await page.getByRole('button', { name: 'Salvar doutor', exact: true }).click();
    await expect(page.locator(':focus')).toContainText('Não foi possível salvar');
    await expect(page.locator('#doctor_email')).toHaveValue('duarte@example.com');
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
    await scenario(page, 'normal');
    await page.getByRole('button', { name: 'Salvar doutor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Doutor cadastrado', exact: true })).toBeVisible();
    expect((await snapshot(page)).doctors.filter(value => value.name === completeDoctor.name)).toHaveLength(1);
});
test('usuário com nome apenas não recebe perfil ou permissões automáticas', async ({ page }) => {
    await open(page, '/administracao/novo');
    await page.locator('#user_name').fill('Lívia Duarte');
    await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Usuário cadastrado', exact: true })).toBeVisible();
    const saved = await snapshot(page);
    const user = saved.users.find(value => value.name === 'Lívia Duarte');
    expect(user).toMatchObject({ email: '', phone: '', login: '', profile: '', permissions: [], blocked: false });
    await page.getByRole('link', { name: 'Ver usuário', exact: true }).click();
    await page.reload();
    await expect(page.locator('main h1')).toHaveText('Lívia Duarte');
    await expect(page.getByText('Nenhuma permissão configurada.', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Editar usuário', exact: true }).click();
    await page.locator('#user_profile').selectOption('Administrador');
    for (const checkbox of await page.getByRole('checkbox').all())
        await expect(checkbox).not.toBeChecked();
    await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Usuário atualizado', exact: true })).toBeVisible();
    expect((await snapshot(page)).users.find(value => value.id === user.id)?.permissions).toEqual([]);
});
test('cadastro, edição e permissões por operação persistem sem herança por perfil', async ({ page }) => {
    await open(page, '/administracao/novo');
    await fill(page, 'user', completeUser);
    await expect(page.getByRole('checkbox')).toHaveCount(28);
    await page.getByRole('checkbox', { name: 'Agenda: Visualizar', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Pacientes: Criar', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Orçamentos: Alterar', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Estoque: Excluir', exact: true }).check();
    await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Usuário cadastrado', exact: true })).toBeVisible();
    const before = await snapshot(page);
    const user = before.users.find(value => value.name === completeUser.name);
    expect([...user.permissions].sort()).toEqual(['agenda:visualizar', 'estoque:excluir', 'orcamentos:alterar', 'pacientes:criar']);
    await page.getByRole('link', { name: 'Ver usuário', exact: true }).click();
    await page.getByRole('link', { name: 'Editar usuário', exact: true }).click();
    await page.locator('#user_profile').selectOption('Financeiro');
    await page.getByRole('checkbox', { name: 'Agenda: Visualizar', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'Caixa: Visualizar', exact: true }).check();
    await fill(page, 'user', { name: 'Clara Monteiro Lima', email: '' });
    await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Usuário atualizado', exact: true })).toBeVisible();
    const after = await snapshot(page);
    expect(after.users).toHaveLength(before.users.length);
    const updated = after.users.find(value => value.id === user.id);
    expect(updated).toMatchObject({ name: 'Clara Monteiro Lima', email: '', profile: 'Financeiro', blocked: false });
    expect([...updated.permissions].sort()).toEqual(['caixa:visualizar', 'estoque:excluir', 'orcamentos:alterar', 'pacientes:criar']);
    expect(updated.history).toHaveLength(2);
    expect(after.audit.length).toBe(before.audit.length + 1);
    expect(after.budgets).toEqual(before.budgets);
    await page.getByRole('link', { name: 'Ver usuário', exact: true }).click();
    await page.reload();
    await page.getByRole('link', { name: 'Editar usuário', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Caixa: Visualizar', exact: true })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Agenda: Visualizar', exact: true })).not.toBeChecked();
    await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Usuário atualizado', exact: true })).toBeVisible();
    expect((await snapshot(page)).audit).toEqual(after.audit);
});
test('bloqueio e reativação exigem confirmação, preservam usuário e geram auditoria', async ({ page }) => {
    const user = await createUser(page);
    await page.getByRole('link', { name: 'Ver usuário', exact: true }).click();
    const before = await snapshot(page);
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Bloquear usuário', exact: true }).click();
    expect(await snapshot(page)).toEqual(before);
    await scenario(page, 'write-error');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Bloquear usuário', exact: true }).click();
    await expect(page.locator(':focus')).toContainText('Não foi possível atualizar');
    expect(await snapshot(page)).toEqual(before);
    await scenario(page, 'normal');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Bloquear usuário', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /^Usuário bloqueado\.$/ })).toHaveText('Usuário bloqueado.');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Reativar usuário', exact: true })).toBeVisible();
    const blocked = await snapshot(page);
    expect(blocked.users.find(value => value.id === user.id)?.blocked).toBe(true);
    expect(blocked.users).toHaveLength(before.users.length);
    expect(blocked.audit.length).toBe(before.audit.length + 1);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reativar usuário', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /^Usuário reativado\.$/ })).toHaveText('Usuário reativado.');
    const active = await snapshot(page);
    expect(active.users.find(value => value.id === user.id)?.blocked).toBe(false);
    expect(active.users.find(value => value.id === user.id)?.permissions).toEqual(user.permissions);
    expect(active.users.find(value => value.id === user.id)?.history).toHaveLength(3);
    expect(active.audit.length).toBe(before.audit.length + 2);
    await page.getByRole('link', { name: /Voltar à administração/ }).click();
    const audit = page.getByRole('region', { name: 'Auditoria de ações' });
    for (const entry of active.audit) {
        await expect(audit.getByText(entry.action, { exact: true })).toBeVisible();
        await expect(audit.getByText(entry.record, { exact: true }).first()).toBeVisible();
    }
    await expect(audit.getByText('Data/hora', { exact: true })).toHaveCount(active.audit.length);
    await expect(audit.getByRole('link', { name: user.name, exact: true }).first()).toHaveAttribute('href', `#/administracao/${user.id}`);
    await audit.getByRole('link', { name: user.name, exact: true }).first().click();
    await expect(page.getByRole('heading', { name: user.name, exact: true })).toBeVisible();
});
test('nome obrigatório e falha de usuário conservam dados e permissões até repetir envio', async ({ page }) => {
    await open(page, '/administracao/novo');
    await fill(page, 'user', { login: 'livia.exemplo', profile: 'Doutor' });
    await page.getByRole('checkbox', { name: 'Doutores: Visualizar', exact: true }).check();
    await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
    await expect(page.locator('#user_name')).toBeFocused();
    await expect(page.locator('#user_name')).toHaveAttribute('aria-describedby', /user_name_error/);
    await page.locator('#user_name').fill('Lívia Duarte');
    await scenario(page, 'write-error');
    await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
    await expect(page.locator(':focus')).toContainText('Não foi possível salvar');
    await expect(page.locator('#user_login')).toHaveValue('livia.exemplo');
    await expect(page.getByRole('checkbox', { name: 'Doutores: Visualizar', exact: true })).toBeChecked();
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
    await scenario(page, 'normal');
    await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Usuário cadastrado', exact: true })).toBeVisible();
    expect((await snapshot(page)).users).toHaveLength(1);
});
test('busca e status administrativo conservam filtros ao consultar e editar usuário', async ({ page }) => {
    const user = await createUser(page);
    await open(page, '/administracao?q=Recep%C3%A7%C3%A3o&status=active');
    await page.getByRole('region', { name: 'Usuários', exact: true }).getByRole('link', { name: user.name, exact: true }).click();
    await page.getByRole('link', { name: 'Editar usuário', exact: true }).click();
    await page.getByRole('link', { name: /Voltar ao usuário/ }).click();
    await page.getByRole('link', { name: /Voltar à administração/ }).click();
    await expect(page.getByLabel('Buscar usuário', { exact: true })).toHaveValue('Recepção');
    await expect(page.getByLabel('Status do usuário', { exact: true })).toHaveValue('active');
    await page.getByLabel('Status do usuário', { exact: true }).selectOption('blocked');
    await expect(page.getByRole('heading', { name: 'Nenhum usuário encontrado', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Usuários', exact: true }).getByRole('link', { name: user.name, exact: true })).toBeVisible();
});
test('listas vazias, rotas ausentes e erros de leitura têm recuperação nas novas telas', async ({ page }) => {
    test.setTimeout(90_000);
    const empty = { ...createSeed(), doctors: [], budgets: [], users: [], audit: [] };
    await page.addInitScript(({ key, data }) => { if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data)); }, { key: storageKey, data: empty });
    await open(page, '/doutores');
    await expect(page.getByRole('heading', { name: 'Ainda não há doutores', exact: true })).toBeVisible();
    await open(page, '/administracao');
    await expect(page.getByRole('heading', { name: 'Ainda não há usuários', exact: true })).toBeVisible();
    for (const route of ['/doutores/ausente', '/doutores/ausente/editar', '/administracao/ausente', '/administracao/ausente/editar']) {
        await open(page, route);
        await expect(page.locator('main h1')).toHaveText(/não encontrado/);
    }
    for (const route of ['/doutores', '/doutores/novo', '/administracao', '/administracao/novo']) {
        await open(page, route);
        await scenario(page, 'read-error');
        await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
        await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
        await scenario(page, 'normal');
        await expect(page.getByText('Não foi possível carregar', { exact: true })).toHaveCount(0);
    }
});
for (const resource of ['doctor', 'user'])
    test(`${resource}: descarte e gravação pendente protegem campos e navegação`, async ({ page }) => {
        const route = resource === 'doctor' ? '/doutores/novo' : '/administracao/novo';
        const saveLabel = resource === 'doctor' ? 'Salvar doutor' : 'Salvar usuário';
        const returnLabel = resource === 'doctor' ? /Voltar aos doutores/ : /Voltar à administração/;
        const successLabel = resource === 'doctor' ? 'Doutor cadastrado' : 'Usuário cadastrado';
        await open(page, route);
        await page.locator(`#${resource}_name`).fill('Cecília Duarte');
        page.once('dialog', dialog => dialog.dismiss());
        await page.getByRole('link', { name: returnLabel }).click();
        await expect(page.locator(`#${resource}_name`)).toHaveValue('Cecília Duarte');
        await page.clock.install();
        await page.clock.pauseAt(new Date(Date.now() + 100));
        await scenario(page, 'slow');
        await page.clock.runFor(1600);
        await page.getByRole('button', { name: saveLabel, exact: true }).click();
        await expect(page.locator(`#${resource}_name`)).toBeDisabled();
        page.once('dialog', dialog => { expect(dialog.type()).toBe('alert'); return dialog.accept(); });
        await page.getByRole('link', { name: returnLabel }).click();
        await expect(page.locator(`#${resource}_name`)).toHaveValue('Cecília Duarte');
        await page.clock.runFor(2000);
        await expect(page.getByRole('heading', { name: successLabel, exact: true })).toBeVisible();
        const saved = await snapshot(page);
        expect((resource === 'doctor' ? saved.doctors : saved.users).filter(value => value.name === 'Cecília Duarte')).toHaveLength(1);
    });
test('dados antigos de doutores conservam ids e orçamento na primeira edição', async ({ page }) => {
    const seed = createSeed();
    const previous = { ...seed, doctors: seed.doctors.map(({ id, name, specialty }) => ({ id, name, specialty })) };
    const legacy = { version: previous.version, patients: previous.patients, doctors: previous.doctors, procedures: previous.procedures, budgets: previous.budgets, products: previous.products, movements: previous.movements };
    await page.addInitScript(({ key, data }) => { if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data)); }, { key: storageKey, data: legacy });
    await open(page, '/doutores/d1/editar');
    await expect(page.locator('#doctor_cpf')).toHaveValue('');
    await expect(page.locator('#doctor_name')).toHaveValue('Dra. Helena Martins');
    await page.locator('#doctor_phone').fill('(11) 90000-0193');
    await page.getByRole('button', { name: 'Salvar doutor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cadastro atualizado', exact: true })).toBeVisible();
    const saved = await snapshot(page);
    expect(saved.doctors).toHaveLength(legacy.doctors.length);
    expect(saved.budgets).toEqual(legacy.budgets);
    expect(saved.products).toEqual(legacy.products);
    expect(saved.movements).toEqual(legacy.movements);
    expect(saved.users).toEqual([]);
    expect(saved.appointments).toEqual([]);
});
test('doutores e administração têm acessibilidade, foco por teclado e largura sem overflow', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const doctor = await createDoctor(page);
    const user = await createUser(page);
    const routes = ['/doutores', '/doutores/novo', `/doutores/${doctor.id}`, `/doutores/${doctor.id}/editar`, '/doutores?q=Inexistente', '/doutores/ausente', '/administracao', '/administracao/novo', `/administracao/${user.id}`, `/administracao/${user.id}/editar`, '/administracao?q=Inexistente', '/administracao/ausente'];
    for (const route of routes) {
        await open(page, route);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), route).toBe(false);
        const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })), route).toEqual([]);
        if (route.endsWith('/novo')) {
            await page.locator(route.startsWith('/doutores') ? '#doctor_name' : '#user_name').focus();
            await page.keyboard.press('Tab');
            const outline = await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle);
            expect(outline).not.toBe('none');
        }
        if (route === '/doutores' || route === '/administracao/novo' || route === `/doutores/${doctor.id}`)
            await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '_')}_${testInfo.project.name}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
});
