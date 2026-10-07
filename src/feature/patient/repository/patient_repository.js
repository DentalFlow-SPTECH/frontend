import { matchesPatient, savePatientModel } from '../model/patient_model.js';
/** Bind domain operations to one shared, transactional data session. */
export function createPatientRepository(session) {
    return {
        find: id => session.getSnapshot().data.patients.find(patient => patient.id === id),
        search: query => session.getSnapshot().data.patients.filter(patient => matchesPatient(patient, query)),
        budgetsFor: id => session.getSnapshot().data.budgets.filter(budget => budget.patientId === id).sort((a, b) => b.createdOn.localeCompare(a.createdOn)),
        savePatient: (...args) => session.transaction(() => session.commit(savePatientModel(session.getSnapshot().data, ...args)))
    };
}
