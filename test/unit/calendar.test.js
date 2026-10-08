import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarHours, daySegments, monthCells } from '../../src/feature/agenda/model/calendar_model.js';

const appointment = (id, date, time, duration) => ({ id, date, time, duration });
test('escala de 24 horas independe dos registros e mês fecha semanas com datas adjacentes', () => {
    assert.equal(calendarHours.length, 24);
    assert.equal(calendarHours[0], '00:00');
    assert.equal(calendarHours[23], '23:00');
    const october = monthCells('2026-10-07');
    assert.equal(october.length, 35);
    assert.equal(october[0].date, '2026-09-28');
    assert.equal(october.at(-1).date, '2026-11-01');
    assert.equal(october.filter(day => day.currentMonth).length, 31);
    assert.equal(monthCells('2028-02-29').filter(day => day.currentMonth).length, 29);
});
test('horários intermediários e durações são projetados sem mudar o registro', () => {
    const source = appointment('a', '2026-10-07', '09:30', 90);
    const before = structuredClone(source);
    const [segment] = daySegments([source], '2026-10-07');
    assert.equal(segment.start, 570);
    assert.equal(segment.end, 660);
    assert.equal(segment.lanes, 1);
    assert.deepEqual(source, before);
});
test('sobreposições visuais repartem colunas e intervalos encostados voltam à largura completa', () => {
    const segments = daySegments([
        appointment('a', '2026-10-07', '09:00', 60),
        appointment('b', '2026-10-07', '09:30', 60),
        appointment('c', '2026-10-07', '10:00', 30),
        appointment('d', '2026-10-07', '10:30', 30),
    ], '2026-10-07');
    assert.deepEqual(segments.map(segment => [segment.lane, segment.lanes]), [[0, 2], [1, 2], [0, 2], [0, 1]]);
});
test('meia-noite conserva identidade nos dois dias, inclusive no início da semana', () => {
    const source = appointment('a', '2026-10-04', '23:30', 90);
    const [sunday] = daySegments([source], '2026-10-04');
    const [monday] = daySegments([source], '2026-10-05');
    assert.deepEqual([sunday.start, sunday.end, sunday.continuesAfter], [1410, 1440, true]);
    assert.deepEqual([monday.start, monday.end, monday.continuesBefore], [0, 60, true]);
    assert.equal(monday.appointment.id, source.id);
    assert.equal(daySegments([source], '2026-10-06').length, 0);
    assert.equal(daySegments([appointment('b', '2026-10-05', '23:00', 60)], '2026-10-06').length, 0);
});
