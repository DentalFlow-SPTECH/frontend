import { useSearchParams } from 'react-router-dom';
import { useResource } from '../../../component/use_resource.js';
import { isDate, matchesClinic, withoutClinic } from '../../../demo/clinic.js';
import { dateLabel, today } from '../../../demo/format.js';
import { useClinicData } from '../../../app/app_provider.jsx';
import { monthWindow, shiftMonth, cashTotals, overviewMetrics, clinicRows, pendingCounts, productionSummary } from '../model/dashboard_model.js';
const sections = [['geral', 'Visão geral'], ['producao', 'Produção e relatórios'], ['financeiro', 'Financeiro']];
export function useDashboardViewModel() {
    const { data } = useClinicData();
    const resource = useResource('dashboard');
    const [params, setParams] = useSearchParams();
    const date = isDate(params.get('date') ?? '') ? params.get('date') : today();
    const tab = sections.some(([key]) => key === params.get('aba')) ? params.get('aba') : 'geral';
    const clinicId = params.get('clinica') === withoutClinic || data.clinics.some(value => value.id === params.get('clinica')) ? params.get('clinica') : '';
    const window = monthWindow(date);
    const period = { ...window, label: window.label.charAt(0).toUpperCase() + window.label.slice(1) };
    const now = today();
    const inPeriod = (value, range = period) => value.date >= range.from && value.date <= range.until;
    // Clínica e período valem para todas as abas e seguem nos atalhos para os módulos.
    const context = clinicId ? `&clinica=${clinicId}` : '';
    const tabs = sections.map(([key, label]) => ({ key, label, to: `/painel?date=${date}${context}${key === 'geral' ? '' : `&aba=${key}`}`, current: key === tab }));
    function show(next) {
        const merged = { date, clinica: clinicId, aba: tab === 'geral' ? '' : tab, ...next };
        setParams(Object.fromEntries(Object.entries(merged).filter(([, value]) => value)));
    }
    const metrics = overviewMetrics(data.appointments.filter(value => inPeriod(value) && matchesClinic(value, clinicId)), now);
    const clinics = clinicRows(data, period, now);
    const pending = pendingCounts(data, period, clinicId, now);
    const production = productionSummary(data, period, clinicId);
    const movements = data.cashMovements.filter(value => matchesClinic(value, clinicId));
    const totals = cashTotals(movements.filter(value => inPeriod(value)));
    const months = Array.from({ length: 6 }, (_, index) => {
        const month = monthWindow(date, index - 5);
        return { ...month, ...cashTotals(movements.filter(value => inPeriod(value, month))) };
    });
    const paths = {
        agenda: `/agenda?date=${date}${context}`, newAppointment: `/agenda/nova?date=${date}${context}`, cash: `/caixa?de=${period.from}&ate=${period.until}${context}`,
        review: `/relatorios/conferencia?situacao=Enviado${context}`, correction: `/relatorios/conferencia?situacao=Em+corre%C3%A7%C3%A3o${context}`, reports: `/relatorios/conferencia${context ? `?${context.slice(1)}` : ''}`,
        monthly: `/relatorios/mensal?mes=${period.key}${context}`, waiting: `/relatorios/mensal?mes=${period.key}${context}&situacao=Aguardando`, links: '/administracao/vinculos', stock: '/estoque?abaixo=1',
    };
    const clinicOptions = data.clinics.length ? [...data.clinics.map(clinic => ({ value: clinic.id, label: clinic.name })), ...(clinics.unlinked ? [{ value: withoutClinic, label: 'Sem clínica' }] : [])] : [];
    return {
        resource, date, tab, tabs, clinicId, clinicOptions, period, periodRange: `${dateLabel(period.from)} a ${dateLabel(period.until)}`, hasClinics: data.clinics.length > 0,
        metrics, clinics, pending, production, totals, months, maximum: Math.max(...months.flatMap(value => [value.entries, value.exits])), paths,
        changeClinic: value => show({ clinica: value }), showMonth: offset => show({ date: shiftMonth(date, offset) }), showToday: () => show({ date: today() }),
    };
}
