import { moneyInput, readMoney, today } from '../../../demo/format.js';
import { isTooth } from '../../../demo/clinic.js';
const uid = () => crypto.randomUUID();
export function saveBudgetModel(current, input, id) {
    const existing = id ? current.budgets.find(budget => budget.id === id) : undefined;
    if (id && !existing)
        throw new Error('Este orçamento não está disponível. Seu preenchimento foi mantido.');
    if (existing && !existing.local)
        throw new Error('Este orçamento está disponível somente para leitura.');
    if (input.items.some(item => item.tooth && !isTooth(item.tooth)))
        throw new Error('Revise a identificação dos dentes. Seu preenchimento foi mantido.');
    const now = new Date().toISOString();
    const budget = { ...input, id: existing?.id ?? uid(), code: existing?.code ?? `ORC-${String(current.budgets.length + 1).padStart(3, '0')}`, local: true, statusLabel: 'Registro local', approvedOn: '', history: [...(existing?.history ?? []), { id: uid(), date: now, actor: 'Você', description: existing ? 'Orçamento atualizado.' : 'Orçamento criado.' }] };
    const change = { data: { ...current, budgets: existing ? current.budgets.map(value => value.id === existing.id ? budget : value) : [...current.budgets, budget] }, action: existing ? 'Orçamento atualizado' : 'Orçamento criado', record: budget.code, recordPath: `/orcamentos/${budget.id}` };
    return { ...change, value: budget };
}
export function makeDraft(source, patientId) {
    return source ? { patientId: source.patientId, doctorId: source.doctorId, createdOn: source.createdOn, validUntil: source.validUntil, observation: source.observation, paymentNote: source.paymentNote, items: source.items.map(item => ({ id: item.id, procedure: item.procedure, quantity: String(item.quantity), unitPrice: moneyInput(item.unitPriceCents), observation: item.observation, tooth: item.tooth ?? '', surface: item.surface ?? '' })) } : { patientId, doctorId: '', createdOn: today(), validUntil: '', observation: '', paymentNote: '', items: [] };
}
export function itemValue(item) {
    const quantity = Number(item.quantity);
    const unitPriceCents = readMoney(item.unitPrice);
    return /^\d+$/.test(item.quantity) && Number.isSafeInteger(quantity) && quantity > 0 && unitPriceCents !== null && Number.isSafeInteger(quantity * unitPriceCents) ? { quantity, unitPriceCents } : null;
}
export function dateIsValid(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
