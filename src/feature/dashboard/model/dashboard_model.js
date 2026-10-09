import { matchesClinic, openStatuses, performedItems, withoutClinic } from '../../../demo/clinic.js';
import { attendanceOf, monthlyTotals, reportSlots } from '../../report/model/report_model.js';
export function monthWindow(date, offset = 0) {
    const start = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
    start.setUTCMonth(start.getUTCMonth() + offset);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
    return { key: start.toISOString().slice(0, 7), from: start.toISOString().slice(0, 10), until: end.toISOString().slice(0, 10), label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start), shortLabel: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(start) };
}
export function shiftDate(date, days) {
    const result = new Date(`${date}T12:00:00Z`);
    result.setUTCDate(result.getUTCDate() + days);
    return result.toISOString().slice(0, 10);
}
export function shiftMonth(date, months) { return monthWindow(date, months).from; }
export function weekWindow(date) {
    const value = new Date(`${date}T12:00:00Z`);
    const mondayOffset = value.getUTCDay() === 0 ? -6 : 1 - value.getUTCDay();
    const start = shiftDate(date, mondayOffset);
    return Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
}
export function cashTotals(movements) {
    return movements.reduce((total, movement) => ({ entries: total.entries + (movement.type === 'Entrada' ? movement.amountCents : 0), exits: total.exits + (movement.type === 'Saída' ? movement.amountCents : 0) }), { entries: 0, exits: 0 });
}
const inPeriod = (value, period) => value.date >= period.from && value.date <= period.until;
// Consultas registradas não medem ocupação; finalizadas são as que têm procedimentos realizados; paciente conta uma vez.
export function overviewMetrics(appointments, today) {
    const finalized = appointments.filter(value => value.completion);
    return {
        registered: appointments.length, cancelled: appointments.filter(value => value.status === 'Cancelada').length, missed: appointments.filter(value => value.status === 'Faltou').length,
        finalized: finalized.length, patients: new Set(finalized.map(value => value.patientId)).size,
        unfinished: appointments.filter(value => value.date < today && openStatuses.includes(value.status)).length,
    };
}
export function clinicRows(data, period, today) {
    const appointments = data.appointments.filter(value => inPeriod(value, period));
    const slots = reportSlots(data, period);
    const row = (id, name) => ({ id, name, ...overviewMetrics(appointments.filter(value => matchesClinic(value, id)), today), toReview: slots.filter(slot => slot.status === 'Enviado' && matchesClinic(slot.key, id)).length });
    const rows = data.clinics.map(clinic => row(clinic.id, clinic.name));
    const unlinked = row(withoutClinic, 'Sem clínica');
    return { rows, unlinked: unlinked.registered || unlinked.toReview ? unlinked : null, total: row('', 'Todas as clínicas'), repeatedPatients: [...rows, unlinked].reduce((sum, value) => sum + value.patients, 0) - row('', '').patients };
}
export function pendingCounts(data, period, clinicId, today) {
    const appointments = data.appointments.filter(value => inPeriod(value, period) && matchesClinic(value, clinicId));
    const slots = reportSlots(data, { ...period, clinicId });
    const totals = monthlyTotals(performedItems(appointments));
    return {
        unfinished: overviewMetrics(appointments, today).unfinished,
        toReview: slots.filter(slot => slot.status === 'Enviado').length, inCorrection: slots.filter(slot => slot.status === 'Em correção').length,
        waiting: totals.waitingCount,
        unlinked: data.clinics.length ? data.appointments.filter(value => !value.clinicId).length + data.cashMovements.filter(value => !value.clinicId).length : 0,
        lowStock: data.products.filter(product => product.quantity < product.minimum).length,
    };
}
// Produção conta itens efetivamente realizados. Procedimento agendado ou previsto em orçamento não entra.
export function productionSummary(data, period, clinicId) {
    const appointments = data.appointments.filter(value => value.completion && inPeriod(value, period) && matchesClinic(value, clinicId));
    const items = performedItems(appointments);
    const slots = reportSlots(data, { ...period, clinicId }).filter(slot => slot.appointments.length || slot.report);
    const count = form => items.filter(item => attendanceOf(item) === form).length;
    const doctors = [...new Set([...appointments.map(value => value.doctorId), ...slots.map(slot => slot.key.doctorId)])].map(id => {
        const own = items.filter(item => item.appointment.doctorId === id);
        return { id, name: data.doctors.find(value => value.id === id)?.name ?? 'Doutor não disponível', appointments: appointments.filter(value => value.doctorId === id).length, items: own.length, particular: own.filter(item => attendanceOf(item) === 'Particular').length, plan: own.filter(item => attendanceOf(item) === 'Convênio').length, pending: slots.filter(slot => slot.key.doctorId === id && slot.status !== 'Validado').length };
    }).sort((a, b) => b.items - a.items || a.name.localeCompare(b.name, 'pt-BR'));
    const procedures = [...items.reduce((map, item) => map.set(item.procedure, (map.get(item.procedure) ?? 0) + 1), new Map())].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'));
    return {
        items: items.length, appointments: appointments.length, particular: count('Particular'), plan: count('Convênio'), uninformed: count(''),
        expected: slots.length, validated: slots.filter(slot => slot.status === 'Validado').length, toReview: slots.filter(slot => slot.status === 'Enviado').length, inCorrection: slots.filter(slot => slot.status === 'Em correção').length, notSent: slots.filter(slot => slot.status === 'Rascunho' || slot.status === 'Não iniciado').length,
        doctors, procedures, totals: monthlyTotals(items),
    };
}
