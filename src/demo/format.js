export function money(cents) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100); }
export function dateLabel(value) {
    if (!value)
        return 'Não informada';
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date);
}
export function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function normalize(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim(); }
export function budgetTotal(items) { return items.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0); }
// Restricted demo values: positive integers for quantities, at most two decimal places for BRL examples.
export function readMoney(value) {
    const cleaned = value.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned))
        return null;
    const [whole, fraction = ''] = cleaned.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    return Number.isSafeInteger(cents) ? cents : null;
}
export function moneyInput(cents) { return (cents / 100).toFixed(2).replace('.', ','); }
