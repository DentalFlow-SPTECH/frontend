import { createProductModel, addEntryModel, addExitModel } from '../model/inventory_model.js';
/** Bind domain operations to one shared, transactional data session. */
export function createInventoryRepository(session) {
    return {
        createProduct: (...args) => session.transaction(() => session.commit(createProductModel(session.getSnapshot().data, ...args))),
        addEntry: (...args) => session.transaction(() => session.commit(addEntryModel(session.getSnapshot().data, ...args))),
        addExit: (...args) => session.transaction(() => session.commit(addExitModel(session.getSnapshot().data, ...args)))
    };
}
