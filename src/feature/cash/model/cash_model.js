// Domain operations return an atomic change; they never persist or publish state.
import { isDate } from '../../../demo/clinic.js';
const uid = () => crypto.randomUUID();
export function saveCashMovementModel(current, input) {
    if (!['Entrada', 'Saída'].includes(input.type) || !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0 || !isDate(input.date) || !input.description.trim())
        throw new Error('Informe valor maior que zero, data válida e descrição.');
    if (input.clinicId && !current.clinics.some(value => value.id === input.clinicId))
        throw new Error('Selecione uma clínica cadastrada ou deixe a movimentação sem clínica.');
    const movement = { ...input, clinicId: input.clinicId ?? '', description: input.description.trim(), id: uid(), history: [{ id: uid(), date: new Date().toISOString(), actor: 'Você', description: `${input.type} de caixa registrada.` }] };
    const total = current.cashMovements.filter(value => value.type === input.type).reduce((sum, value) => sum + value.amountCents, input.amountCents);
    if (!Number.isSafeInteger(total))
        throw new Error('O valor informado é muito alto. Revise o valor.');
    const change = { data: { ...current, cashMovements: [...current.cashMovements, movement] }, action: `${input.type} de caixa registrada`, record: movement.description, recordPath: `/caixa/${movement.id}` };
    return { ...change, value: movement };
}
