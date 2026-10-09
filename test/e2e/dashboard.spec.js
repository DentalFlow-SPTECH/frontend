import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed.js';
import { saveClinicModel } from '../../src/feature/admin/model/admin_model.js';
import { finalizeAppointmentModel } from '../../src/feature/agenda/model/agenda_model.js';
import { saveClaimModel, saveDailyReportModel } from '../../src/feature/report/model/report_model.js';
const storageKey = 'dental_flow_demo_v1';
const referenceDate = '2026-10-03';
// Cenário montado pelos Models: duas clínicas, uma consulta antiga sem clínica, duas finalizações e um relatório enviado.
function populated() {
    let data = createSeed();
    data = saveClinicModel(data, { name: 'Unidade Centro' }).data;
    data = saveClinicModel(data, { name: 'Unidade Norte' }).data;
    const [centro, norte] = data.clinics.map(clinic => clinic.id);
    const appointment = (id, date, time, patientId, status, clinicId, doctorId = 'd1') => ({ id, date, time, patientId, status, clinicId, doctorId, procedureId: 'pr2', procedure: 'Profilaxia', duration: 30, observation: '', attendance: '', insurance: '', budgetId: '', cancelReason: status === 'Cancelada' ? 'Paciente solicitou cancelamento.' : '', history: [] });
    data.appointments = [appointment('appt-a', '2026-10-01', '09:00', 'p1', 'Agendada', centro), appointment('appt-b', '2026-10-01', '10:00', 'p2', 'Confirmada', centro), appointment('appt-c', '2026-10-02', '09:00', 'p1', 'Em atendimento', norte, 'd2'), appointment('appt-d', '2026-10-02', '11:00', 'p3', 'Cancelada', norte), appointment('appt-e', referenceDate, '09:00', 'p4', 'Agendada', ''), appointment('appt-f', '2026-09-30', '09:00', 'p3', 'Confirmada', centro)];
    data = finalizeAppointmentModel(data, 'appt-b', { items: [{ procedureId: 'pr2', quantity: 1 }], attendance: 'Particular' }).data;
    data = finalizeAppointmentModel(data, 'appt-c', { items: [{ procedureId: 'pr3', quantity: 2 }, { procedureId: 'pr1', quantity: 1 }], attendance: 'Convênio', insurance: 'Odonto Aurora' }).data;
    data = saveDailyReportModel(data, { date: '2026-10-01', doctorId: 'd1', clinicId: centro }, '', true).data;
    const [first] = data.appointments.find(value => value.id === 'appt-c').completion.items;
    data = saveClaimModel(data, 'appt-c', first.id, { guide: 'OA-1', presentedCents: 44000, result: 'Aguardando' }).data;
    const cash = (id, date, type, amountCents, clinicId) => ({ id, date, type, amountCents, clinicId, description: 'Movimentação informada para teste', category: '', paymentMethod: '', responsible: '', observation: '', history: [] });
    data.cashMovements = [cash('cash-a', referenceDate, 'Entrada', 100000, centro), cash('cash-b', referenceDate, 'Saída', 25000, ''), cash('cash-c', '2026-09-30', 'Entrada', 30000, norte), cash('cash-d', '2026-04-01', 'Entrada', 500000, '')];
    return data;
}
async function inject(page, data) {
    await page.addInitScript(({ key, saved }) => { if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(saved)); }, { key: storageKey, saved: data });
}
async function open(page, route = `/painel?date=${referenceDate}`) {
    await page.goto(`./#${route}`);
    await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
}
async function scenario(page, value) {
    await page.keyboard.press('Control+Alt+r');
    await page.getByLabel('Cenário de revisão').selectOption(value);
    await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
}
const indicators = (page, label) => page.getByLabel(label, { exact: true }).locator('dd > span');
const tab = (page, name) => page.getByRole('navigation', { name: 'Seções do painel' }).getByRole('link', { name, exact: true });
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-10-03T15:00:00Z')); });
test('painel é a página inicial, abre na visão geral e a leitura não grava nem gera recebimentos', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveURL(/#\/painel$/);
    await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
    await expect(tab(page, 'Visão geral')).toHaveAttribute('aria-current', 'page');
    await expect(indicators(page, 'Indicadores de Outubro de 2026')).toHaveText(['0', '0', '0', '0']);
    await expect(page.getByRole('heading', { name: 'Pendências', exact: true })).toBeVisible();
    await expect(page.getByText('Nenhuma clínica cadastrada.', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Clínica', { exact: true })).toHaveCount(0);
    // As listas de consultas do dia e de estoque deixaram o Painel: ficam nos módulos correspondentes.
    await expect(page.getByRole('heading', { name: /Consultas de \d/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Atenção ao estoque' })).toHaveCount(0);
    await expect(page.locator('[data-page-list]')).toHaveCount(0);
    await tab(page, 'Financeiro').click();
    await expect(indicators(page, 'Caixa de Outubro de 2026')).toHaveText(['R$ 0,00', 'R$ 0,00', 'R$ 0,00']);
    await expect(page.getByText('Nenhuma entrada ou saída registrada nos últimos seis meses deste período.')).toBeVisible();
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
    await page.reload();
    await expect(tab(page, 'Financeiro')).toHaveAttribute('aria-current', 'page');
    await open(page, `/dashboard?date=${referenceDate}&aba=producao`);
    await expect(page).toHaveURL(new RegExp(`#/painel\\?date=${referenceDate}&aba=producao$`));
    await expect(tab(page, 'Produção e relatórios')).toHaveAttribute('aria-current', 'page');
});
test('período usa o dia de São Paulo, navega por mês e conserva clínica e aba', async ({ page }) => {
    await inject(page, populated());
    await page.clock.setFixedTime(new Date('2026-10-01T02:30:00Z'));
    await open(page, '/painel');
    await expect(page.locator('#dashboard_period')).toHaveText('Setembro de 2026');
    await expect(page.getByText('01/09/2026 a 30/09/2026')).toBeVisible();
    await expect(indicators(page, 'Indicadores de Setembro de 2026')).toHaveText(['1', '0', '0', '0']);
    await page.clock.setFixedTime(new Date('2026-10-03T15:00:00Z'));
    await page.getByRole('button', { name: 'Mês atual', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`date=${referenceDate}$`));
    await expect(page.locator('#dashboard_period')).toHaveText('Outubro de 2026');
    await page.getByLabel('Clínica', { exact: true }).selectOption({ label: 'Unidade Norte' });
    await tab(page, 'Financeiro').click();
    await page.getByRole('button', { name: 'Mês anterior', exact: true }).click();
    await expect(page).toHaveURL(/date=2026-09-01&clinica=[^&]+&aba=financeiro$/);
    await expect(indicators(page, 'Caixa de Setembro de 2026')).toHaveText(['R$ 300,00', 'R$ 0,00', 'R$ 300,00']);
    await page.reload();
    await expect(page.getByLabel('Clínica', { exact: true }).locator('option:checked')).toHaveText('Unidade Norte');
    await expect(tab(page, 'Financeiro')).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: 'Próximo mês', exact: true }).click();
    await expect(page.locator('#dashboard_period')).toHaveText('Outubro de 2026');
});
test('visão geral separa registradas, finalizadas e pacientes; a clínica filtra registros e totais sem alterar o snapshot', async ({ page }) => {
    const data = populated();
    await inject(page, data);
    await open(page);
    await expect(indicators(page, 'Indicadores de Outubro de 2026')).toHaveText(['5', '2', '2', '1']);
    await expect(page.getByText('Agenda · inclui 1 cancelada e 0 faltas. Não é ocupação.', { exact: true })).toBeVisible();
    const table = page.getByRole('table', { name: 'Indicadores de atendimento por clínica em Outubro de 2026' });
    await expect(table.locator('tbody tr').nth(0).locator('th, td')).toHaveText(['Unidade Centro', '2', '1', '1', '1', '1']);
    await expect(table.locator('tbody tr').nth(1).locator('th, td')).toHaveText(['Unidade Norte', '2', '1', '0', '1', '0']);
    await expect(table.locator('tbody tr').nth(2).locator('th, td')).toHaveText(['Sem clínica · vincular', '1', '0', '0', '0', '0']);
    await expect(table.locator('tbody tr').nth(3).locator('th, td')).toHaveText(['Todas as clínicas', '5', '2', '1', '2', '1']);
    await expect(page.getByText('Pacientes: 2 pessoas distintas; cada uma conta uma vez.', { exact: true })).toBeVisible();
    await expect(page.getByText('3 registros antigos sem clínica', { exact: true })).toBeVisible();
    const pending = page.getByRole('region', { name: 'Pendências', exact: true }).locator('li');
    await expect(pending.locator('strong')).toHaveText(['1', '1', '0', '1', '3', '3']);
    await page.getByLabel('Clínica', { exact: true }).selectOption({ label: 'Unidade Centro' });
    await expect(indicators(page, 'Indicadores de Outubro de 2026')).toHaveText(['2', '1', '1', '1']);
    await expect(pending.locator('strong')).toHaveText(['1', '1', '0', '0', '3', '3']);
    await page.getByLabel('Clínica', { exact: true }).selectOption({ label: 'Unidade Norte' });
    await expect(indicators(page, 'Indicadores de Outubro de 2026')).toHaveText(['2', '1', '1', '0']);
    await expect(pending.locator('strong')).toHaveText(['0', '0', '0', '1', '3', '3']);
    await page.getByLabel('Clínica', { exact: true }).selectOption({ label: 'Sem clínica' });
    await expect(indicators(page, 'Indicadores de Outubro de 2026')).toHaveText(['1', '0', '0', '0']);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey)).toEqual(data);
});
test('produção conta procedimentos realizados, não os agendados, e acompanha os relatórios diários', async ({ page }) => {
    await inject(page, populated());
    await open(page, `/painel?date=${referenceDate}&aba=producao`);
    const values = page.getByLabel('Produção de Outubro de 2026', { exact: true }).locator('dd > span');
    await expect(values.nth(0)).toHaveText('3');
    await expect(values.nth(1)).toHaveText('1particular 2convênio');
    await expect(values.nth(2)).toHaveText('0de 2');
    await expect(values.nth(3)).toHaveText('2');
    await expect(page.getByText('Itens da finalização de 2 consultas. Agendado ou orçado não entra.', { exact: true })).toBeVisible();
    await expect(page.getByText('1 a conferir · 0 em correção · 1 não enviados.', { exact: true })).toBeVisible();
    const doctors = page.getByRole('table', { name: 'Procedimentos realizados por doutor em Outubro de 2026' }).locator('tbody tr');
    await expect(doctors.nth(0).locator('th, td')).toHaveText(['Dr. Lucas Azevedo', '1', '2', '0', '2', '1']);
    await expect(doctors.nth(1).locator('th, td')).toHaveText(['Dra. Helena Martins', '1', '1', '1', '0', '1']);
    await expect(page.getByRole('region', { name: 'Procedimentos mais realizados' }).locator('li')).toHaveCount(3);
    await page.getByLabel('Clínica', { exact: true }).selectOption({ label: 'Unidade Centro' });
    await expect(values.nth(0)).toHaveText('1');
    await expect(doctors).toHaveCount(1);
    await page.getByRole('link', { name: 'Abrir relatório mensal', exact: true }).click();
    await expect(page).toHaveURL(/#\/relatorios\/mensal\?mes=2026-10&clinica=/);
    await expect(page.getByRole('heading', { name: 'Relatório mensal e glosas', exact: true })).toBeVisible();
});
test('financeiro conserva centavos, exclui datas fora do período e não trata valor pendente como zero ou recebimento', async ({ page }) => {
    await inject(page, populated());
    await open(page, `/painel?date=${referenceDate}&aba=financeiro`);
    await expect(indicators(page, 'Caixa de Outubro de 2026')).toHaveText(['R$ 1.000,00', 'R$ 250,00', 'R$ 750,00']);
    await expect(page.getByText('Entradas menos saídas registradas. Não é saldo bancário nem lucro.', { exact: true })).toBeVisible();
    const claims = page.getByRole('region', { name: 'Convênios em conferência' }).locator('li');
    await expect(claims.nth(0)).toContainText('1 de 2 itens de convênio. 1 item sem valor informado.');
    await expect(claims.nth(0).locator('b')).toHaveText('R$ 440,00');
    await expect(claims.nth(1).locator('b')).toHaveText('R$ 440,00');
    await expect(claims.nth(2).locator('b')).toHaveText('—');
    await expect(claims.nth(3)).toContainText('Valor aprovado não é recebimento.');
    await expect(claims.nth(3).locator('b')).toHaveText('—');
    await page.getByText('Ver valores por mês', { exact: true }).click();
    const rows = page.getByRole('table', { name: /Entradas e saídas registradas em cada mês/ }).locator('tbody tr');
    await expect(rows).toHaveCount(6);
    await expect(rows.nth(4).locator('td')).toHaveText(['R$ 300,00', 'R$ 0,00']);
    await expect(rows.nth(5).locator('td')).toHaveText(['R$ 1.000,00', 'R$ 250,00']);
    await page.getByLabel('Clínica', { exact: true }).selectOption({ label: 'Unidade Centro' });
    await expect(indicators(page, 'Caixa de Outubro de 2026')).toHaveText(['R$ 1.000,00', 'R$ 0,00', 'R$ 1.000,00']);
    await page.getByLabel('Clínica', { exact: true }).selectOption({ label: 'Sem clínica' });
    await expect(indicators(page, 'Caixa de Outubro de 2026')).toHaveText(['R$ 0,00', 'R$ 250,00', '-R$ 250,00']);
    await page.getByRole('link', { name: 'Ver caixa do mês', exact: true }).click();
    await expect(page).toHaveURL(/#\/caixa\?de=2026-10-01&ate=2026-10-31&clinica=sem$/);
    await expect(page.getByRole('link', { name: 'Ver movimentação: Movimentação informada para teste', exact: true }).filter({ visible: true })).toHaveCount(1);
});
test('atalhos das pendências abrem cada módulo com clínica e período', async ({ page }) => {
    await inject(page, populated());
    await open(page);
    await page.getByLabel('Clínica', { exact: true }).selectOption({ label: 'Unidade Centro' });
    const targets = [['Consultas sem finalização: abrir Agenda', /#\/agenda\?date=2026-10-03&clinica=/, 'Agenda'], ['Relatórios diários a conferir: abrir Relatórios', /#\/relatorios\/conferencia\?situacao=Enviado&clinica=/, 'Conferência diária'], ['Convênio aguardando retorno: abrir Mensal', /#\/relatorios\/mensal\?mes=2026-10&clinica=[^&]+&situacao=Aguardando$/, 'Relatório mensal e glosas'], ['Registros antigos sem clínica: abrir Vincular', /#\/administracao\/vinculos$/, 'Vincular registros sem clínica'], ['Materiais abaixo do mínimo: abrir Estoque', /#\/estoque\?abaixo=1$/, 'Estoque']];
    for (const [name, url, heading] of targets) {
        await page.getByRole('link', { name, exact: true }).click();
        await expect(page).toHaveURL(url);
        await expect(page.getByRole('heading', { name: heading, exact: true, level: 1 })).toBeVisible();
        await page.goBack();
        await expect(page.getByLabel('Clínica', { exact: true }).locator('option:checked')).toHaveText('Unidade Centro');
    }
    await page.getByRole('link', { name: 'Agendar consulta', exact: true }).click();
    await expect(page.locator('#appointment_date')).toHaveValue(referenceDate);
    await expect(page.locator('#appointment_clinicId').locator('option:checked')).toHaveText('Unidade Centro');
});
test('carregamento e erro conservam período, clínica e aba e permitem recuperar', async ({ page }) => {
    await inject(page, populated());
    await open(page, `/painel?date=${referenceDate}&aba=producao`);
    await scenario(page, 'slow');
    await expect(page.getByText('Carregando registros…')).toBeVisible();
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
    await scenario(page, 'read-error');
    await expect(page.getByText('Não foi possível carregar o painel', { exact: true })).toBeVisible();
    await expect(page.locator('#dashboard_period')).toHaveText('Outubro de 2026');
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByText('Não foi possível carregar o painel', { exact: true })).toBeVisible();
    await scenario(page, 'normal');
    await expect(page.getByLabel('Produção de Outubro de 2026', { exact: true })).toBeVisible();
    await expect(tab(page, 'Produção e relatórios')).toHaveAttribute('aria-current', 'page');
});
test('painel tem teclado, gráfico com alternativa, largura contida e visão geral na primeira tela', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await inject(page, populated());
    for (const section of ['', '&aba=producao', '&aba=financeiro']) {
        await open(page, `/painel?date=${referenceDate}${section}`);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`painel${section.replace('&aba=', '_')}_${testInfo.project.name}.png`), fullPage: true });
    }
    await expect(page.getByRole('img', { name: /Comparação das entradas e saídas registradas nos últimos seis meses/ })).toBeVisible();
    await tab(page, 'Visão geral').focus();
    await page.keyboard.press('Enter');
    await expect(tab(page, 'Visão geral')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) >= 768) {
        // A visão geral cabe na primeira tela das duas resoluções de referência, sem rolagem da página.
        for (const size of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
            await page.setViewportSize(size);
            await expect(page.getByRole('region', { name: 'Pendências', exact: true })).toBeInViewport({ ratio: 1 });
            expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), `${size.width}×${size.height}`).toBe(true);
        }
    }
    await page.setViewportSize({ width: 320, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('region', { name: 'Pendências', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
});
