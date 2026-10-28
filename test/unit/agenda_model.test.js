import test from 'node:test';
import assert from 'node:assert/strict';
import { canChange, conflictsWith, enrich, findNext, groupByPeriod, hourWindow, indexById, layoutLanes, minutesUntil, monthCells, nextStatus, toAppointmentPayload, validateAppointment, weekOf } from '../../src/feature/agenda/model/agenda_model.js';

const refs = {
    patients: indexById([{ id: 1, name: 'Maria Oliveira', phone: '11999990000' }]),
    dentists: indexById([{ id: 3, name: 'Dra. Ana Lima' }]),
    procedures: indexById([{ id: 5, name: 'Limpeza', durationMinutes: 60, price: 180 }, { id: 6, name: 'Avaliação', durationMinutes: null }]),
};
const item = (id, start, end, extra = {}) => ({ id, start, end, dentistId: 3, status: 'AGENDADO', date: '2026-10-28', ...extra });

test('a consulta da API ganha nomes, horário e duração do procedimento', () => {
    const enriched = enrich({ id: 9, patientId: 1, dentistId: 3, procedureId: 5, scheduledAt: '2026-10-28T09:30:00', status: 'CONFIRMADO' }, refs);
    assert.equal(enriched.patientName, 'Maria Oliveira');
    assert.equal(enriched.dentistShort, 'Dra. Ana');
    assert.equal(enriched.time, '09:30');
    assert.equal(enriched.endTime, '10:30');
    assert.equal(enriched.duration, 60);
    const fallback = enrich({ id: 10, patientId: 99, dentistId: 3, procedureId: 6, scheduledAt: '2026-10-28T14:00:00', status: 'AGENDADO' }, refs);
    assert.equal(fallback.duration, 30, 'sem duração cadastrada usa 30 minutos');
    assert.equal(fallback.patientName, 'Paciente nº 99');
});

test('consultas simultâneas ficam lado a lado e voltam à largura total depois', () => {
    const laid = layoutLanes([item('a', 540, 600), item('b', 570, 630), item('c', 600, 630), item('d', 660, 690)]);
    const byId = Object.fromEntries(laid.map(entry => [entry.id, entry]));
    assert.equal(byId.a.lanes, 2);
    assert.equal(byId.b.lanes, 2);
    assert.notEqual(byId.a.lane, byId.b.lane);
    assert.equal(byId.c.lane, byId.a.lane, 'reaproveita a faixa liberada');
    assert.equal(byId.d.lanes, 1);
});

test('janela de horas cobre 7h às 19h e amplia para consultas fora dela', () => {
    assert.deepEqual(hourWindow([]), { from: 420, to: 1140 });
    assert.deepEqual(hourWindow([item('x', 390, 420), item('y', 1170, 1200)]), { from: 360, to: 1200 });
});

test('fluxo de situação segue Agendado → Confirmado → Em atendimento → Concluído', () => {
    assert.equal(nextStatus('AGENDADO'), 'CONFIRMADO');
    assert.equal(nextStatus('EM_ATENDIMENTO'), 'CONCLUIDO');
    assert.equal(nextStatus('CONCLUIDO'), null);
    assert.equal(canChange('CANCELADO'), false);
    assert.equal(canChange('FALTOU'), false);
    assert.equal(canChange('CONFIRMADO'), true);
});

test('próximo paciente considera só consultas abertas de hoje a partir de agora', () => {
    const list = [item('done', 480, 510, { status: 'CONCLUIDO' }), item('late', 560, 590), item('next', 600, 630, { status: 'CONFIRMADO' }), item('other-day', 300, 330, { date: '2026-10-29' })];
    assert.equal(findNext(list, '2026-10-28', 565).id, 'late', 'tolerância de 10 minutos de atraso');
    assert.equal(findNext(list, '2026-10-28', 595).id, 'next');
    assert.equal(minutesUntil({ start: 600 }, 580), 'em 20 min');
    assert.equal(minutesUntil({ start: 700 }, 580), 'em 2 h');
});

test('conflito considera o mesmo dentista e ignora cancelados e faltas', () => {
    const list = [item(1, 540, 600), item(2, 540, 600, { dentistId: 4 }), item(3, 600, 630, { status: 'CANCELADO' })];
    assert.deepEqual(conflictsWith(list, { id: -1, dentistId: 3, start: 570, end: 630 }).map(entry => entry.id), [1]);
    assert.deepEqual(conflictsWith(list, { id: 1, dentistId: 3, start: 540, end: 600 }), [], 'a própria consulta não conflita');
});

test('formulário valida campos e monta o corpo da API com a clínica autenticada', () => {
    assert.deepEqual(Object.keys(validateAppointment({ patientId: '', dentistId: '', procedureId: '', date: '', time: '9h', notes: '' })).sort(), ['date', 'dentistId', 'patientId', 'procedureId', 'time']);
    const payload = toAppointmentPayload({ patientId: '1', dentistId: '3', procedureId: '5', date: '2026-10-28', time: '09:30', notes: '  ' }, { clinicId: 1, userId: 7 });
    assert.deepEqual(payload, { clinicId: 1, patientId: 1, dentistId: 3, procedureId: 5, userId: 7, scheduledAt: '2026-10-28T09:30:00', status: 'AGENDADO', notes: null });
});

test('semana, mês e períodos do dia', () => {
    assert.deepEqual(weekOf('2026-10-28'), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    const october = monthCells('2026-10-15');
    assert.equal(october[0].date, '2026-09-28');
    assert.equal(october.length % 7, 0);
    assert.equal(october.filter(cell => cell.currentMonth).length, 31);
    assert.deepEqual(groupByPeriod([item('t', 840, 870), item('m', 540, 570)]).map(group => group.title), ['Manhã', 'Tarde']);
});

test('clique na grade vira horário arredondado e só agenda do agora em diante', async () => {
    const { slotFromOffset, canScheduleAt } = await import('../../src/feature/agenda/model/agenda_model.js');
    assert.equal(slotFromOffset(0, 80, 420), 420);
    assert.equal(slotFromOffset(650, 80, 420), 900, '650 px abaixo de 07:00 com 80 px/h → 15:00');
    assert.equal(slotFromOffset(100, 80, 420, 30), 480, '75 min abaixo de 07:00, em passos de 30 → 08:00');
    assert.equal(canScheduleAt({ past: true }, 900, 0), false);
    assert.equal(canScheduleAt({ isToday: true }, 570, 580), false);
    assert.equal(canScheduleAt({ isToday: true }, 600, 580), true);
    assert.equal(canScheduleAt({}, 300, 900), true, 'dia futuro aceita qualquer horário');
});
