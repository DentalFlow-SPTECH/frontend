import { enrich, indexById, toAppointmentPayload } from '../model/agenda_model.js';

// Executa as chamadas com no máximo `limit` em paralelo (semana = 7 dias, mês = até 31 dias).
async function pooled(values, limit, task) {
    const results = new Array(values.length);
    let next = 0;
    async function worker() {
        while (next < values.length) {
            const index = next++;
            results[index] = await task(values[index]);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
    return results;
}

export function createAgendaRepository({ api, lookups, clinicId, user }) {
    async function references() {
        const [dentists, procedures, patients] = await Promise.all([lookups.dentists(), lookups.procedures(), lookups.patients()]);
        return { dentists, procedures, patients, index: { dentists: indexById(dentists), procedures: indexById(procedures), patients: indexById(patients) } };
    }
    return {
        references,
        // Agenda de vários dias: a API consulta um dia por vez (GET /appointment?date=).
        async days(dates) {
            const [refs, lists] = await Promise.all([references(), pooled(dates, 7, date => api.appointment.list({ date }))]);
            const byDate = Object.fromEntries(dates.map((date, index) => [date, lists[index].map(item => enrich(item, refs.index))]));
            return { byDate, dentists: refs.dentists, procedures: refs.procedures, patients: refs.patients };
        },
        async monthCounts(dates) {
            const lists = await pooled(dates, 6, date => api.appointment.list({ date }));
            return Object.fromEntries(dates.map((date, index) => [date, lists[index].filter(item => !['CANCELADO'].includes(item.status)).length]));
        },
        async get(id) {
            const [refs, appointment] = await Promise.all([references(), api.appointment.get(id)]);
            return { appointment: enrich(appointment, refs.index), ...refs };
        },
        async setStatus(id, status) {
            const [refs, appointment] = await Promise.all([references(), api.appointment.setStatus(id, status)]);
            return enrich(appointment, refs.index);
        },
        create(form) {
            return api.appointment.create(toAppointmentPayload(form, { clinicId: clinicId(), userId: user()?.id }));
        },
        update(id, form, current) {
            return api.appointment.update(id, toAppointmentPayload(form, { clinicId: clinicId(), userId: current.userId ?? user()?.id, status: current.status }));
        },
    };
}
