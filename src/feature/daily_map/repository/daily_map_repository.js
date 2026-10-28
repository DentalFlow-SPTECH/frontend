import { enrich, indexById } from '../../agenda/model/agenda_model.js';
import { toDailyMapPayload } from '../model/daily_map_model.js';

// Mapa clínico diário (somente DENTISTA). Clínica, dentista e usuário vêm da autenticação.
export function createDailyMapRepository({ api, lookups, user }) {
    return {
        range: (start, end) => api.dailyMap.list({ start, end }),
        get: id => api.dailyMap.get(id),
        // Existe somente um mapa por dentista e data; 404 significa que ainda não foi lançado.
        byDate: date => api.dailyMap.list({ date }).catch(error => {
            if (error.status === 404)
                return null;
            throw error;
        }),
        // Consultas do próprio dentista no dia, para sugerir as linhas de atendimento.
        async appointmentsOf(date) {
            const dentistId = user()?.dentistId;
            const [list, patients, procedures, dentists] = await Promise.all([api.appointment.list({ date, dentistId }), lookups.patients(), lookups.procedures(), lookups.dentists()]);
            const index = { patients: indexById(patients), procedures: indexById(procedures), dentists: indexById(dentists) };
            return { appointments: list.map(item => enrich(item, index)), procedures, patients };
        },
        references: () => Promise.all([lookups.procedures(), lookups.patients()]).then(([procedures, patients]) => ({ procedures, patients })),
        save: (id, form) => (id ? api.dailyMap.update(id, toDailyMapPayload(form)) : api.dailyMap.create(toDailyMapPayload(form))),
        close: id => api.dailyMap.close(id),
    };
}
