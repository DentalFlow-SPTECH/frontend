export function monthWindow(date, offset = 0) {
    const start = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
    start.setUTCMonth(start.getUTCMonth() + offset);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
    return { key: start.toISOString().slice(0, 7), from: start.toISOString().slice(0, 10), until: end.toISOString().slice(0, 10), label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start), shortLabel: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(start) };
}
export function shiftDate(date, days) {
    const result = new Date(`${date}T12:00:00Z`);
    result.setUTCDate(result.getUTCDate() + days);
    return result.toISOString().slice(0, 10);
}
export function weekWindow(date) {
    const value = new Date(`${date}T12:00:00Z`);
    const mondayOffset = value.getUTCDay() === 0 ? -6 : 1 - value.getUTCDay();
    const start = shiftDate(date, mondayOffset);
    return Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
}
export function cashTotals(movements) {
    return movements.reduce((total, movement) => ({ entries: total.entries + (movement.type === 'Entrada' ? movement.amountCents : 0), exits: total.exits + (movement.type === 'Saída' ? movement.amountCents : 0) }), { entries: 0, exits: 0 });
}
