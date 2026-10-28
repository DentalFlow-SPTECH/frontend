import { toClinicPayload, toDentistPayload, toProcedurePayload, toUserPayload } from '../model/clinic_model.js';

// Clínica, dentistas, procedimentos e usuários. Escrita é exclusiva de DENTISTA (a API responde 403 para a recepção).
export function createClinicRepository({ api, lookups, clinicId }) {
    return {
        clinic: () => api.clinic.get(clinicId()),
        updateClinic: form => api.clinic.update(clinicId(), toClinicPayload(form)),
        dentists: () => lookups.dentists(),
        dentist: id => api.dentist.get(id),
        async saveDentist(id, form) {
            const payload = toDentistPayload(form, clinicId());
            const saved = id ? await api.dentist.update(id, payload) : await api.dentist.create(payload);
            lookups.invalidate('dentist');
            return saved;
        },
        procedures: () => lookups.procedures(),
        procedure: id => api.procedure.get(id),
        async saveProcedure(id, form) {
            const payload = toProcedurePayload(form, clinicId());
            const saved = id ? await api.procedure.update(id, payload) : await api.procedure.create(payload);
            lookups.invalidate('procedure');
            return saved;
        },
        createUser: form => api.user.create(toUserPayload(form, clinicId())),
    };
}
