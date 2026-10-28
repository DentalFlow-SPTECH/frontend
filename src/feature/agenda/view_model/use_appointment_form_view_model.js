import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useRepository } from '../../../app/app_provider.jsx';
import { useQuery } from '../../../component/use_query.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { useToast } from '../../../component/ui/index.js';
import { clock, dateLong, dateShort, digits, firstName, isoDate, minutesOf, normalizeText, weekdayShort } from '../../../component/format.js';
import { conflictsWith, defaultDuration, emptyAppointmentForm, formFromAppointment, periodOf, validateAppointment } from '../model/agenda_model.js';

const slotStart = 7 * 60;
const slotEnd = 20 * 60;

export function useAppointmentFormViewModel() {
    const repository = useRepository('agenda');
    const toast = useToast();
    const navigate = useNavigate();
    const { id } = useParams();
    const [params] = useSearchParams();
    const editing = Boolean(id);
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});
    const [failure, setFailure] = useState('');
    const [busy, setBusy] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [search, setSearch] = useState('');

    const source = useQuery(`appointment-form:${id ?? 'new'}`, async () => {
        const data = editing ? await repository.get(Number(id)) : await repository.references();
        return data;
    });
    const initial = source.data ? (editing ? formFromAppointment(source.data.appointment) : emptyAppointmentForm({
        date: params.get('data') ?? isoDate(new Date()), time: params.get('hora') ?? '', dentistId: params.get('dentista') ?? '', patientId: params.get('paciente') ?? '',
    })) : null;
    const current = form ?? initial;
    const day = useQuery(`appointment-day:${current?.date ?? ''}`, () => (current?.date ? repository.days([current.date]) : Promise.resolve(null)));
    useUnsaved(dirty && !busy);

    const patients = source.data?.patients ?? [];
    const dentists = source.data?.dentists ?? [];
    const procedures = source.data?.procedures ?? [];
    const patient = patients.find(item => String(item.id) === current?.patientId) ?? null;
    const procedure = procedures.find(item => String(item.id) === current?.procedureId) ?? null;
    const dentist = dentists.find(item => String(item.id) === current?.dentistId) ?? null;
    const duration = procedure?.durationMinutes || defaultDuration;
    const dayItems = day.data?.byDate?.[current?.date] ?? [];
    const candidate = current?.time && current?.dentistId ? { id: editing ? Number(id) : -1, dentistId: Number(current.dentistId), start: minutesOf(current.time), end: minutesOf(current.time) + duration } : null;
    const conflicts = candidate ? conflictsWith(dayItems, candidate) : [];

    // Horários livres do dentista no dia, de 30 em 30 minutos, considerando a duração do procedimento.
    const busyRanges = current?.dentistId ? dayItems.filter(item => String(item.dentistId) === current.dentistId && !['CANCELADO', 'FALTOU'].includes(item.status) && item.id !== Number(id)) : [];
    const todayIso = isoDate(new Date());
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const freeSlots = [];
    if (current?.dentistId && current?.date && !day.loading) {
        for (let start = slotStart; start + duration <= slotEnd; start += 30) {
            if (current.date === todayIso && start < nowMinutes)
                continue;
            if (start >= 12 * 60 && start < 13 * 60)
                continue;
            if (!busyRanges.some(item => item.start < start + duration && start < item.end))
                freeSlots.push(clock(start));
        }
    }

    const term = normalizeText(search);
    const termDigits = digits(search);
    const patientResults = term
        ? patients.filter(item => normalizeText(item.name).includes(term) || (termDigits.length >= 3 && (digits(item.cpf).includes(termDigits) || digits(item.phone).includes(termDigits)))).slice(0, 8)
        : [];

    function change(field, value) {
        setForm({ ...current, [field]: value });
        setErrors(found => ({ ...found, [field]: undefined }));
        setFailure('');
        setDirty(true);
    }

    async function submit() {
        const found = validateAppointment(current);
        setErrors(found);
        if (Object.keys(found).length)
            return;
        setBusy(true);
        setFailure('');
        try {
            const saved = editing ? await repository.update(Number(id), current, source.data.appointment) : await repository.create(current);
            setDirty(false);
            toast({ title: editing ? 'Consulta remarcada' : 'Consulta agendada', description: `${firstName(patient?.name)} · ${current.date.split('-').reverse().join('/')} às ${current.time}` });
            navigate(`/agenda?ver=dia&data=${current.date}&consulta=${saved.id}`);
        }
        catch (error) {
            setFailure(error.message);
        }
        finally {
            setBusy(false);
        }
    }

    // Horários livres agrupados por período (Manhã, Tarde, Noite), para a lista não ficar enorme no celular.
    const slotGroups = [];
    for (const time of freeSlots) {
        const title = periodOf(minutesOf(time));
        if (slotGroups.at(-1)?.title !== title)
            slotGroups.push({ title, times: [] });
        slotGroups.at(-1).times.push(time);
    }
    const start = current?.time ? minutesOf(current.time) : null;
    const summary = current ? {
        patient: patient?.name ?? null,
        dentist: dentist?.name ?? null,
        procedure: procedure ? `${procedure.name} · ${duration} min${procedure.price ? ` · ${procedure.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}` : null,
        when: current.date ? `${dateLong(current.date)}${start !== null ? ` · ${current.time} às ${clock(start + duration)}` : ''}` : null,
        short: current.date ? `${weekdayShort(current.date)} ${dateShort(current.date).slice(0, 5)} · ${current.time || '--:--'} · ${duration} min` : '',
    } : null;

    return {
        editing, loading: source.firstLoad, error: source.error, reload: source.reload, dentist, slotGroups, summary,
        form: current, errors, failure, busy,
        patients, dentists, procedures, patient, procedure, duration,
        search, setSearch, patientResults,
        freeSlots, slotsLoading: day.loading, conflicts,
        dentistOptions: dentists.map(dentist => ({ value: String(dentist.id), label: firstName(dentist.name), avatar: dentist.name })),
        change, submit,
        choosePatient: item => { change('patientId', String(item.id)); setSearch(''); },
        clearPatient: () => change('patientId', ''),
        cancelLink: editing ? `/agenda?ver=dia&data=${initial?.date ?? ''}&consulta=${id}` : '/agenda',
    };
}
