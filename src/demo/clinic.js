export const appointmentStatuses = ['Agendada', 'Confirmada', 'Em atendimento', 'Concluída', 'Cancelada', 'Faltou'];
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
