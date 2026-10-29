import { toPatientPayload } from '../model/patient_model.js';

// Pacientes da clínica autenticada. A API não pagina: a lista completa é filtrada na tela.
export function createPatientRepository({ api, lookups, cep, clinicId }) {
    return {
        list: () => lookups.patients(),
        get: id => api.patient.get(id),
        findAddress: value => cep.lookup(value),
        async create(form) {
            const saved = await api.patient.create(toPatientPayload(form, clinicId()));
            lookups.invalidate('patient');
            return saved;
        },
        async update(id, form) {
            const saved = await api.patient.update(id, toPatientPayload(form, clinicId()));
            lookups.invalidate('patient');
            return saved;
        },
    };
}
