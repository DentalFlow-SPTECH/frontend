import { useSearchParams } from 'react-router-dom';
import { useResource } from '../../../component/use_resource.js';
import { isDate } from '../../../demo/clinic.js';
import { dateLabel, today } from '../../../demo/format.js';
import { useClinicData } from '../../../app/app_provider.jsx';
import { monthWindow, weekWindow, cashTotals } from '../model/dashboard_model.js';
export function useMonthComparisonViewModel({ movements, date }) {
    const periods = Array.from({ length: 6 }, (_, index) => {
        const period = monthWindow(date, index - 5);
        return { ...period, ...cashTotals(movements.filter(movement => movement.date >= period.from && movement.date <= period.until)) };
    });
    const maximum = Math.max(...periods.flatMap(period => [period.entries, period.exits]));
    if (!maximum)
        return { periods, maximum };
    return { periods, maximum };
}
export function useDashboardViewModel() {
    const { data } = useClinicData();
    const resource = useResource('dashboard');
    const [params, setParams] = useSearchParams();
    const date = isDate(params.get('date') ?? '') ? params.get('date') : today();
    const period = monthWindow(date);
    const dayAppointments = data.appointments.filter(appointment => appointment.date === date).sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
    const weekDates = weekWindow(date);
    const weekCounts = weekDates.map(day => data.appointments.filter(appointment => appointment.date === day).length);
    const hasWeekAppointments = weekCounts.some(count => count > 0);
    const lowProducts = data.products.filter(product => product.quantity < product.minimum).sort((a, b) => Number(a.quantity !== 0) - Number(b.quantity !== 0) || a.name.localeCompare(b.name, 'pt-BR'));
    const recentBudgets = [...data.budgets].sort((a, b) => b.createdOn.localeCompare(a.createdOn) || b.code.localeCompare(a.code));
    const monthlyCash = data.cashMovements.filter(movement => movement.date >= period.from && movement.date <= period.until);
    const totals = cashTotals(monthlyCash);
    const cashPath = `/caixa?de=${period.from}&ate=${period.until}`;
    const agendaPath = `/agenda?date=${date}`;
    const newAppointmentPath = `/agenda/nova?date=${date}`;
    const metrics = [
        { label: 'Consultas do dia', value: dayAppointments.length, hint: dateLabel(date), to: agendaPath },
        { label: 'Pacientes cadastrados', value: data.patients.length, hint: 'Ver cadastros', to: '/pacientes' },
        { label: 'Orçamentos cadastrados', value: data.budgets.length, hint: 'Ver orçamentos', to: '/orcamentos' },
        { label: 'Materiais abaixo do mínimo', value: lowProducts.length, hint: 'Conferir estoque', to: '/estoque?abaixo=1' },
    ];
    function changeDate(value) { if (isDate(value))
        setParams({ date: value }); }
    function showToday() { setParams({ date: today() }); }
    return { data, resource, date, period, dayAppointments, weekDates, weekCounts, hasWeekAppointments, lowProducts, recentBudgets, totals, cashPath, agendaPath, newAppointmentPath, metrics, changeDate, showToday };
}
