// Leitura do contrato de /dashboard. Campos *Rate e netMargin já chegam em percentual (não multiplicar).
const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
export const alertTone = severity => (severity === 'CRITICAL' ? 'danger' : severity === 'WARNING' ? 'warning' : 'info');
export const sortAlerts = alerts => [...(alerts ?? [])].sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
export const hasFinancialData = dashboard => !(dashboard?.alerts ?? []).some(alert => alert.code === 'NO_FINANCIAL_DATA');

export function funnelParts(funnel) {
    if (!funnel)
        return [];
    return [
        { key: 'concluido', label: 'Concluídas', value: funnel.completed },
        { key: 'agendado', label: 'A realizar', value: funnel.scheduled + funnel.confirmed + funnel.inProgress },
        { key: 'cancelado', label: 'Canceladas', value: funnel.cancelled },
        { key: 'faltou', label: 'Faltas', value: funnel.noShow },
    ];
}

export function monthParam(value, today = new Date()) {
    const match = /^(\d{4})-(\d{2})$/.exec(value ?? '');
    if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12)
        return { year: Number(match[1]), month: Number(match[2]) };
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
}
export const shiftMonth = ({ year, month }, delta) => {
    const date = new Date(year, month - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const production = summary => [
    ['Moldagens', summary?.moldingCount], ['Mordidas', summary?.biteCount], ['Provas', summary?.fittingCount], ['Entregas', summary?.deliveryCount], ['Repetições', summary?.repetitionCount],
].map(([label, value]) => ({ label, value: value ?? 0 }));
