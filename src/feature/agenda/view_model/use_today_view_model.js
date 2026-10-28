import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth, useRepository } from '../../../app/app_provider.jsx';
import { useQuery } from '../../../component/use_query.js';
import { useMediaQuery, useNow } from '../../../component/use_media_query.js';
import { dateLong, firstName, isoDate } from '../../../component/format.js';
import { greeting } from '../../auth/model/auth_model.js';
import { findNext, groupByPeriod, minutesUntil, weekOf } from '../model/agenda_model.js';
import { useAppointmentActions } from './use_appointment_actions.js';

// Tela inicial: a lista do dia no formato de conversas, o próximo paciente e quem ainda não confirmou.
export function useTodayViewModel() {
    const repository = useRepository('agenda');
    const { user } = useAuth();
    const [params, setParams] = useSearchParams();
    const wide = useMediaQuery('(min-width: 1100px)');
    const now = useNow();
    const today = isoDate(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dentistId = params.get('dentista') ?? '';
    const [selectedId, setSelectedId] = useState(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const query = useQuery(`today:${today}`, () => repository.days([today]));
    const all = query.data?.byDate?.[today] ?? [];
    const dentists = query.data?.dentists ?? [];
    const items = all.filter(item => !dentistId || String(item.dentistId) === dentistId);
    const next = findNext(items, today, nowMinutes);
    const selected = items.find(item => item.id === selectedId) ?? (wide ? next ?? items.find(item => item.start >= nowMinutes) ?? items[0] ?? null : null);
    const actions = useAppointmentActions(changed => query.setData(current => current && ({
        ...current, byDate: { ...current.byDate, [today]: current.byDate[today].map(item => (item.id === changed.id ? changed : item)) },
    })));

    return {
        title: `${greeting(now)}, ${firstName(user?.name)}`,
        subtitle: `${dateLong(today)} · ${items.length} ${items.length === 1 ? 'consulta' : 'consultas'}`,
        today, nowMinutes, wide,
        loading: query.firstLoad, error: query.error, reload: query.reload,
        week: weekOf(today),
        groups: groupByPeriod(items),
        pending: items.filter(item => item.status === 'AGENDADO').length,
        next, nextLabel: next ? minutesUntil(next, nowMinutes) : '',
        selected, sheetOpen,
        dentistId,
        dentistOptions: [{ value: '', label: 'Todos', count: all.length }, ...dentists.map(dentist => ({ value: String(dentist.id), label: firstName(dentist.name), avatar: dentist.name, count: all.filter(item => item.dentistId === dentist.id).length }))],
        setDentist: value => setParams(value ? { dentista: value } : {}),
        select(item) {
            setSelectedId(item.id);
            if (!wide)
                setSheetOpen(true);
        },
        closeSheet: () => setSheetOpen(false),
        actions,
        newLink: `/agenda/nova?data=${today}${dentistId ? `&dentista=${dentistId}` : ''}`,
    };
}
