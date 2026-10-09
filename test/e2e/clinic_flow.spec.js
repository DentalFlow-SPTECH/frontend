import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chooseRecord } from './record_picker_helpers.js';
import { createSeed } from '../../src/demo/seed.js';
import { saveClinicModel } from '../../src/feature/admin/model/admin_model.js';
import { finalizeAppointmentModel } from '../../src/feature/agenda/model/agenda_model.js';
import { saveClaimModel } from '../../src/feature/report/model/report_model.js';

const storageKey = 'dental_flow_demo_v1';
const day = '2026-10-08';
const appointment = (id, overrides = {}) => ({ id, patientId: 'p1', doctorId: 'd1', procedure: 'Profilaxia', date: day, time: '08:00', duration: 45, status: 'Agendada', observation: '', attendance: '', budgetId: '', cancelReason: '', history: [], ...overrides });
async function inject(page, data) {
    await page.addInitScript(({ key, saved }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(saved)); }, { key: storageKey, saved: data });
}
async function open(page, route) {
    await page.goto(`./#${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Carregando registros…')).toHaveCount(0, { timeout: 15_000 });
}
async function scenario(page, value) {
    await page.keyboard.press('Control+Alt+r');
    await page.getByLabel('Cenário de revisão').selectOption(value);
    await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
}
async function snapshot(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey); }
async function noOverflow(page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
async function accessible(page, label) { expect((await new AxeBuilder({ page }).analyze()).violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })), label).toEqual([]); }
// Duas clínicas e consultas finalizadas pelos Models, como a aplicação gravaria.
function withClinics(extra = []) {
    let data = createSeed();
    data = saveClinicModel(data, { name: 'Unidade Centro' }).data;
    data = saveClinicModel(data, { name: 'Unidade Norte' }).data;
    const [centro, norte] = data.clinics.map(clinic => clinic.id);
    data.appointments = extra.map(build => build({ centro, norte }));
    return { data, centro, norte };
}
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-10-08T15:00:00Z')); });

test('clínicas: cadastro, exigência no agendamento, filtro da agenda e vinculação explícita dos registros antigos', async ({ page }) => {
    const data = createSeed();
    data.appointments = [appointment('antiga', { patientId: 'p2', doctorId: 'd2', date: '2026-10-06', time: '09:00', duration: 30 })];
    data.cashMovements = [{ id: 'caixa-antigo', type: 'Entrada', amountCents: 15000, date: '2026-10-06', description: 'Recebimento anterior', category: '', paymentMethod: '', responsible: '', observation: '', history: [] }];
    await inject(page, data);
    await open(page, '/administracao?aba=clinicas');
    await expect(page.getByText(/^Nenhuma clínica cadastrada\./)).toBeVisible();
    await page.getByRole('link', { name: 'Cadastrar clínica', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar clínica', exact: true }).click();
    await expect(page.locator('#clinic_name')).toBeFocused();
    await expect(page.locator('#clinic_name')).toHaveAttribute('aria-invalid', 'true');
    await page.locator('#clinic_name').fill('Unidade Centro');
    await page.getByRole('button', { name: 'Salvar clínica', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Clínica cadastrada', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar à administração', exact: true }).click();
    await page.getByRole('link', { name: 'Cadastrar clínica', exact: true }).click();
    await page.locator('#clinic_name').fill('Unidade Norte');
    await page.getByRole('button', { name: 'Salvar clínica', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Clínica cadastrada', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar à administração', exact: true }).click();
    const clinics = page.getByRole('region', { name: 'Clínicas', exact: true });
    await expect(clinics.locator('li')).toHaveCount(2);
    await expect(clinics.getByText('1 consulta e 1 movimentação de caixa sem clínica.', { exact: true })).toBeVisible();
    // Com clínicas cadastradas, o novo agendamento exige a clínica; nenhuma é escolhida em silêncio quando há mais de uma.
    await open(page, `/agenda/nova?date=${day}`);
    await chooseRecord(page, page.locator('#appointment_patientId'), 'p1');
    await chooseRecord(page, page.locator('#appointment_doctorId'), 'd1');
    await chooseRecord(page, page.locator('#appointment_procedure'), 'pr2');
    await page.locator('#appointment_time').fill('09:00');
    await page.locator('#appointment_duration').fill('45');
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.locator('#appointment_clinicId')).toBeFocused();
    await expect(page.getByText('Selecione a clínica.', { exact: true })).toBeVisible();
    await page.locator('#appointment_clinicId').selectOption({ label: 'Unidade Norte' });
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Consulta agendada', exact: true })).toBeVisible();
    // O filtro por clínica muda os registros e as contagens; a consulta antiga continua acessível em "Sem clínica".
    await open(page, `/agenda?date=${day}`);
    const count = page.locator('main').getByRole('status').first();
    await expect(count).toHaveText('2 consultas');
    await page.locator('#agenda_clinic').selectOption({ label: 'Unidade Norte' });
    await expect(page).toHaveURL(/clinica=/);
    await expect(count).toHaveText('1 consulta');
    await expect(page.getByRole('region', { name: `Consultas de 08/10/2026` }).getByRole('link', { name: 'Marina Albuquerque', exact: true })).toBeVisible();
    await page.locator('#agenda_clinic').selectOption({ label: 'Unidade Centro' });
    await expect(count).toHaveText('0 consultas');
    await page.locator('#agenda_clinic').selectOption({ label: 'Sem clínica' });
    await expect(count).toHaveText('1 consulta');
    await page.reload();
    await expect(page.locator('#agenda_clinic').locator('option:checked')).toHaveText('Sem clínica');
    // Vinculação: exige clínica e seleção; só altera o registro escolhido.
    await open(page, '/administracao/vinculos');
    await page.getByRole('button', { name: 'Vincular 0 selecionados', exact: true }).click();
    await expect(page.locator('#link_clinic')).toBeFocused();
    await page.locator('#link_clinic').selectOption({ label: 'Unidade Centro' });
    await page.getByRole('button', { name: 'Vincular 0 selecionados', exact: true }).click();
    await expect(page.getByText('Selecione ao menos um registro para vincular.', { exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Rafael Nogueira', exact: true }).check();
    await accessible(page, 'vinculação');
    await noOverflow(page);
    await page.getByRole('button', { name: 'Vincular 1 selecionado', exact: true }).click();
    await expect(page.getByText('1 registro vinculado a Unidade Centro.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nenhum registro sem clínica', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Caixa (1)', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Recebimento anterior', exact: true })).not.toBeChecked();
    await page.reload();
    const saved = await snapshot(page);
    const [centro, norte] = saved.clinics.map(clinic => clinic.id);
    expect(saved.version).toBe(1);
    expect(saved.clinics.map(clinic => clinic.name)).toEqual(['Unidade Centro', 'Unidade Norte']);
    expect(saved.appointments.find(value => value.id === 'antiga')).toMatchObject({ clinicId: centro, patientId: 'p2', procedure: 'Profilaxia' });
    expect(saved.appointments.find(value => value.id === 'antiga').history.at(-1).description).toBe('Clínica vinculada: Unidade Centro.');
    expect(saved.appointments.find(value => value.id !== 'antiga').clinicId).toBe(norte);
    expect(saved.cashMovements[0].clinicId ?? '').toBe('');
    expect(saved.patients).toHaveLength(4);
});

test('finalização registra os procedimentos realizados, separa agendado, orçamento e realizado, não duplica e persiste', async ({ page }) => {
    const data = createSeed();
    Object.assign(data.patients[0], { insurance: 'Odonto Aurora', insuranceNumber: '0098 4412 77' });
    data.appointments = [appointment('consulta', { status: 'Em atendimento', budgetId: 'b1' })];
    await inject(page, data);
    await open(page, `/agenda/consulta?date=${day}`);
    await expect(page.getByRole('heading', { name: 'Procedimentos realizados', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Finalizar consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Finalizar consulta', exact: true })).toBeVisible();
    const planned = page.getByRole('complementary', { name: 'Previsto para este paciente' });
    await expect(planned.getByRole('heading', { name: 'Agendado nesta consulta', exact: true })).toBeVisible();
    await expect(planned.getByRole('heading', { name: 'Orçamento ORC-001 · 2 itens', exact: true })).toBeVisible();
    await expect(planned.getByText('Incluído', { exact: true })).toHaveCount(1);
    const items = page.locator('main form ul').first().locator('> li');
    await expect(items).toHaveCount(1);
    await planned.getByRole('button', { name: 'Incluir Restauração em resina como realizado', exact: true }).click();
    await expect(items).toHaveCount(2);
    await expect(items.nth(1).getByLabel('Quantidade', { exact: true })).toBeFocused();
    await expect(items.nth(1)).toContainText('Orçamento ORC-001');
    await page.locator('#finalization_items').click();
    await page.getByRole('dialog', { name: 'Buscar procedimento', exact: true }).locator('[data-record-id="pr4"]').click();
    await expect(items).toHaveCount(3);
    await expect(items.nth(2)).toContainText('No atendimento');
    await items.nth(1).getByLabel('Dente (opcional)', { exact: true }).selectOption('36');
    await items.nth(2).getByLabel('Região (opcional)', { exact: true }).fill('Arcada inferior');
    await page.getByRole('radio', { name: 'Convênio', exact: true }).check();
    await expect(page.locator('#finalization_insurance')).toHaveValue('Odonto Aurora');
    await page.getByRole('checkbox', { name: 'Guia do convênio pendente', exact: true }).check();
    await page.locator('#finalization_observation').fill('Paciente orientado a retornar em 15 dias.');
    // Erro de validação e falha de gravação conservam o preenchimento.
    await items.nth(2).getByLabel('Quantidade', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Finalizar consulta', exact: true }).click();
    await expect(items.nth(2).getByLabel('Quantidade', { exact: true })).toBeFocused();
    await expect(page.getByText('Informe uma quantidade inteira maior que zero.', { exact: true })).toBeVisible();
    await items.nth(2).getByLabel('Quantidade', { exact: true }).fill('2');
    await accessible(page, 'finalização');
    await noOverflow(page);
    await scenario(page, 'write-error');
    await page.getByRole('button', { name: 'Finalizar consulta', exact: true }).click();
    await expect(page.getByText('Não foi possível finalizar', { exact: true })).toBeVisible();
    await expect(items).toHaveCount(3);
    await expect(page.locator('#finalization_observation')).toHaveValue('Paciente orientado a retornar em 15 dias.');
    expect(await snapshot(page)).toEqual(data);
    await scenario(page, 'normal');
    // Dois envios no mesmo turno gravam a finalização uma única vez.
    await page.locator('main form').evaluate(form => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await expect(page.getByRole('heading', { name: 'Consulta finalizada', exact: true })).toBeVisible();
    await expect(page.getByText(/^3 procedimentos realizados registrados para Marina Albuquerque em 08\/10\/2026\. Nenhum lançamento foi feito no Caixa\.$/)).toBeVisible();
    const saved = await snapshot(page);
    const finalized = saved.appointments[0];
    expect(finalized.status).toBe('Concluída');
    expect(finalized.completion.items.map(item => [item.procedure, item.quantity, item.tooth, item.region, item.origin])).toEqual([['Profilaxia', 1, '', '', 'Agendado'], ['Restauração em resina', 1, '36', '', 'Orçamento ORC-001'], ['Raspagem periodontal', 2, '', 'Arcada inferior', 'No atendimento']]);
    expect(finalized.completion).toMatchObject({ attendance: 'Convênio', insurance: 'Odonto Aurora', pendingGuide: true, observation: 'Paciente orientado a retornar em 15 dias.' });
    expect(finalized.completion.items.map(item => item.referencePriceCents)).toEqual([18000, 22000, 35000]);
    expect(finalized.history).toHaveLength(1);
    expect(saved.audit.filter(entry => entry.recordPath === '/agenda/consulta')).toHaveLength(1);
    expect(saved.cashMovements).toHaveLength(0);
    expect(saved.budgets).toEqual(data.budgets);
    await page.getByRole('link', { name: 'Ver consulta', exact: true }).click();
    await page.reload();
    const performed = page.getByRole('region', { name: 'Procedimentos realizados', exact: true });
    await expect(performed.locator('ul > li')).toHaveCount(3);
    await expect(performed.getByText('Guia do convênio pendente', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar consulta', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Editar consulta', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Corrigir finalização', exact: true })).toBeVisible();
    await accessible(page, 'consulta finalizada');
    await open(page, '/agenda/consulta/editar');
    await expect(page.getByText('Esta consulta foi finalizada', { exact: true })).toBeVisible();
    await open(page, `/agenda?date=${day}`);
    const row = page.getByRole('region', { name: 'Consultas de 08/10/2026' }).locator('li');
    await expect(row).toContainText('Concluída');
    await expect(row.getByRole('link', { name: /^Finalizar/ })).toHaveCount(0);
    expect((await snapshot(page)).appointments[0].completion.items).toHaveLength(3);
});

test('relatório diário corresponde às execuções: o doutor envia, a dona devolve, a correção é reenviada e validada', async ({ page }) => {
    const { data, centro } = withClinics([
        ({ centro }) => appointment('a', { clinicId: centro, status: 'Em atendimento' }),
        ({ centro }) => appointment('b', { clinicId: centro, patientId: 'p2', time: '09:00', status: 'Confirmada' }),
        ({ centro }) => appointment('c', { clinicId: centro, patientId: 'p3', time: '10:00', status: 'Confirmada' }),
        ({ centro }) => appointment('d', { clinicId: centro, patientId: 'p4', time: '11:00', status: 'Faltou' }),
    ]);
    let seeded = finalizeAppointmentModel(data, 'a', { items: [{ procedureId: 'pr2', quantity: 1 }, { procedureId: 'pr3', quantity: 1, tooth: '36' }], attendance: 'Particular' }).data;
    seeded = finalizeAppointmentModel(seeded, 'b', { items: [{ procedureId: 'pr4', quantity: 1 }], attendance: 'Convênio', insurance: 'Odonto Aurora' }).data;
    await inject(page, seeded);
    await open(page, `/relatorios/diario?data=${day}`);
    await expect(page.getByRole('heading', { name: 'Escolha o doutor do relatório', exact: true })).toBeVisible();
    await chooseRecord(page, page.locator('#report_doctor'), 'd1');
    const rows = page.locator('[data-page-list="Procedimentos realizados no dia"] ul > li');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Marina Albuquerque');
    await expect(rows.nth(2)).toContainText('Convênio · Odonto Aurora');
    const summary = page.getByLabel('Resumo de 08/10/2026', { exact: true }).locator('li');
    await expect(summary).toHaveText(['4 consultas na agenda', '2 finalizadas', '1 falta', '1 sem finalização · finalizar na agenda', '3 procedimentos realizados']);
    const status = page.locator('main').getByText(/^(Não iniciado|Rascunho|Enviado|Em correção|Validado)$/).first();
    await expect(status).toHaveText('Não iniciado');
    await page.locator('#report_note').fill('Autoclave em manutenção das 13h às 14h.');
    await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await expect(page.getByText('Rascunho salvo.', { exact: true })).toBeVisible();
    await expect(status).toHaveText('Rascunho');
    await accessible(page, 'relatório diário');
    await noOverflow(page);
    await page.getByRole('button', { name: 'Enviar relatório', exact: true }).click();
    await expect(page.getByText('Relatório enviado para conferência.', { exact: true })).toBeVisible();
    await expect(status).toHaveText('Enviado');
    await expect(page.locator('#report_note')).toBeDisabled();
    await expect(page.getByRole('link', { name: /^Corrigir /})).toHaveCount(0);
    let saved = await snapshot(page);
    expect(saved.dailyReports).toHaveLength(1);
    expect(saved.dailyReports[0]).toMatchObject({ date: day, doctorId: 'd1', clinicId: centro, status: 'Enviado', appointmentIds: ['a', 'b'], note: 'Autoclave em manutenção das 13h às 14h.' });
    // Conferência pela dona: devolver exige motivo; o relatório volta para correção sem alterar a consulta.
    await page.getByRole('navigation', { name: 'Relatórios' }).getByRole('link', { name: 'Conferência diária', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Conferência diária', exact: true })).toBeVisible();
    const detail = page.getByRole('region', { name: 'Dra. Helena Martins · Unidade Centro', exact: true });
    await expect(detail.locator('[data-page-list="Procedimentos do relatório"] ul > li')).toHaveCount(3);
    await detail.getByRole('button', { name: 'Devolver para correção', exact: true }).click();
    await expect(page.locator('#review_reason')).toBeFocused();
    await expect(page.getByText('Informe o motivo da correção para devolver o relatório.', { exact: true })).toBeVisible();
    await page.locator('#review_reason').fill('Conferir a quantidade da profilaxia.');
    await accessible(page, 'conferência diária');
    await noOverflow(page);
    await detail.getByRole('button', { name: 'Devolver para correção', exact: true }).click();
    await expect(page.getByText('Relatório devolvido para correção.', { exact: true })).toBeVisible();
    await expect(detail.getByText('Em correção', { exact: true })).toBeVisible();
    await page.getByRole('navigation', { name: 'Relatórios' }).getByRole('link', { name: 'Relatório diário', exact: true }).click();
    await page.locator('#report_date').fill(day);
    await expect(page.getByText('Conferir a quantidade da profilaxia.', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Corrigir Profilaxia de Marina Albuquerque', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Corrigir finalização', exact: true })).toBeVisible();
    await page.getByLabel('Quantidade', { exact: true }).first().fill('3');
    await page.getByRole('button', { name: 'Corrigir finalização', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Finalização corrigida', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Abrir relatório do dia', exact: true }).click();
    await expect(rows.nth(0)).toContainText('Profilaxia');
    await expect(rows.nth(0).locator('dd').nth(1)).toHaveText('3');
    await page.getByRole('button', { name: 'Enviar relatório', exact: true }).click();
    await expect(status).toHaveText('Enviado');
    await page.getByRole('navigation', { name: 'Relatórios' }).getByRole('link', { name: 'Conferência diária', exact: true }).click();
    await detail.getByRole('button', { name: 'Validar relatório', exact: true }).click();
    await expect(page.getByText('Relatório validado.', { exact: true })).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Validar relatório', exact: true })).toHaveCount(0);
    await page.reload();
    saved = await snapshot(page);
    expect(saved.dailyReports).toHaveLength(1);
    expect(saved.dailyReports[0]).toMatchObject({ status: 'Validado', appointmentIds: ['a', 'b'], reason: '' });
    expect(saved.dailyReports[0].history.map(entry => entry.description.split(/[.:]/)[0])).toEqual(['Rascunho criado', 'Relatório enviado com 2 consultas e 3 procedimentos', 'Relatório devolvido para correção', 'Relatório enviado com 2 consultas e 3 procedimentos', 'Relatório validado']);
    expect(saved.appointments.find(value => value.id === 'a')).toMatchObject({ status: 'Concluída' });
    expect(saved.appointments.find(value => value.id === 'a').completion.items.map(item => item.quantity)).toEqual([3, 1]);
    expect(saved.appointments.find(value => value.id === 'c').status).toBe('Confirmada');
    expect(saved.cashMovements).toHaveLength(0);
    // Depois de validado, o relatório fica somente leitura e a correção da consulta incluída é bloqueada.
    await open(page, `/relatorios/diario?data=${day}&doutor=d1`);
    await expect(status).toHaveText('Validado');
    await expect(page.getByRole('button', { name: 'Enviar relatório', exact: true })).toHaveCount(0);
    await open(page, '/agenda/a/finalizar');
    await expect(page.getByText(/^O relatório diário desta consulta já foi enviado\./)).toBeVisible();
});

test('relatório mensal: filtros mudam registros e totais, glosa parcial preserva valores e pendente não vira zero', async ({ page }) => {
    const { data } = withClinics([
        ({ centro }) => appointment('x', { clinicId: centro, date: '2026-10-02', status: 'Confirmada' }),
        ({ norte }) => appointment('y', { clinicId: norte, doctorId: 'd2', patientId: 'p2', date: '2026-10-05', status: 'Confirmada' }),
        ({ centro }) => appointment('z', { clinicId: centro, patientId: 'p3', date: '2026-10-06', status: 'Confirmada' }),
        ({ norte }) => appointment('w', { clinicId: norte, doctorId: 'd2', patientId: 'p4', date: '2026-10-07', status: 'Confirmada' }),
    ]);
    let seeded = finalizeAppointmentModel(data, 'x', { items: [{ procedureId: 'pr4', quantity: 1 }], attendance: 'Convênio', insurance: 'Dental Prisma' }).data;
    seeded = finalizeAppointmentModel(seeded, 'y', { items: [{ procedureId: 'pr2', quantity: 1 }], attendance: 'Convênio', insurance: 'Odonto Aurora' }).data;
    seeded = finalizeAppointmentModel(seeded, 'z', { items: [{ procedureId: 'pr3', quantity: 2 }], attendance: 'Particular' }).data;
    seeded = finalizeAppointmentModel(seeded, 'w', { items: [{ procedureId: 'pr1', quantity: 1 }], attendance: 'Convênio', insurance: 'Odonto Aurora' }).data;
    const item = id => seeded.appointments.find(value => value.id === id).completion.items[0].id;
    seeded = saveClaimModel(seeded, 'y', item('y'), { guide: 'OA-1', presentedCents: 18000, result: 'Sem glosa', returnOn: '2026-10-20' }).data;
    seeded = saveClaimModel(seeded, 'w', item('w'), { guide: 'OA-2', presentedCents: null, result: 'Aguardando' }).data;
    await inject(page, seeded);
    await open(page, '/relatorios/mensal?mes=2026-10');
    const rows = page.locator('[data-page-list="Procedimentos realizados no mês"] ul > li');
    const totals = page.getByLabel('Totais de outubro de 2026 conforme os filtros', { exact: true }).locator('dd > span');
    await expect(rows).toHaveCount(4);
    await expect(totals).toHaveText(['4itens', 'R$ 180,00', '2itens', '—', '—']);
    await expect(rows.nth(3)).toContainText('Não informado');
    await expect(rows.nth(3)).toContainText('Aguardando');
    await expect(rows.nth(0)).toContainText('Guia não informada');
    await expect(rows.nth(0)).toContainText('A conferir');
    await expect(rows.nth(2)).toContainText('Particular');
    await accessible(page, 'relatório mensal');
    await noOverflow(page);
    // Filtros: os totais acompanham exatamente os registros filtrados.
    await page.locator('#monthly_clinic').selectOption({ label: 'Unidade Centro' });
    await expect(rows).toHaveCount(2);
    await expect(totals.nth(0)).toHaveText('2itens');
    await expect(totals.nth(1)).toHaveText('Não informado');
    await page.locator('#monthly_clinic').selectOption({ label: 'Unidade Norte' });
    await expect(rows).toHaveCount(2);
    await expect(totals).toHaveText(['2itens', 'R$ 180,00', '1item', '—', '—']);
    await page.locator('#monthly_clinic').selectOption('');
    await page.locator('#monthly_attendance').selectOption('Convênio');
    await expect(rows).toHaveCount(3);
    await page.locator('#monthly_insurance').selectOption('Odonto Aurora');
    await expect(rows).toHaveCount(2);
    await page.locator('#monthly_insurance').selectOption('');
    await page.locator('#monthly_status').selectOption('A conferir');
    await expect(rows).toHaveCount(1);
    await page.reload();
    await expect(rows).toHaveCount(1);
    await expect(page.locator('#monthly_attendance')).toHaveValue('Convênio');
    await page.locator('#monthly_status').selectOption('');
    // Conferência do item: glosa parcial com valor apresentado e glosado preservados.
    await page.getByRole('link', { name: 'Conferir Raspagem periodontal de Marina Albuquerque, 02/10/2026', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Raspagem periodontal', exact: true });
    await expect(panel).toBeVisible();
    await panel.locator('#claim_guide').fill('DP-88213');
    await panel.locator('#claim_presented').fill('620,00');
    await panel.getByRole('radio', { name: 'Glosa parcial', exact: true }).check();
    await panel.locator('#claim_returnOn').fill('2026-11-04');
    await panel.locator('#claim_glosa').fill('620,00');
    await panel.getByRole('button', { name: 'Salvar conferência', exact: true }).click();
    await expect(panel.locator('#claim_glosa')).toBeFocused();
    await expect(panel.getByText('O valor glosado deve ser maior que zero e menor que o valor apresentado.', { exact: true })).toBeVisible();
    await panel.locator('#claim_glosa').fill('186,00');
    await expect(panel.getByText('R$ 434,00', { exact: true })).toBeVisible();
    await expect(panel.getByText('novembro de 2026', { exact: true })).toBeVisible();
    await panel.locator('#claim_reason').fill('Radiografia final não anexada à guia.');
    await accessible(page, 'conferência do item');
    await panel.getByRole('button', { name: 'Salvar conferência', exact: true }).click();
    await expect(panel.getByText('Conferência salva. O valor apresentado e o histórico foram preservados.', { exact: true })).toBeVisible();
    await expect(panel.getByText(/glosa parcial de R\$\s186,00/)).toBeVisible();
    await panel.getByRole('button', { name: 'Fechar', exact: true }).first().click();
    await expect(panel).toHaveCount(0);
    await expect(page).not.toHaveURL(/item=/);
    await expect(rows.nth(0)).toContainText('R$ 620,00');
    await expect(rows.nth(0)).toContainText('R$ 186,00');
    await expect(rows.nth(0)).toContainText('Glosa parcial');
    await expect(totals).toHaveText(['3itens', 'R$ 800,00', '1item', '—', 'R$ 186,00']);
    await page.reload();
    const saved = await snapshot(page);
    const claimed = saved.appointments.find(value => value.id === 'x');
    expect(claimed.completion.items[0].claim).toEqual({ guide: 'DP-88213', presentedCents: 62000, returnOn: '2026-11-04', result: 'Glosa parcial', glosaCents: 18600, reason: 'Radiografia final não anexada à guia.' });
    expect(claimed.completion.items[0].history).toHaveLength(2);
    expect(claimed.status).toBe('Concluída');
    expect(saved.appointments.find(value => value.id === 'w').completion.items[0].claim.presentedCents).toBeNull();
    expect(saved.cashMovements).toHaveLength(0);
    // Mês da execução e mês do retorno são competências diferentes.
    await page.locator('#monthly_basis').selectOption('retorno');
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toContainText('Profilaxia');
    await page.locator('#monthly_month').fill('2026-11');
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toContainText('Raspagem periodontal');
    await page.locator('#monthly_basis').selectOption('execucao');
    await expect(page.getByRole('heading', { name: 'Nenhum procedimento realizado encontrado', exact: true })).toBeVisible();
    await page.locator('#monthly_month').fill('2026-10');
    // Exportação e impressão levam todos os registros filtrados; valor desconhecido sai vazio, não zero.
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV', exact: true }).click()]);
    expect(download.suggestedFilename()).toBe('relatorio-mensal-2026-10.csv');
    const lines = fs.readFileSync(await download.path(), 'utf8').replace(/^﻿/, '').split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('"Data da execução";"Horário";"Paciente";"Procedimento"');
    expect(lines[1]).toContain('"Raspagem periodontal"');
    expect(lines[1]).toContain('"DP-88213";"620,00";"04/11/2026";"Glosa parcial";"186,00"');
    expect(lines[3]).toContain('"OA-2";"";"";"Aguardando";""');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('main table caption')).toHaveText('Procedimentos realizados conforme os filtros: 3 itens');
    await expect(page.locator('main table tbody tr')).toHaveCount(3);
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 320, height: 720 });
    await noOverflow(page);
});
