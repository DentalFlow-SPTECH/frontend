import { addDays, clock, firstName, isoDate, minutesOf, parseDate, startOfWeek, timeOf } from '../../../component/format.js';
import { appointmentStatus, statusOrder } from '../../../component/appointment_status.js';

// A consulta não tem duração própria na API: usamos a do procedimento ou 30 minutos.
export const defaultDuration = 30;
export const finalStatuses = ['CANCELADO', 'FALTOU', 'CONCLUIDO'];
export const openStatuses = ['AGENDADO', 'CONFIRMADO'];

export const weekOf = date => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index));
export const threeDaysOf = date => [date, addDays(date, 1), addDays(date, 2)];

export function monthCells(date) {
    const first = parseDate(date);
    first.setDate(1);
    const start = startOfWeek(isoDate(first));
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const cells = [];
    for (let day = start; cells.length < 42; day = addDays(day, 1)) {
        cells.push({ date: day, currentMonth: parseDate(day).getMonth() === first.getMonth() });
        if (cells.length % 7 === 0 && parseDate(day) >= last)
            break;
    }
    return cells;
}

export function monthDates(date) {
    const first = parseDate(date);
    const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return Array.from({ length: total }, (_, index) => isoDate(new Date(first.getFullYear(), first.getMonth(), index + 1)));
}

// Junta os nomes aos IDs que a API devolve e calcula início/fim em minutos do dia.
export function enrich(appointment, { patients, dentists, procedures }) {
    const patient = patients.get(appointment.patientId) ?? null;
    const dentist = dentists.get(appointment.dentistId) ?? null;
    const procedure = procedures.get(appointment.procedureId) ?? null;
    const start = minutesOf(timeOf(appointment.scheduledAt));
    const duration = procedure?.durationMinutes || defaultDuration;
    return {
        ...appointment, patient, dentist, procedure,
        patientName: patient?.name ?? `Paciente nº ${appointment.patientId}`,
        dentistName: dentist?.name ?? `Dentista nº ${appointment.dentistId}`,
        dentistShort: dentist ? firstName(dentist.name) : `Dentista nº ${appointment.dentistId}`,
        procedureName: procedure?.name ?? `Procedimento nº ${appointment.procedureId}`,
        date: appointment.scheduledAt.slice(0, 10), time: clock(start), start, duration, end: start + duration, endTime: clock(start + duration),
    };
}

export const indexById = list => new Map(list.map(item => [item.id, item]));

// Consultas simultâneas ficam lado a lado: cada grupo que se sobrepõe divide a largura em faixas.
export function layoutLanes(items) {
    const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
    const result = [];
    let cluster = [];
    let clusterEnd = -1;
    const flush = () => {
        const lanes = [];
        for (const item of cluster) {
            let lane = lanes.findIndex(end => end <= item.start);
            if (lane < 0) {
                lane = lanes.length;
                lanes.push(0);
            }
            lanes[lane] = item.end;
            result.push({ ...item, lane });
        }
        const width = lanes.length;
        for (let index = result.length - cluster.length; index < result.length; index += 1)
            result[index].lanes = width;
        cluster = [];
        clusterEnd = -1;
    };
    for (const item of sorted) {
        if (cluster.length && item.start >= clusterEnd)
            flush();
        cluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.end);
    }
    if (cluster.length)
        flush();
    return result;
}

// Janela de horas visível: sempre de 7h às 19h, ampliada se houver consultas fora dela.
export function hourWindow(items) {
    const starts = items.map(item => item.start);
    const ends = items.map(item => item.end);
    const from = Math.min(7 * 60, ...starts.map(value => Math.floor(value / 60) * 60));
    const to = Math.max(19 * 60, ...ends.map(value => Math.ceil(value / 60) * 60));
    return { from, to };
}

export function nextStatus(status) {
    const index = statusOrder.indexOf(status);
    return index >= 0 && index < statusOrder.length - 1 ? statusOrder[index + 1] : null;
}
export const canChange = status => !finalStatuses.includes(status);
export const actionLabel = status => appointmentStatus[status]?.action ?? null;

export function findNext(items, today, nowMinutes) {
    return items
        .filter(item => item.date === today && openStatuses.includes(item.status) && item.start >= nowMinutes - 10)
        .sort((a, b) => a.start - b.start)[0] ?? null;
}

export function minutesUntil(item, nowMinutes) {
    const diff = item.start - nowMinutes;
    if (diff <= 0)
        return 'agora';
    if (diff < 60)
        return `em ${diff} min`;
    const hours = Math.floor(diff / 60);
    const rest = diff % 60;
    return `em ${hours} h${rest ? ` ${rest} min` : ''}`;
}

export function periodOf(start) {
    return start < 12 * 60 ? 'Manhã' : start < 18 * 60 ? 'Tarde' : 'Noite';
}
export function groupByPeriod(items) {
    const groups = new Map();
    for (const item of [...items].sort((a, b) => a.start - b.start)) {
        const period = periodOf(item.start);
        if (!groups.has(period))
            groups.set(period, []);
        groups.get(period).push(item);
    }
    return [...groups].map(([title, list]) => ({ title, items: list }));
}

// O backend ainda não impede horários sobrepostos (guia, 11.5): o aviso é só visual.
export function conflictsWith(items, candidate) {
    return items.filter(item => item.id !== candidate.id && item.dentistId === candidate.dentistId
        && !['CANCELADO', 'FALTOU'].includes(item.status) && item.start < candidate.end && candidate.start < item.end);
}

export function emptyAppointmentForm({ date, time = '', dentistId = '', patientId = '' } = {}) {
    return { patientId: String(patientId ?? ''), dentistId: String(dentistId ?? ''), procedureId: '', date: date ?? isoDate(new Date()), time, notes: '' };
}

export function formFromAppointment(appointment) {
    return {
        patientId: String(appointment.patientId), dentistId: String(appointment.dentistId), procedureId: String(appointment.procedureId),
        date: appointment.scheduledAt.slice(0, 10), time: timeOf(appointment.scheduledAt), notes: appointment.notes ?? '',
    };
}

export function validateAppointment(form) {
    const errors = {};
    if (!form.patientId)
        errors.patientId = 'Escolha o paciente.';
    if (!form.dentistId)
        errors.dentistId = 'Escolha o dentista.';
    if (!form.procedureId)
        errors.procedureId = 'Escolha o procedimento.';
    if (!form.date)
        errors.date = 'Informe a data.';
    if (!/^\d{2}:\d{2}$/.test(form.time))
        errors.time = 'Informe o horário.';
    if (form.notes.length > 255)
        errors.notes = 'Use no máximo 255 caracteres.';
    return errors;
}

export function toAppointmentPayload(form, { clinicId, userId, status = 'AGENDADO' }) {
    return {
        clinicId, patientId: Number(form.patientId), dentistId: Number(form.dentistId), procedureId: Number(form.procedureId),
        userId: userId ?? null, scheduledAt: `${form.date}T${form.time}:00`, status, notes: form.notes.trim() || null,
    };
}

export function reminderText(item) {
    const [year, month, day] = item.date.split('-');
    return `Olá, ${firstName(item.patientName)}! Lembrando da sua consulta de ${item.procedureName.toLowerCase()} no dia ${day}/${month}/${year} às ${item.time}. Podemos confirmar?`;
}
