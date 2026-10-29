import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useRepository } from '../../../app/app_provider.jsx';
import { useQuery } from '../../../component/use_query.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { useToast } from '../../../component/ui/index.js';
import { brl, dateLong, isoDate, monthName } from '../../../component/format.js';
import { monthParam, shiftMonth } from '../../dashboard/model/dashboard_model.js';
import {
    emptyDailyMapForm, emptyExpense, emptyVisit, emptyVoucher, formFromDailyMap, previewTotals, readyToClose, validateDailyMap, visitsFromAppointments,
} from '../model/daily_map_model.js';

export function useDailyMapListViewModel() {
    const repository = useRepository('dailyMap');
    const [params, setParams] = useSearchParams();
    const period = monthParam(params.get('mes'));
    const start = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    const end = isoDate(new Date(period.year, period.month, 0));
    const query = useQuery(`maps:${start}`, () => repository.range(start, end));
    const maps = [...(query.data ?? [])].sort((a, b) => b.date.localeCompare(a.date));
    const sum = field => maps.reduce((total, map) => total + Number(map[field] ?? 0), 0);
    const today = isoDate(new Date());
    const current = period.year === new Date().getFullYear() && period.month === new Date().getMonth() + 1;
    return {
        periodLabel: `${monthName(period.month)} de ${period.year}`, maps, loading: query.firstLoad, error: query.error, reload: query.reload,
        totals: { gross: sum('generalGross'), outflows: sum('totalDiscounts') + sum('totalExpenses'), balance: sum('finalBalance'), patients: sum('patientCount') },
        todayLink: maps.some(map => map.date === today) ? `/mapa/${maps.find(map => map.date === today).id}` : `/mapa/novo?data=${today}`,
        todayDone: maps.some(map => map.date === today),
        previous: () => setParams({ mes: shiftMonth(period, -1) }),
        next: () => setParams({ mes: shiftMonth(period, 1) }),
        canGoNext: !current,
    };
}

export function useDailyMapDetailViewModel() {
    const repository = useRepository('dailyMap');
    const toast = useToast();
    const { id } = useParams();
    const query = useQuery(`map:${id}`, () => repository.get(Number(id)));
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const map = query.data;
    return {
        map, loading: query.firstLoad, error: query.error, reload: query.reload,
        title: map ? dateLong(map.date) : 'Mapa do dia',
        open: map?.status === 'ABERTO', ready: map ? readyToClose(map) : false,
        confirming, setConfirming, busy,
        async close() {
            setBusy(true);
            try {
                const closed = await repository.close(Number(id));
                query.setData(closed);
                toast({ title: 'Mapa fechado e conferido' });
                setConfirming(false);
            }
            catch (error) {
                toast({ tone: 'danger', title: 'Não foi possível fechar o mapa', description: error.message });
            }
            finally {
                setBusy(false);
            }
        },
    };
}

export function useDailyMapFormViewModel() {
    const repository = useRepository('dailyMap');
    const toast = useToast();
    const navigate = useNavigate();
    const { id } = useParams();
    const [params] = useSearchParams();
    const editing = Boolean(id);
    const date = params.get('data') ?? isoDate(new Date());
    const query = useQuery(`map-form:${id ?? date}`, async () => {
        if (editing) {
            const [map, references] = await Promise.all([repository.get(Number(id)), repository.references()]);
            return { form: formFromDailyMap(map), existing: null, ...references };
        }
        const [existing, day] = await Promise.all([repository.byDate(date), repository.appointmentsOf(date)]);
        const visits = visitsFromAppointments(day.appointments);
        return { form: { ...emptyDailyMapForm(date), visits }, existing, procedures: day.procedures, patients: day.patients, suggested: visits.length };
    });
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});
    const [failure, setFailure] = useState('');
    const [busy, setBusy] = useState(false);
    const [dirty, setDirty] = useState(false);
    useUnsaved(dirty && !busy);
    const current = form ?? query.data?.form ?? null;

    function edit(next) {
        setForm(next);
        setDirty(true);
        setFailure('');
    }
    const updateList = (list, index, field, value) => edit({ ...current, [list]: current[list].map((row, position) => (position === index ? { ...row, [field]: value } : row)) });

    return {
        editing, date: current?.date ?? date, loading: query.firstLoad, error: query.error, reload: query.reload,
        existing: query.data?.existing ?? null, suggested: query.data?.suggested ?? 0,
        procedureOptions: (query.data?.procedures ?? []).map(item => ({ value: String(item.id), label: item.name, detail: item.price ? brl(item.price) : '' })),
        form: current, errors, failure, busy,
        totals: current ? previewTotals(current) : null,
        change: (field, value) => { edit({ ...current, [field]: value }); setErrors(found => ({ ...found, [field]: undefined })); },
        changeRow: (list, index, field, value) => { updateList(list, index, field, value); setErrors(found => ({ ...found, [`${list}.${index}.${field}`]: undefined })); },
        addRow: list => edit({ ...current, [list]: [...current[list], list === 'visits' ? emptyVisit(current.visits.length + 1) : list === 'vouchers' ? emptyVoucher() : emptyExpense()] }),
        removeRow: (list, index) => edit({ ...current, [list]: current[list].filter((_, position) => position !== index) }),
        checkAll: () => edit({ ...current, visits: current.visits.map(visit => ({ ...visit, checked: true })), vouchers: current.vouchers.map(voucher => ({ ...voucher, checked: true })) }),
        async submit() {
            const found = validateDailyMap(current);
            setErrors(found);
            if (Object.keys(found).length) {
                setFailure('Confira os campos destacados.');
                return;
            }
            setBusy(true);
            try {
                const saved = await repository.save(editing ? Number(id) : null, current);
                setDirty(false);
                toast({ title: editing ? 'Mapa atualizado' : 'Mapa do dia salvo', description: 'Os totais foram calculados.' });
                navigate(`/mapa/${saved.id}`, { replace: true });
            }
            catch (error) {
                setFailure(error.message);
            }
            finally {
                setBusy(false);
            }
        },
        backLink: editing ? `/mapa/${id}` : '/mapa',
    };
}
