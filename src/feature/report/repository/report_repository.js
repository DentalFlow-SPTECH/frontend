import { saveDailyReportModel, reviewDailyReportModel, saveClaimModel } from '../model/report_model.js';
/** Bind domain operations to one shared, transactional data session. */
export function createReportRepository(session) {
    return {
        saveDailyReport: (...args) => session.transaction(() => session.commit(saveDailyReportModel(session.getSnapshot().data, ...args))),
        reviewDailyReport: (...args) => session.transaction(() => session.commit(reviewDailyReportModel(session.getSnapshot().data, ...args))),
        saveClaim: (...args) => session.transaction(() => session.commit(saveClaimModel(session.getSnapshot().data, ...args)))
    };
}
