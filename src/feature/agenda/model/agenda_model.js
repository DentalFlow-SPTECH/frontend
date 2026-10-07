import { dateLabel } from '../../../demo/format.js';
import { appointmentInterval, appointmentStatuses } from '../../../demo/clinic.js';
const uid = () => crypto.randomUUID();
export function saveAppointmentModel(current, input, id) {
    const existing = id ? current.appointments.find(value => value.id === id) : undefined;
    if (id && !existing)
        throw new Error('Esta consulta não está disponível. Seu preenchimento foi mantido.');
    if (!current.patients.some(value => value.id === input.patientId) || !current.doctors.some(value => value.id === input.doctorId) || !current.procedures.some(value => value.name === input.procedure))
        throw new Error('Revise o paciente, o doutor e o procedimento selecionados.');
    if (existing && (input.patientId !== existing.patientId || input.duration !== existing.duration))
        throw new Error('O paciente e a duração desta consulta devem ser preservados na edição.');
    const interval = appointmentInterval(input);
    if (!interval)
        throw new Error('Informe data, horário e duração válidos.');
    if (!appointmentStatuses.includes(input.status))
        throw new Error('Selecione a situação da consulta.');
    if (input.budgetId && !current.budgets.some(value => value.id === input.budgetId && value.patientId === input.patientId))
        throw new Error('Selecione um orçamento deste paciente ou deixe o vínculo vazio.');
    const conflict = input.status !== 'Cancelada' && current.appointments.find(value => {
        if (value.id === id || value.doctorId !== input.doctorId || value.status === 'Cancelada')
            return false;
        const other = appointmentInterval(value);
        return other && interval.start < other.end && other.start < interval.end;
    });
    if (conflict)
        throw new Error('Este doutor já tem uma consulta nesse intervalo. Revise o horário ou o doutor.');
    const description = existing ? existing.status !== input.status ? `Consulta atualizada. Situação: ${existing.status} → ${input.status}.` : 'Consulta atualizada.' : 'Consulta agendada.';
    const appointment = { ...input, id: existing?.id ?? uid(), cancelReason: input.status === 'Cancelada' ? existing?.cancelReason ?? '' : '', history: [...(existing?.history ?? []), { id: uid(), date: new Date().toISOString(), actor: 'Você', description }] };
    const change = { data: { ...current, appointments: existing ? current.appointments.map(value => value.id === appointment.id ? appointment : value) : [...current.appointments, appointment] }, action: existing ? 'Consulta atualizada' : 'Consulta agendada', record: `${current.patients.find(value => value.id === appointment.patientId).name} · ${appointment.date} ${appointment.time}`, recordPath: `/agenda/${appointment.id}` };
    return { ...change, value: appointment };
}
export function cancelAppointmentModel(current, id, reason) {
    const existing = current.appointments.find(value => value.id === id);
    if (!existing)
        throw new Error('Esta consulta não está disponível.');
    if (existing.status === 'Cancelada')
        return { value: existing };
    const appointment = { ...existing, status: 'Cancelada', cancelReason: reason.trim(), history: [...existing.history, { id: uid(), date: new Date().toISOString(), actor: 'Você', description: reason.trim() ? `Consulta cancelada. Motivo: ${reason.trim()}` : 'Consulta cancelada.' }] };
    const change = { data: { ...current, appointments: current.appointments.map(value => value.id === id ? appointment : value) }, action: 'Consulta cancelada', record: `${current.patients.find(value => value.id === appointment.patientId)?.name ?? 'Consulta'} · ${appointment.date} ${appointment.time}`, recordPath: `/agenda/${appointment.id}` };
    return { ...change, value: appointment };
}
export const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const emptyAppointment = { patientId: '', doctorId: '', procedure: '', date: '', time: '', duration: 0, observation: '', attendance: '', budgetId: '', status: 'Agendada' };
export function parseDate(value) { return new Date(`${value}T12:00:00`); }
export function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDate(value).getTime()) && dateKey(parseDate(value)) === value; }
export function shiftDate(value, days) { const date = parseDate(value); date.setDate(date.getDate() + days); return dateKey(date); }
export function weekDates(value) { const day = parseDate(value).getDay(); const start = shiftDate(value, -(day === 0 ? 6 : day - 1)); return Array.from({ length: 7 }, (_, index) => shiftDate(start, index)); }
export function shiftMonth(value, months) { const date = parseDate(value); const day = date.getDate(); date.setDate(1); date.setMonth(date.getMonth() + months); const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); date.setDate(Math.min(day, last)); return dateKey(date); }
export function monthDates(value) { const date = parseDate(value); const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); return Array.from({ length: count }, (_, index) => `${value.slice(0, 7)}-${String(index + 1).padStart(2, '0')}`); }
export function endTime(appointment) {
    const interval = appointmentInterval(appointment);
    if (!interval)
        return 'término não informado';
    const end = new Date(interval.end).toISOString();
    return end.slice(0, 10) === appointment.date ? end.slice(11, 16) : `${dateLabel(end.slice(0, 10))} às ${end.slice(11, 16)}`;
}
