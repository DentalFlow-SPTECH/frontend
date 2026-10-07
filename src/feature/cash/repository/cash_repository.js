import { saveCashMovementModel } from '../model/cash_model.js';
/** Bind domain operations to one shared, transactional data session. */
export function createCashRepository(session) {
    return {
        saveCashMovement: (...args) => session.transaction(() => session.commit(saveCashMovementModel(session.getSnapshot().data, ...args)))
    };
}
