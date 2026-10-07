import { saveBudgetModel } from '../model/budget_model.js';
/** Bind domain operations to one shared, transactional data session. */
export function createBudgetRepository(session) {
    return {
        saveBudget: (...args) => session.transaction(() => session.commit(saveBudgetModel(session.getSnapshot().data, ...args)))
    };
}
