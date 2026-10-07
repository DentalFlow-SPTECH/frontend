import { createPatientRepository } from '../feature/patient/repository/patient_repository.js';
import { createDoctorRepository } from '../feature/doctor/repository/doctor_repository.js';
import { createInventoryRepository } from '../feature/inventory/repository/inventory_repository.js';
import { createBudgetRepository } from '../feature/budget/repository/budget_repository.js';
import { createAgendaRepository } from '../feature/agenda/repository/agenda_repository.js';
import { createCashRepository } from '../feature/cash/repository/cash_repository.js';
import { createAdminRepository } from '../feature/admin/repository/admin_repository.js';
export function createRepositories(session) {
    return {
        patient: createPatientRepository(session), doctor: createDoctorRepository(session),
        inventory: createInventoryRepository(session), budget: createBudgetRepository(session),
        agenda: createAgendaRepository(session), cash: createCashRepository(session),
        admin: createAdminRepository(session),
    };
}
