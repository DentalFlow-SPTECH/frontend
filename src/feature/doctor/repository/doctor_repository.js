import { saveDoctorModel } from '../model/doctor_model.js';
/** Bind domain operations to one shared, transactional data session. */
export function createDoctorRepository(session) {
    return {
        saveDoctor: (...args) => session.transaction(() => session.commit(saveDoctorModel(session.getSnapshot().data, ...args)))
    };
}
