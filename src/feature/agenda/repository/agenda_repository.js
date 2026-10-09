import { saveAppointmentModel, cancelAppointmentModel, finalizeAppointmentModel } from '../model/agenda_model.js';
/** Bind domain operations to one shared, transactional data session. */
export function createAgendaRepository(session) {
    return {
        saveAppointment: (...args) => session.transaction(() => session.commit(saveAppointmentModel(session.getSnapshot().data, ...args))),
        cancelAppointment: (...args) => session.transaction(() => session.commit(cancelAppointmentModel(session.getSnapshot().data, ...args))),
        finalizeAppointment: (...args) => session.transaction(() => session.commit(finalizeAppointmentModel(session.getSnapshot().data, ...args)))
    };
}
