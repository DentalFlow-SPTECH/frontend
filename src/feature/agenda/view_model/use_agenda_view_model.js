import { useSearchParams } from 'react-router-dom';
import { useRepository } from '../../../app/app_provider.jsx';
import { useQuery } from '../../../component/use_query.js';
import { useMediaQuery, useNow } from '../../../component/use_media_query.js';
import { addDays, dateLong, dayOfMonth, firstName, isoDate, monthName, parseDate, rangeLabel, weekdayShort } from '../../../component/format.js';
import { findNext, hourWindow, minutesUntil, monthCells, monthDates, threeDaysOf, weekOf } from '../model/agenda_model.js';
import { useAppointmentActions } from './use_appointment_actions.js';

const views = ['dia', '3dias', 'semana', 'mes'];

// Estado da agenda na URL (?ver=&data=&dentista=&consulta=), para voltar ao mesmo lugar e compartilhar o link.
export function useAgendaViewModel() {
    const repository = useRepository('agenda');
    const [params, setParams] = useSearchParams();
    const wide = useMediaQuery('(min-width: 900px)');
    const now = useNow();
    const today = isoDate(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const requested = views.includes(params.get('ver')) ? params.get('ver') : wide ? 'semana' : 'dia';
    const view = wide ? (requested === '3dias' ? 'semana' : requested) : (requested === 'semana' ? '3dias' : requested);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('data') ?? '') ? params.get('data') : today;
    const dentistId = params.get('dentista') ?? '';
    const selectedId = Number(params.get('consulta')) || null;
    const dates = view === 'semana' ? weekOf(date) : view === '3dias' ? threeDaysOf(date) : view === 'dia' ? [date] : [];

    const query = useQuery(`days:${dates.join(',')}`, () => (dates.length ? repository.days(dates) : repository.references().then(refs => ({ byDate: {}, ...refs }))));
    const month = useQuery(`month:${view === 'mes' ? date.slice(0, 7) : ''}`, () => (view === 'mes' ? repository.monthCounts(monthDates(date)) : Promise.resolve({})));

    function update(next) {
        setParams(current => {
            const updated = new URLSearchParams(current);
            for (const [key, value] of Object.entries(next)) {
                if (value === '' || value === null || value === undefined)
                    updated.delete(key);
                else
                    updated.set(key, value);
            }
            return updated;
        });
    }
    const step = view === 'semana' ? 7 : view === '3dias' ? 3 : 1;
    function shift(direction) {
        if (view === 'mes') {
            const base = parseDate(date);
            update({ data: isoDate(new Date(base.getFullYear(), base.getMonth() + direction, 1)) });
        }
        else
            update({ data: addDays(date, direction * step) });
    }

    const data = query.data;
    const dentists = data?.dentists ?? [];
    const all = dates.flatMap(day => data?.byDate?.[day] ?? []);
    const matches = item => !dentistId || String(item.dentistId) === dentistId;
    const visible = all.filter(matches);
    const byDentist = view === 'dia' && wide;
    const columns = byDentist
        ? dentists.filter(dentist => !dentistId || String(dentist.id) === dentistId).map(dentist => {
            const items = visible.filter(item => item.dentistId === dentist.id);
            return { key: `dentista-${dentist.id}`, title: dentist.name, subtitle: `${dentist.specialty ?? 'Dentista'} · ${items.length} ${items.length === 1 ? 'consulta' : 'consultas'}`, avatar: dentist.name, isToday: date === today, past: date < today, items };
        })
        : dates.map(day => {
            const items = (data?.byDate?.[day] ?? []).filter(matches);
            return { key: day, title: `${weekdayShort(day)} ${dayOfMonth(day)}`, subtitle: `${day === today ? 'Hoje · ' : ''}${items.length} ${items.length === 1 ? 'consulta' : 'consultas'}`, isToday: day === today, past: day < today, empty: !items.length && data !== undefined, items };
        });
    const hours = hourWindow(visible);
    const next = dates.includes(today) ? findNext(visible, today, nowMinutes) : null;
    const selected = all.find(item => item.id === selectedId) ?? null;

    const actions = useAppointmentActions(changed => query.setData(current => current && ({
        ...current, byDate: { ...current.byDate, [changed.date]: (current.byDate[changed.date] ?? []).map(item => (item.id === changed.id ? changed : item)) },
    })));

    const title = view === 'mes' ? `${monthName(parseDate(date).getMonth() + 1)} de ${parseDate(date).getFullYear()}`
        : view === 'dia' ? (date === today ? `Hoje, ${dateLong(date).split(', ')[1]}` : dateLong(date))
        : rangeLabel(dates[0], dates.at(-1));

    return {
        wide, view, date, today, dentistId, title, loading: query.loading, firstLoad: query.firstLoad, error: query.error, reload: query.reload,
        total: visible.length,
        viewOptions: wide ? [{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }] : [{ value: 'dia', label: 'Dia' }, { value: '3dias', label: '3 dias' }, { value: 'mes', label: 'Mês' }],
        dentistOptions: [{ value: '', label: 'Todos', count: all.length }, ...dentists.map(dentist => ({ value: String(dentist.id), label: firstName(dentist.name), avatar: dentist.name, count: all.filter(item => item.dentistId === dentist.id).length }))],
        columns, byDentist, hours, now: { minutes: nowMinutes }, next, nextLabel: next ? minutesUntil(next, nowMinutes) : '', selected, actions,
        monthCells: view === 'mes' ? monthCells(date).map(cell => ({ ...cell, count: month.data?.[cell.date], isToday: cell.date === today })) : [],
        monthLoading: month.loading,
        newLink: `/agenda/nova?data=${date < today ? today : date}${dentistId ? `&dentista=${dentistId}` : ''}`,
        setView: value => update({ ver: value }),
        setDentist: value => update({ dentista: value }),
        goToday: () => update({ data: '' }),
        shift,
        openDay: day => update({ ver: 'dia', data: day }),
        select: item => update({ consulta: item?.id ?? '' }),
    };
}
