import { appointmentInterval } from '../../../demo/clinic.js';
import { dateKey, parseDate, shiftDate } from './agenda_model.js';

export const calendarHours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
export const fullWeekdays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

// A consulta conserva sua identidade; cada dia exibe apenas a parte do intervalo que o atravessa.
export function daySegments(appointments, day) {
    const start = Date.parse(`${day}T00:00:00Z`);
    const end = start + 86400000;
    const segments = appointments.flatMap(appointment => {
        const interval = appointmentInterval(appointment);
        if (!interval || interval.start >= end || interval.end <= start)
            return [];
        return [{ appointment, start: (Math.max(start, interval.start) - start) / 60000, end: (Math.min(end, interval.end) - start) / 60000, continuesBefore: interval.start < start, continuesAfter: interval.end > end }];
    }).sort((a, b) => a.start - b.start || b.end - a.end || a.appointment.id.localeCompare(b.appointment.id));
    let group = [], groupEnd = -1, lanes = [];
    function finish() {
        for (const segment of group)
            segment.lanes = lanes.length;
        group = [];
        lanes = [];
    }
    for (const segment of segments) {
        if (segment.start >= groupEnd) {
            finish();
            groupEnd = -1;
        }
        let lane = lanes.findIndex(endMinute => endMinute <= segment.start);
        if (lane < 0)
            lane = lanes.length;
        lanes[lane] = segment.end;
        segment.lane = lane;
        group.push(segment);
        groupEnd = Math.max(groupEnd, segment.end);
    }
    finish();
    return segments;
}

export function monthCells(date) {
    const first = `${date.slice(0, 7)}-01`;
    const offset = (parseDate(first).getDay() + 6) % 7;
    const last = dateKey(new Date(parseDate(first).getFullYear(), parseDate(first).getMonth() + 1, 0));
    const count = Math.ceil((offset + parseDate(last).getDate()) / 7) * 7;
    return Array.from({ length: count }, (_, index) => {
        const day = shiftDate(first, index - offset);
        return { date: day, number: parseDate(day).getDate(), currentMonth: day.slice(0, 7) === date.slice(0, 7) };
    });
}
