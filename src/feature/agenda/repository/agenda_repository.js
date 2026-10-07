import { saveAppointmentModel, cancelAppointmentModel } from '../model/agenda_model.js';
/** Bind domain operations to one shared, transactional data session. */
export function createAgendaRepository(session) {
    return {
        saveAppointment: (...args) => session.transaction(() => session.commit(saveAppointmentModel(session.getSnapshot().data, ...args))),
        cancelAppointment: (...args) => session.transaction(() => session.commit(cancelAppointmentModel(session.getSnapshot().data, ...args)))
    };
}
