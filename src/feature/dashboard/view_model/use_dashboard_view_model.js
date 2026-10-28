import { useSearchParams } from 'react-router-dom';
import { useRepository } from '../../../app/app_provider.jsx';
import { useQuery } from '../../../component/use_query.js';
import { firstName, monthName } from '../../../component/format.js';
import { funnelParts, hasFinancialData, monthParam, production, shiftMonth, sortAlerts } from '../model/dashboard_model.js';

export function useDashboardViewModel() {
    const repository = useRepository('dashboard');
    const [params, setParams] = useSearchParams();
    const period = monthParam(params.get('mes'));
    const dentistId = params.get('dentista') ?? '';
    const query = useQuery(`dashboard:${period.year}-${period.month}:${dentistId}`, () => Promise.all([repository.month({ ...period, dentistId }), repository.dentists()])
        .then(([dashboard, dentists]) => ({ dashboard, dentists })));
    const now = new Date();
    const isCurrent = period.year === now.getFullYear() && period.month === now.getMonth() + 1;
    function update(next) {
        const updated = new URLSearchParams(params);
        for (const [key, value] of Object.entries(next)) {
            if (value)
                updated.set(key, value);
            else
                updated.delete(key);
        }
        setParams(updated);
    }
    const dashboard = query.data?.dashboard;
    const dentists = query.data?.dentists ?? [];
    return {
        title: `Painel de ${monthName(period.month)}`,
        subtitle: isCurrent ? `Como a clínica está indo no mês, até hoje` : `Resultado de ${monthName(period.month)} de ${period.year}`,
        periodLabel: `${monthName(period.month)} de ${period.year}`,
        loading: query.firstLoad, refreshing: query.loading, error: query.error, reload: query.reload,
        dashboard, hasData: hasFinancialData(dashboard),
        alerts: sortAlerts(dashboard?.alerts).filter(alert => alert.code !== 'NO_FINANCIAL_DATA'),
        funnel: funnelParts(dashboard?.appointmentFunnel),
        production: production(dashboard?.summary),
        breakdown: dentistId ? [] : (dashboard?.breakdown ?? []),
        dentistId,
        dentistOptions: [{ value: '', label: 'Todos' }, ...dentists.map(dentist => ({ value: String(dentist.id), label: firstName(dentist.name), avatar: dentist.name }))],
        setDentist: value => update({ dentista: value }),
        previous: () => update({ mes: shiftMonth(period, -1) }),
        next: () => update({ mes: shiftMonth(period, 1) }),
        canGoNext: !isCurrent,
    };
}
