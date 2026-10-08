import { useState, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useResource } from '../../../component/use_resource.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { dateLabel, today } from '../../../demo/format.js';
import { appointmentInterval } from '../../../demo/clinic.js';
import { useClinicData, useClinicRepository } from '../../../app/app_provider.jsx';
import { emptyAppointment, parseDate, validDate, weekDates, monthDates } from '../model/agenda_model.js';
import { calendarHours, fullWeekdays, daySegments, monthCells } from '../model/calendar_model.js';
export function useAppointmentCardViewModel({ appointment }) {
    const { data } = useClinicData();
    const patient = data.patients.find(value => value.id === appointment.patientId);
    const doctor = data.doctors.find(value => value.id === appointment.doctorId);
    return { patient, doctor };
}
export function useAgendaViewModel() {
    const { data } = useClinicData();
    const resource = useResource('agenda');
    const [params, setParams] = useSearchParams();
    const [showWeekGrid, setShowWeekGrid] = useState(false);
    const selectedDate = validDate(params.get('date') ?? '') ? params.get('date') : today();
    const view = params.get('view') === 'month' ? 'month' : 'week';
    const doctorId = data.doctors.some(value => value.id === params.get('doutor')) ? params.get('doutor') : '';
    const days = view === 'week' ? weekDates(selectedDate) : monthDates(selectedDate);
    const filteredAppointments = (data.appointments ?? []).filter(value => !doctorId || value.doctorId === doctorId);
    const selectedAppointments = daySegments(filteredAppointments, selectedDate).map(segment => segment.appointment);
    const calendarDays = days.map((day, index) => ({ date: day, weekday: fullWeekdays[index], segments: daySegments(filteredAppointments, day) }));
    const visibleSegments = calendarDays.flatMap(day => day.segments);
    const periodAppointments = [...new Map(visibleSegments.map(segment => [segment.appointment.id, segment.appointment])).values()].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    const initialHour = visibleSegments.length ? Math.max(0, Math.floor(Math.min(...visibleSegments.map(segment => segment.start)) / 60) - 1) : 8;
    const monthDays = monthCells(selectedDate).map(cell => {
        const events = daySegments(filteredAppointments, cell.date).map(segment => segment.appointment);
        return { ...cell, count: events.length, events: events.slice(0, 3), extra: Math.max(0, events.length - 3) };
    });
    const doctorSearch = doctorId ? `&doutor=${doctorId}` : '';
    const search = `?date=${selectedDate}&view=${view}${doctorSearch}${params.get('pagina') ? `&pagina=${encodeURIComponent(params.get('pagina'))}` : ''}`;
    const newAppointment = `/agenda/nova${search}`;
    const period = view === 'week' ? `${dateLabel(days[0])} a ${dateLabel(days[6])}` : new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(parseDate(selectedDate));
    function goTo(date, nextView = view) { setParams({ date, view: nextView, ...(doctorId ? { doutor: doctorId } : {}) }); }
    return { data, resource, setParams, showWeekGrid, setShowWeekGrid, selectedDate, view, doctorId, days, periodAppointments, selectedAppointments, calendarDays, calendarHours, initialHour, monthDays, doctorSearch, search, newAppointment, period, goTo };
}
export function useAppointmentFormViewModel({ id }) {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { saveAppointment } = useClinicRepository('agenda');
    const [params] = useSearchParams();
    const resource = useResource(`appointment-form:${id ?? 'new'}`);
    const source = data.appointments?.find(value => value.id === id);
    const [initial] = useState(() => source ? { ...source } : { ...emptyAppointment, patientId: data.patients.some(value => value.id === params.get('paciente')) ? params.get('paciente') : '', doctorId: data.doctors.some(value => value.id === params.get('doutor')) ? params.get('doutor') : '', date: validDate(params.get('date') ?? '') ? params.get('date') : '', time: /^\d{2}:\d{2}$/.test(params.get('time') ?? '') ? params.get('time') : '' });
    const [fields, setFields] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    const [saveError, setSaveError] = useState('');
    const [errors, setErrors] = useState({});
    const dirty = !saved && Object.keys(emptyAppointment).some(key => fields[key] !== initial[key]);
    useUnsaved(dirty, saving);
    const doctorSearch = params.get('doutor') ? `&doutor=${encodeURIComponent(params.get('doutor'))}` : '';
    const returnSearch = `?date=${validDate(params.get('date') ?? '') ? params.get('date') : fields.date || today()}&view=${params.get('view') === 'month' ? 'month' : 'week'}${doctorSearch}`;
    const returnTo = id ? `/agenda/${id}${returnSearch}` : `/agenda${returnSearch}`;
    const budgets = data.budgets.filter(value => value.patientId === fields.patientId);
    const conflictError = saveError.includes('nesse intervalo') ? 'Este doutor já tem uma consulta nesse intervalo.' : undefined;
    function change(key, value) {
        setFields(previous => ({ ...previous, [key]: value, ...(key === 'patientId' && !data.budgets.some(budget => budget.id === previous.budgetId && budget.patientId === value) ? { budgetId: '' } : {}) }));
        setSaveError('');
        setErrors(previous => ({ ...previous, [key]: undefined }));
    }
    async function submit() {
        if (submissionLock.current || saving || saved)
            return;
        setSaveError('');
        const nextErrors = {};
        if (!fields.patientId)
            nextErrors.patientId = 'Selecione o paciente.';
        if (!fields.doctorId)
            nextErrors.doctorId = 'Selecione o doutor.';
        if (!fields.procedure)
            nextErrors.procedure = 'Selecione o procedimento.';
        if (!validDate(fields.date))
            nextErrors.date = 'Informe uma data válida.';
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.time))
            nextErrors.time = 'Informe um horário válido.';
        if (!Number.isSafeInteger(fields.duration) || fields.duration <= 0 || (validDate(fields.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(fields.time) && !appointmentInterval(fields)))
            nextErrors.duration = 'Informe uma duração inteira maior que zero.';
        setErrors(nextErrors);
        const firstError = Object.keys(nextErrors)[0];
        if (firstError) {
            return `appointment_${firstError}`;
        }
        submissionLock.current = true;
        setSaving(true);
        try {
            setSaved(await saveAppointment(fields, id));
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    if (saved)
        return { data, params, resource, source, fields, saving, saved, saveError, errors, doctorSearch, returnTo, budgets, conflictError, change, submit };
    if (resource.busy)
        return { data, params, resource, source, fields, saving, saved, saveError, errors, doctorSearch, returnTo, budgets, conflictError, change, submit };
    if (resource.error)
        return { data, params, resource, source, fields, saving, saved, saveError, errors, doctorSearch, returnTo, budgets, conflictError, change, submit };
    if (id && !source)
        return { data, params, resource, source, fields, saving, saved, saveError, errors, doctorSearch, returnTo, budgets, conflictError, change, submit };
    return { data, params, resource, source, fields, saving, saved, saveError, errors, doctorSearch, returnTo, budgets, conflictError, change, submit };
}
export function useAppointmentDetailViewModel({ id }) {
    const submissionLock = useRef(false);
    const { search } = useLocation();
    const { data } = useClinicData();
    const { cancelAppointment } = useClinicRepository('agenda');
    const resource = useResource(`appointment:${id}`);
    const appointment = data.appointments?.find(value => value.id === id);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [cancelError, setCancelError] = useState('');
    const [cancelled, setCancelled] = useState(false);
    useUnsaved(cancelOpen && Boolean(reason) && !cancelled, saving);
    async function cancel() {
        if (submissionLock.current || saving || !id)
            return;
        setCancelError('');
        submissionLock.current = true;
        setSaving(true);
        try {
            await cancelAppointment(id, reason);
            setCancelled(true);
            setCancelOpen(false);
        }
        catch (error) {
            setCancelError(error instanceof Error ? error.message : 'Não foi possível cancelar. O motivo foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    if (resource.busy)
        return { search, resource, appointment, cancelOpen, setCancelOpen, reason, setReason, saving, cancelError, setCancelError, cancelled, setCancelled, cancel };
    if (resource.error)
        return { search, resource, appointment, cancelOpen, setCancelOpen, reason, setReason, saving, cancelError, setCancelError, cancelled, setCancelled, cancel };
    if (!appointment)
        return { search, resource, appointment, cancelOpen, setCancelOpen, reason, setReason, saving, cancelError, setCancelError, cancelled, setCancelled, cancel };
    const patient = data.patients.find(value => value.id === appointment.patientId);
    const doctor = data.doctors.find(value => value.id === appointment.doctorId);
    const budget = data.budgets.find(value => value.id === appointment.budgetId);
    return { search, resource, appointment, cancelOpen, setCancelOpen, reason, setReason, saving, cancelError, setCancelError, cancelled, setCancelled, cancel, patient, doctor, budget };
}
