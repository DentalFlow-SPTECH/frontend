import assert from 'node:assert/strict';
import test from 'node:test';
import { createClinicSession } from '../../src/data/clinic_session.js';
import { storageKey } from '../../src/data/local/snapshot_storage.js';
import { createRepositories } from '../../src/data/repositories.js';
import { createSeed } from '../../src/demo/seed.js';
import { performedItems } from '../../src/demo/clinic.js';
import { findRecords, recordDetails } from '../../src/component/record_search.js';
import { daySegments, hourBlocks, overlapBlocks, outsideCounts } from '../../src/feature/agenda/model/calendar_model.js';
import { clinicRows, overviewMetrics, productionSummary } from '../../src/feature/dashboard/model/dashboard_model.js';
import { claimStatus, findReport, monthlyCsv, monthlyItems, monthlyTotals, reportAppointments, reportSlots } from '../../src/feature/report/model/report_model.js';

function memoryStorage(raw = null) {
    let value = raw;
    let writes = 0;
    return {
        getItem(key) { assert.equal(key, storageKey); return value; },
        setItem(key, next) { assert.equal(key, storageKey); value = next; writes++; },
        read: () => value,
        writes: () => writes,
    };
}
const immediate = async () => {};
function open(storage = memoryStorage()) {
    const session = createClinicSession({ storage, wait: immediate });
    return { storage, session, repositories: createRepositories(session), data: () => session.getSnapshot().data };
}
const appointment = (overrides = {}) => ({ patientId: 'p1', doctorId: 'd1', procedureId: 'pr2', procedure: '', date: '2026-10-02', time: '09:00', duration: 45, observation: '', attendance: '', insurance: '', budgetId: '', status: 'Agendada', clinicId: '', ...overrides });
const done = (items, extra = {}) => ({ items, attendance: '', insurance: '', observation: '', pendingGuide: false, ...extra });
async function withClinics() {
    const context = open();
    const centro = await context.repositories.admin.saveClinic({ name: 'Unidade Centro' });
    const norte = await context.repositories.admin.saveClinic({ name: 'Unidade Norte' });
    return { ...context, centro, norte };
}

test('snapshot anterior às clínicas abre com coleções vazias, sem gravar e sem atribuir unidade', () => {
    const legacy = createSeed();
    delete legacy.clinics; delete legacy.dailyReports;
    legacy.appointments = [{ id: 'a1', patientId: 'p1', doctorId: 'd1', procedure: 'Profilaxia', date: '2026-10-02', time: '09:00', duration: 45, status: 'Concluída', observation: '', attendance: 'convênio da empresa', budgetId: '', cancelReason: '', history: [] }];
    const raw = JSON.stringify(legacy);
    const { storage, data } = open(memoryStorage(raw));
    assert.deepEqual(data().clinics, []);
    assert.deepEqual(data().dailyReports, []);
    assert.equal(data().version, 1);
    assert.equal(data().appointments[0].clinicId, undefined);
    assert.equal(data().appointments[0].attendance, 'convênio da empresa');
    assert.equal(storage.read(), raw);
    assert.equal(storage.writes(), 0);
});

test('agendamento vincula o procedimento pelo ID e conserva registros que só tinham o nome', async () => {
    const legacy = createSeed();
    legacy.procedures.push({ id: 'pr9', name: 'Selante', referencePriceCents: 15000 });
    legacy.appointments = [{ id: 'a1', patientId: 'p1', doctorId: 'd1', procedure: 'Procedimento retirado do catálogo', date: '2026-10-02', time: '09:00', duration: 45, status: 'Agendada', observation: '', attendance: '', budgetId: '', cancelReason: '', history: [] }];
    const { repositories, data } = open(memoryStorage(JSON.stringify(legacy)));
    const created = await repositories.agenda.saveAppointment(appointment({ procedureId: 'pr9', time: '11:00' }));
    assert.deepEqual([created.procedureId, created.procedure], ['pr9', 'Selante']);
    await assert.rejects(repositories.agenda.saveAppointment(appointment({ procedureId: 'inexistente', time: '13:00' })), /procedimento/);
    const edited = await repositories.agenda.saveAppointment({ ...data().appointments[0], time: '09:30' }, 'a1');
    assert.equal(edited.procedure, 'Procedimento retirado do catálogo');
    assert.equal(edited.procedureId, '');
    assert.equal(edited.id, 'a1');
});

test('clínica é exigida nos novos agendamentos, consultas antigas seguem sem vínculo e o conflito vale entre clínicas', async () => {
    const { repositories, centro, norte } = await withClinics();
    await assert.rejects(repositories.agenda.saveAppointment(appointment()), /clínica/);
    await assert.rejects(repositories.agenda.saveAppointment(appointment({ clinicId: 'inexistente' })), /clínica/);
    const first = await repositories.agenda.saveAppointment(appointment({ clinicId: centro.id }));
    await assert.rejects(repositories.agenda.saveAppointment(appointment({ clinicId: norte.id, patientId: 'p2', time: '09:15' })), /intervalo/);
    const other = await repositories.agenda.saveAppointment(appointment({ clinicId: norte.id, doctorId: 'd2', patientId: 'p2', time: '09:15' }));
    assert.equal(other.clinicId, norte.id);
    await assert.rejects(repositories.agenda.saveAppointment({ ...first, clinicId: '' }, first.id), /clínica/);
    await assert.rejects(repositories.agenda.saveAppointment({ ...first, status: 'Concluída' }, first.id), /Finalizar consulta/);
});

test('finalização registra os procedimentos realizados uma única vez, com histórico, e não movimenta o caixa', async () => {
    const { storage, repositories, data } = open();
    const scheduled = await repositories.agenda.saveAppointment(appointment({ attendance: 'Particular' }));
    await assert.rejects(repositories.agenda.finalizeAppointment(scheduled.id, done([])), /ao menos um procedimento/);
    await assert.rejects(repositories.agenda.finalizeAppointment(scheduled.id, done([{ procedureId: 'pr2', quantity: 0 }])), /quantidade/);
    const input = done([{ procedureId: 'pr2', quantity: 1, tooth: '', region: '', origin: 'Agendado' }, { procedureId: 'pr3', quantity: 2, tooth: '36', region: 'Oclusal', origin: 'No atendimento' }], { attendance: 'Particular', observation: 'Retorno em 15 dias.' });
    const finalized = await repositories.agenda.finalizeAppointment(scheduled.id, input);
    assert.equal(finalized.status, 'Concluída');
    assert.deepEqual(finalized.completion.items.map(item => [item.procedure, item.quantity, item.tooth, item.referencePriceCents]), [['Profilaxia', 1, '', 18000], ['Restauração em resina', 2, '36', 22000]]);
    const audit = data().audit.length;
    const writes = storage.writes();
    const repeated = await repositories.agenda.finalizeAppointment(scheduled.id, input);
    assert.equal(repeated.completion.items.length, 2);
    assert.deepEqual(repeated.completion.items.map(item => item.id), finalized.completion.items.map(item => item.id));
    assert.equal(repeated.history.length, finalized.history.length);
    assert.equal(data().audit.length, audit);
    assert.equal(storage.writes(), writes);
    assert.equal(data().cashMovements.length, 0);
    await assert.rejects(repositories.agenda.cancelAppointment(scheduled.id, ''), /finalizada/);
    await assert.rejects(repositories.agenda.saveAppointment({ ...finalized, time: '10:00' }, scheduled.id), /finalizada/);
    const reloaded = open(memoryStorage(storage.read())).data();
    assert.equal(performedItems(reloaded.appointments).length, 2);
    assert.equal(reloaded.appointments[0].completion.observation, 'Retorno em 15 dias.');
});

test('relatório diário corresponde às execuções, fixa as consultas no envio e só reabre quando devolvido', async () => {
    const { repositories, data, centro, norte } = await withClinics();
    const first = await repositories.agenda.saveAppointment(appointment({ clinicId: centro.id }));
    const second = await repositories.agenda.saveAppointment(appointment({ clinicId: centro.id, patientId: 'p2', time: '10:00' }));
    const elsewhere = await repositories.agenda.saveAppointment(appointment({ clinicId: norte.id, patientId: 'p3', time: '14:00' }));
    const key = { date: '2026-10-02', doctorId: 'd1', clinicId: centro.id };
    await assert.rejects(repositories.report.saveDailyReport(key, '', true), /consultas finalizadas/);
    await repositories.agenda.finalizeAppointment(first.id, done([{ procedureId: 'pr2', quantity: 1 }, { procedureId: 'pr3', quantity: 1 }]));
    await repositories.agenda.finalizeAppointment(elsewhere.id, done([{ procedureId: 'pr4', quantity: 1 }]));
    const draft = await repositories.report.saveDailyReport(key, 'Autoclave em manutenção.');
    assert.equal(draft.status, 'Rascunho');
    const sent = await repositories.report.saveDailyReport(key, 'Autoclave em manutenção.', true);
    assert.equal(sent.status, 'Enviado');
    assert.deepEqual(sent.appointmentIds, [first.id]);
    assert.deepEqual(performedItems(reportAppointments(data().appointments, sent, key)).map(item => item.procedure), ['Profilaxia', 'Restauração em resina']);
    const again = await repositories.report.saveDailyReport(key, 'outro texto', true);
    assert.equal(again.history.length, sent.history.length);
    await assert.rejects(repositories.report.saveDailyReport(key, 'alterado'), /já foi enviado/);
    // Uma finalização posterior não entra no relatório já enviado, e a correção da consulta incluída fica bloqueada.
    await repositories.agenda.finalizeAppointment(second.id, done([{ procedureId: 'pr1', quantity: 1 }]));
    assert.equal(performedItems(reportAppointments(data().appointments, findReport(data().dailyReports, key), key)).length, 2);
    await assert.rejects(repositories.agenda.finalizeAppointment(first.id, done([{ procedureId: 'pr2', quantity: 3 }]), true), /relatório diário/);
    await assert.rejects(repositories.report.reviewDailyReport(sent.id, 'devolver', ' '), /motivo/);
    const returned = await repositories.report.reviewDailyReport(sent.id, 'devolver', 'Conferir a quantidade.');
    assert.equal(returned.status, 'Em correção');
    const corrected = await repositories.agenda.finalizeAppointment(first.id, done([{ id: data().appointments[0].completion.items[0].id, procedureId: 'pr2', quantity: 3 }]), true);
    assert.deepEqual(corrected.completion.items.map(item => item.quantity), [3]);
    const resent = await repositories.report.saveDailyReport(key, '', true);
    assert.deepEqual(resent.appointmentIds, [first.id, second.id]);
    const validated = await repositories.report.reviewDailyReport(resent.id, 'validar');
    assert.equal(validated.status, 'Validado');
    await assert.rejects(repositories.report.saveDailyReport(key, 'depois'), /validado/);
    await assert.rejects(repositories.report.reviewDailyReport(resent.id, 'devolver', 'tarde demais'), /enviados/);
    // O estado do relatório não altera a consulta nem gera lançamento.
    assert.equal(data().appointments.find(value => value.id === first.id).status, 'Concluída');
    assert.equal(data().cashMovements.length, 0);
    assert.deepEqual(reportSlots(data(), { from: '2026-10-02', until: '2026-10-02' }).map(slot => [slot.key.clinicId, slot.status, slot.items]), [[centro.id, 'Validado', 2], [norte.id, 'Não iniciado', 1]].sort((a, b) => a[0].localeCompare(b[0])));
});

test('filtro por clínica muda registros e totais; paciente conta uma vez e registros antigos ficam como pendência', async () => {
    const legacy = createSeed();
    legacy.appointments = [{ id: 'antiga', patientId: 'p1', doctorId: 'd2', procedure: 'Profilaxia', date: '2026-10-01', time: '08:00', duration: 30, status: 'Agendada', observation: '', attendance: '', budgetId: '', cancelReason: '', history: [] }];
    const { repositories, data } = open(memoryStorage(JSON.stringify(legacy)));
    const centro = await repositories.admin.saveClinic({ name: 'Unidade Centro' });
    const norte = await repositories.admin.saveClinic({ name: 'Unidade Norte' });
    const a = await repositories.agenda.saveAppointment(appointment({ clinicId: centro.id }));
    const b = await repositories.agenda.saveAppointment(appointment({ clinicId: norte.id, time: '11:00' }));
    await repositories.agenda.saveAppointment(appointment({ clinicId: norte.id, patientId: 'p2', time: '13:00' }));
    await repositories.agenda.finalizeAppointment(a.id, done([{ procedureId: 'pr2', quantity: 1 }], { attendance: 'Particular' }));
    await repositories.agenda.finalizeAppointment(b.id, done([{ procedureId: 'pr3', quantity: 2 }], { attendance: 'Convênio', insurance: 'Odonto Aurora' }));
    const period = { from: '2026-10-01', until: '2026-10-31' };
    const table = clinicRows(data(), period, '2026-10-08');
    assert.deepEqual(table.rows.map(row => [row.name, row.registered, row.finalized, row.patients]), [['Unidade Centro', 1, 1, 1], ['Unidade Norte', 2, 1, 1]]);
    assert.deepEqual([table.unlinked.registered, table.unlinked.unfinished], [1, 1]);
    assert.deepEqual([table.total.registered, table.total.finalized, table.total.patients, table.repeatedPatients], [4, 2, 1, 1]);
    assert.equal(overviewMetrics(data().appointments.filter(value => value.clinicId === norte.id), '2026-10-08').unfinished, 1);
    assert.deepEqual([productionSummary(data(), period, centro.id).items, productionSummary(data(), period, norte.id).plan, productionSummary(data(), period, '').items], [1, 1, 2]);
    assert.equal(monthlyItems(data(), { month: '2026-10', clinicId: centro.id }).length, 1);
    assert.equal(monthlyItems(data(), { month: '2026-10', clinicId: 'sem' }).length, 0);
    // Vinculação explícita: só alcança o registro escolhido que ainda não tem clínica.
    await assert.rejects(repositories.admin.linkClinic({ clinicId: centro.id, appointmentIds: [a.id] }), /sem clínica/);
    assert.equal(await repositories.admin.linkClinic({ clinicId: centro.id, appointmentIds: ['antiga', b.id] }), 1);
    assert.equal(data().appointments.find(value => value.id === 'antiga').clinicId, centro.id);
    assert.equal(data().appointments.find(value => value.id === b.id).clinicId, norte.id);
    assert.equal(clinicRows(data(), period, '2026-10-08').unlinked, null);
});

test('glosa parcial preserva valor apresentado e glosado; valor desconhecido não vira zero nem recebimento', async () => {
    const { repositories, data } = open();
    const first = await repositories.agenda.saveAppointment(appointment());
    const second = await repositories.agenda.saveAppointment(appointment({ patientId: 'p2', time: '10:00' }));
    const third = await repositories.agenda.saveAppointment(appointment({ patientId: 'p3', time: '11:00' }));
    const plan = { attendance: 'Convênio', insurance: 'Dental Prisma' };
    const [a] = (await repositories.agenda.finalizeAppointment(first.id, done([{ procedureId: 'pr4', quantity: 1 }], plan))).completion.items;
    const [b] = (await repositories.agenda.finalizeAppointment(second.id, done([{ procedureId: 'pr2', quantity: 1 }], plan))).completion.items;
    const [c] = (await repositories.agenda.finalizeAppointment(third.id, done([{ procedureId: 'pr1', quantity: 1 }], { attendance: 'Particular' }))).completion.items;
    await assert.rejects(repositories.report.saveClaim(third.id, c.id, { guide: 'X', presentedCents: 100, result: 'Aguardando' }), /convênio/);
    await assert.rejects(repositories.report.saveClaim(first.id, a.id, { guide: 'DP-1', presentedCents: null, result: 'Sem glosa', returnOn: '2026-11-04' }), /valor apresentado/);
    await assert.rejects(repositories.report.saveClaim(first.id, a.id, { guide: 'DP-1', presentedCents: 62000, result: 'Glosa parcial', returnOn: '2026-11-04', glosaCents: 62000 }), /menor que o valor apresentado/);
    await repositories.report.saveClaim(first.id, a.id, { guide: 'DP-1', presentedCents: 62000, result: 'Aguardando' });
    const partial = await repositories.report.saveClaim(first.id, a.id, { guide: 'DP-1', presentedCents: 62000, result: 'Glosa parcial', returnOn: '2026-11-04', glosaCents: 18600, reason: 'Radiografia final não anexada.' });
    assert.deepEqual([partial.claim.presentedCents, partial.claim.glosaCents, partial.claim.result, partial.history.length], [62000, 18600, 'Glosa parcial', 3]);
    assert.match(partial.history[1].description, /R\$\s62\.000,00|R\$\s620,00/);
    const unchanged = await repositories.report.saveClaim(first.id, a.id, { guide: 'DP-1', presentedCents: 62000, result: 'Glosa parcial', returnOn: '2026-11-04', glosaCents: 18600, reason: 'Radiografia final não anexada.' });
    assert.equal(unchanged.history.length, 3);
    await repositories.report.saveClaim(second.id, b.id, { guide: 'DP-2', presentedCents: null, result: 'Aguardando' });
    const items = monthlyItems(data(), { month: '2026-10' });
    assert.deepEqual(items.map(claimStatus), ['Glosa parcial', 'Aguardando', 'Particular']);
    const totals = monthlyTotals(items);
    assert.deepEqual([totals.items, totals.plan, totals.particular, totals.presentedCents, totals.presentedCount, totals.unknownCount, totals.waitingCount, totals.glosaCents, totals.glosaPartial, totals.keptCents], [3, 2, 1, 62000, 1, 1, 0, 18600, 1, 43400]);
    // Mês da execução e mês do retorno são competências diferentes.
    assert.equal(monthlyItems(data(), { month: '2026-11' }).length, 0);
    assert.deepEqual(monthlyItems(data(), { month: '2026-11', basis: 'retorno' }).map(item => item.id), [a.id]);
    assert.equal(monthlyItems(data(), { month: '2026-10', status: 'Aguardando' }).length, 1);
    const csv = monthlyCsv([{ date: '02/10/2026', procedure: 'Profilaxia', presented: '', glosa: '', status: 'Aguardando' }]);
    assert.match(csv.split('\r\n')[1], /"Profilaxia".*"";"";"";"";"";"Aguardando"$/);
    assert.equal(data().cashMovements.length, 0);
    assert.equal(data().appointments.find(value => value.id === first.id).status, 'Concluída');
});

test('agrupamento da agenda mantém todas as consultas acessíveis, por hora de início ou por sobreposição', () => {
    const at = (id, time, duration) => ({ id, date: '2026-10-08', time, duration });
    const many = [...Array.from({ length: 6 }, (_, index) => at(`a${index}`, '08:00', 45)), at('b', '08:30', 60), at('c', '09:00', 30), at('d', '18:00', 30)];
    const segments = daySegments(many, '2026-10-08');
    const hours = hourBlocks(segments);
    assert.deepEqual(hours.map(block => [block.start, block.end, block.items.length]), [[480, 540, 7], [540, 600, 1], [1080, 1140, 1]]);
    assert.equal(hours.reduce((total, block) => total + block.items.length, 0), many.length);
    const overlaps = overlapBlocks(daySegments([at('x', '10:00', 60), at('y', '10:30', 45), at('z', '11:15', 30)], '2026-10-08'));
    assert.deepEqual(overlaps.map(block => [block.start, block.end, block.items.map(segment => segment.appointment.id)]), [[600, 675, ['x', 'y']], [675, 705, ['z']]]);
    assert.deepEqual(outsideCounts([{ blocks: hours }], 420, 900), { before: 0, after: 1 });
    assert.deepEqual(outsideCounts([{ blocks: hours }], 600, 900), { before: 8, after: 1 });
});

test('busca de procedimentos funciona com catálogo grande, sem diferenciar acentos', () => {
    const catalog = Array.from({ length: 150 }, (_, index) => ({ id: `c${index}`, name: index % 10 === 0 ? `Restauração em resina — variação ${index}` : `Procedimento ${index}`, referencePriceCents: 1000 + index }));
    assert.equal(findRecords(catalog, 'restauracao', 'procedure').length, 15);
    assert.equal(findRecords(catalog, 'RESINA — variação 140', 'procedure')[0].id, 'c140');
    assert.equal(findRecords(catalog, '', 'procedure').length, 150);
    assert.equal(recordDetails(catalog[0], 'procedure'), 'Valor de referência: R$ 10,00');
    assert.equal(findRecords([{ id: 'p1', name: 'Marina', code: 'PAC-001', cpf: '', phone: '(11) 90000-0101', mobile: '' }], '900000101', 'patient').length, 1);
});
