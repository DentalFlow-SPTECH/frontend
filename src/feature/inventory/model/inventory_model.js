import { parseMoney } from '../../clinic/model/clinic_model.js';

// Regras do guia (seção 13): nome e unidade obrigatórios, valores não negativos; estoque só muda por movimentação.
export const units = ['UNIDADE', 'CAIXA', 'PACOTE', 'FRASCO', 'TUBETE', 'SERINGA', 'ROLO', 'KIT'];
export const movementTypes = {
    ENTRADA: { label: 'Entrada', hint: 'Soma ao estoque (compra, doação).' },
    SAIDA: { label: 'Saída', hint: 'Tira do estoque (uso nos atendimentos, perda).' },
    AJUSTE: { label: 'Ajuste', hint: 'Define o estoque exato depois de uma contagem.' },
};

const parseQuantity = value => {
    const text = String(value ?? '').trim();
    if (!text)
        return null;
    const number = Number(text.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(number) ? number : NaN;
};
const decimalText = value => (value === null || value === undefined ? '' : String(value).replace('.', ','));
const clean = errors => Object.fromEntries(Object.entries(errors).filter(([, value]) => value));

export const emptyProductForm = () => ({ name: '', unit: 'UNIDADE', unitCost: '', initialStock: '', minimumStock: '', active: true });
export const formFromProduct = product => ({ name: product.name, unit: product.unit, unitCost: decimalText(product.unitCost), initialStock: '', minimumStock: decimalText(Number(product.minimumStock)), active: Boolean(product.active) });
export function validateProduct(form, editing) {
    const cost = parseMoney(form.unitCost);
    const stock = parseQuantity(form.initialStock);
    const minimum = parseQuantity(form.minimumStock);
    return clean({
        name: !form.name.trim() ? 'Informe o nome do material.' : form.name.length > 100 ? 'Use no máximo 100 caracteres.' : undefined,
        unit: !form.unit.trim() ? 'Escolha a unidade.' : form.unit.length > 20 ? 'Use no máximo 20 caracteres.' : undefined,
        unitCost: Number.isNaN(cost) ? 'Use um valor como 25,90.' : cost !== null && cost < 0 ? 'O valor não pode ser negativo.' : undefined,
        initialStock: !editing && (Number.isNaN(stock) || (stock !== null && stock < 0)) ? 'Informe uma quantidade válida.' : undefined,
        minimumStock: Number.isNaN(minimum) || (minimum !== null && minimum < 0) ? 'Informe uma quantidade válida.' : undefined,
    });
}
export const toProductPayload = form => ({
    name: form.name.trim(), unit: form.unit.trim().toUpperCase(), unitCost: parseMoney(form.unitCost) ?? 0,
    initialStock: parseQuantity(form.initialStock) ?? 0, minimumStock: parseQuantity(form.minimumStock) ?? 0, active: form.active,
});

export const emptyMovementForm = (type = 'ENTRADA') => ({ type, quantity: '', reason: '' });
export function validateMovement(form, product) {
    const quantity = parseQuantity(form.quantity);
    const errors = {};
    if (quantity === null || Number.isNaN(quantity) || quantity < 0 || (form.type !== 'AJUSTE' && quantity === 0))
        errors.quantity = 'Informe uma quantidade maior que zero.';
    else if (form.type === 'SAIDA' && product && quantity > Number(product.currentStock))
        errors.quantity = `Há somente ${decimalText(Number(product.currentStock))} em estoque.`;
    if (form.reason.length > 255)
        errors.reason = 'Use no máximo 255 caracteres.';
    return errors;
}
export const toMovementPayload = form => ({ type: form.type, quantity: parseQuantity(form.quantity), reason: form.reason.trim() || null });

export const emptyEquipmentForm = () => ({ name: '', description: '', acquisitionValue: '', usefulLifeUses: '', completedUses: '0', active: true });
export const formFromEquipment = item => ({ name: item.name, description: item.description ?? '', acquisitionValue: decimalText(item.acquisitionValue), usefulLifeUses: String(item.usefulLifeUses ?? ''), completedUses: String(item.completedUses ?? 0), active: Boolean(item.active) });
export function validateEquipment(form) {
    const value = parseMoney(form.acquisitionValue);
    const life = Number(form.usefulLifeUses);
    const used = Number(form.completedUses || 0);
    return clean({
        name: !form.name.trim() ? 'Informe o nome do equipamento.' : form.name.length > 100 ? 'Use no máximo 100 caracteres.' : undefined,
        acquisitionValue: value === null || Number.isNaN(value) || value < 0 ? 'Informe o valor pago, como 1.200,00.' : undefined,
        usefulLifeUses: !Number.isInteger(life) || life <= 0 ? 'Informe quantos usos ele deve durar.' : undefined,
        completedUses: !Number.isInteger(used) || used < 0 ? 'Informe um número inteiro.' : undefined,
    });
}
export const toEquipmentPayload = form => ({
    name: form.name.trim(), description: form.description.trim() || null, acquisitionValue: parseMoney(form.acquisitionValue),
    usefulLifeUses: Number(form.usefulLifeUses), completedUses: Number(form.completedUses || 0), active: form.active,
});

export const stockLevel = product => (Number(product.currentStock) <= 0 ? 'empty' : product.lowStock ? 'low' : 'ok');
export const usagePercent = item => Math.min(100, Math.round((Number(item.completedUses) / Math.max(1, Number(item.usefulLifeUses))) * 100));
