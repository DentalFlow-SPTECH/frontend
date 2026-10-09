export const appointmentStatuses = ['Agendada', 'Confirmada', 'Em atendimento', 'Concluída', 'Cancelada', 'Faltou'];
export const openStatuses = ['Agendada', 'Confirmada', 'Em atendimento'];
export const attendanceOptions = ['Particular', 'Convênio'];
export const withoutClinic = 'sem';
export function isDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function appointmentInterval(value) {
    if (!isDate(value.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) || !Number.isSafeInteger(value.duration) || value.duration <= 0)
        return null;
    // Compare clinic wall-clock dates consistently, including appointments crossing midnight.
    const start = Date.parse(`${value.date}T${value.time}:00Z`);
    const end = start + value.duration * 60000;
    return Number.isSafeInteger(end) && Number.isFinite(new Date(end).getTime()) ? { start, end } : null;
}
export function isTooth(value) { return /^([1-4][1-8]|[5-8][1-5])$/.test(value); }
// Registros anteriores às clínicas ficam sem vínculo até a vinculação manual; nenhuma unidade é atribuída por inferência.
export function matchesClinic(record, clinicId) { return !clinicId || (clinicId === withoutClinic ? !record.clinicId : record.clinicId === clinicId); }
export function clinicLabel(clinics, id) { return clinics.find(value => value.id === id)?.name ?? 'Sem clínica'; }
// Concluir pelo status antigo não registrava o que foi feito; esses registros ainda podem receber os procedimentos realizados.
export function canFinalize(appointment) { return !appointment.completion && (openStatuses.includes(appointment.status) || appointment.status === 'Concluída'); }
// Um relatório enviado ou validado fixa as consultas incluídas até ser devolvido para correção.
export function lockedReport(reports, appointmentId) { return reports.find(report => (report.status === 'Enviado' || report.status === 'Validado') && report.appointmentIds.includes(appointmentId)); }
// Cada procedimento realizado é lido junto da consulta que o originou: data, doutor, clínica e forma de atendimento vêm dela.
export function performedItems(appointments) { return appointments.flatMap(appointment => (appointment.completion?.items ?? []).map(item => ({ ...item, appointment }))); }
