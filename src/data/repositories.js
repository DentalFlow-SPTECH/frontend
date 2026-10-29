import { createLookups } from './lookups.js';
import { createCepApi } from './api/cep_api.js';
import { createAuthRepository } from '../feature/auth/repository/auth_repository.js';
import { createAgendaRepository } from '../feature/agenda/repository/agenda_repository.js';
import { createPatientRepository } from '../feature/patient/repository/patient_repository.js';
import { createClinicRepository } from '../feature/clinic/repository/clinic_repository.js';
import { createDashboardRepository } from '../feature/dashboard/repository/dashboard_repository.js';
import { createInventoryRepository } from '../feature/inventory/repository/inventory_repository.js';
import { createDailyMapRepository } from '../feature/daily_map/repository/daily_map_repository.js';

// Cada módulo recebe a API, a sessão (clínica e usuário autenticados), o cache de cadastros e a busca de CEP.
export function createRepositories(api, session, cep = createCepApi()) {
    const lookups = createLookups(api, session);
    const context = { api, session, lookups, cep, clinicId: () => session.user()?.clinicId, user: () => session.user() };
    return {
        auth: createAuthRepository(context),
        agenda: createAgendaRepository(context),
        patient: createPatientRepository(context),
        clinic: createClinicRepository(context),
        dashboard: createDashboardRepository(context),
        inventory: createInventoryRepository(context),
        dailyMap: createDailyMapRepository(context),
    };
}
