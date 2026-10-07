import { saveUserModel, setUserBlockedModel } from '../model/admin_model.js';
/** Bind domain operations to one shared, transactional data session. */
export function createAdminRepository(session) {
    return {
        saveUser: (...args) => session.transaction(() => session.commit(saveUserModel(session.getSnapshot().data, ...args))),
        setUserBlocked: (...args) => session.transaction(() => session.commit(setUserBlockedModel(session.getSnapshot().data, ...args)))
    };
}
