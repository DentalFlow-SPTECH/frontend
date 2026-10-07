const uid = () => crypto.randomUUID();
export function createProductModel(current, input) {
    const product = { ...input, id: uid(), code: `MAT-${String(current.products.length + 1).padStart(3, '0')}` };
    const change = { data: { ...current, products: [...current.products, product] }, action: 'Material cadastrado', record: product.code, recordPath: `/estoque/${product.id}` };
    return { ...change, value: product };
}
export function addEntryModel(current, input) {
    if (!current.products.some(product => product.id === input.productId))
        throw new Error('Este material não está disponível. Os dados preenchidos foram mantidos.');
    const change = { data: { ...current, products: current.products.map(product => product.id === input.productId ? { ...product, quantity: product.quantity + input.quantity } : product), movements: [...current.movements, { ...input, id: uid(), type: 'Entrada', actor: 'Você', reason: 'Recebimento de material' }] }, action: 'Entrada de estoque registrada', record: current.products.find(value => value.id === input.productId).code, recordPath: `/estoque/${input.productId}` };
    return change;
}
export function addExitModel(current, input) {
    const product = current.products.find(value => value.id === input.productId);
    if (!product)
        throw new Error('Este material não está disponível. Os dados preenchidos foram mantidos.');
    if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0)
        throw new Error('Informe uma quantidade inteira maior que zero.');
    if (input.quantity > product.quantity)
        throw new Error('A quantidade supera o saldo disponível. Revise a quantidade.');
    const change = { data: { ...current, products: current.products.map(value => value.id === input.productId ? { ...value, quantity: value.quantity - input.quantity } : value), movements: [...current.movements, { ...input, id: uid(), type: 'Saída', actor: 'Você', supplier: '', purchaseCents: 0, lot: '', expiresOn: '' }] }, action: 'Saída de estoque registrada', record: product.code, recordPath: `/estoque/${product.id}` };
    return change;
}
export function isDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const parsed = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function readQuantity(value) {
    if (!/^\d+$/.test(value.trim()))
        return null;
    const quantity = Number(value);
    return Number.isSafeInteger(quantity) ? quantity : null;
}
export const initialProduct = { name: '', category: '', description: '', unit: '', quantity: '0', minimum: '0', cost: '0,00', supplier: '', lot: '', expiresOn: '' };
export const exitReasons = ['Consumo interno', 'Procedimento', 'Perda', 'Vencimento', 'Ajuste', 'Outros motivos'];
