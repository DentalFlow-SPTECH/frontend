import { createSeed } from '../../demo/seed.js';
import { emptyPatientInput } from '../../demo/patient.js';
export const storageKey = 'dental_flow_demo_v1';
export function readSnapshot(storage) {
    try {
        const raw = storage.getItem(storageKey);
        if (!raw)
            return { data: createSeed(), notice: '' };
        const saved = JSON.parse(raw);
        // Validate the collections before using a local snapshot. Preserve an unreadable snapshot until reset.
        if (saved.version !== 1 || !['patients', 'doctors', 'procedures', 'budgets', 'products', 'movements'].every(key => Array.isArray(saved[key])))
            throw new Error('invalid');
        for (const key of ['appointments', 'cashMovements', 'users', 'audit']) {
            if (saved[key] === undefined)
                saved[key] = [];
            else if (!Array.isArray(saved[key]))
                throw new Error('invalid');
        }
        // Refresh only the fixed sample copy; keep stock balances and all visitor-created records.
        const seed = createSeed();
        // Add only missing fields; keep IDs, codes, edits and budget relationships from version 1.
        saved.patients = saved.patients.map(patient => ({ ...emptyPatientInput, ...patient, history: patient.history ?? [] }));
        saved.budgets = saved.budgets.map(budget => {
            const reference = !budget.local && seed.budgets.find(value => value.id === budget.id);
            return reference ? { ...budget, observation: reference.observation, paymentNote: reference.paymentNote, items: budget.items.map(item => ({ ...item, observation: reference.items.find(value => value.id === item.id)?.observation ?? item.observation })), history: reference.history } : budget;
        });
        saved.products = saved.products.map(product => {
            const reference = seed.products.find(value => value.id === product.id);
            return reference ? { ...product, description: reference.description, supplier: reference.supplier, lot: reference.lot } : product;
        });
        saved.movements = saved.movements.map(movement => {
            const reference = seed.movements.find(value => value.id === movement.id);
            return reference ? { ...movement, actor: reference.actor, reason: reference.reason, supplier: reference.supplier, lot: reference.lot, observation: reference.observation } : { ...movement, actor: movement.actor.replace(' · demonstração', ''), reason: movement.reason === 'Entrada demonstrativa' ? 'Recebimento de material' : movement.reason };
        });
        return { data: saved, notice: '' };
    }
    catch {
        return { data: createSeed(), notice: 'Não foi possível abrir os dados salvos. Os registros iniciais estão sendo exibidos.' };
    }
}
export function writeSnapshot(storage, next) {
    try {
        storage.setItem(storageKey, JSON.stringify(next));
    }
    catch {
        throw new Error('Não foi possível salvar neste navegador. Os dados preenchidos foram mantidos. Verifique se o armazenamento local está disponível e tente novamente.');
    }
}
