import { useState, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useResource } from '../../../component/use_resource.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { dateLabel, today } from '../../../demo/format.js';
import { appointmentInterval, appointmentStatuses, attendanceOptions, canFinalize, clinicLabel, lockedReport, matchesClinic, withoutClinic } from '../../../demo/clinic.js';
import { useClinicData, useClinicRepository } from '../../../app/app_provider.jsx';
import { emptyAppointment, emptyCompletion, legacyAttendance, minuteLabel, parseDate, validDate, weekDates, monthDates } from '../model/agenda_model.js';
import { calendarHours, fullWeekdays, daySegments, hourBlocks, overlapBlocks, monthCells } from '../model/calendar_model.js';
function clinicContext(data, value) { return value === withoutClinic || data.clinics.some(clinic => clinic.id === value) ? value : ''; }
export function useAppointmentCardViewModel({ appointment }) {
    const { data } = useClinicData();
    const patient = data.patients.find(value => value.id === appointment.patientId);
    const doctor = data.doctors.find(value => value.id === appointment.doctorId);
    const clinic = appointment.clinicId || data.clinics.length ? clinicLabel(data.clinics, appointment.clinicId) : '';
    // O atalho da lista aparece para consultas em atendimento ou de datas já alcançadas; o detalhe oferece a ação completa.
    const quickFinalize = canFinalize(appointment) && (appointment.status === 'Em atendimento' || appointment.date <= today());
    return { patient, doctor, clinic, quickFinalize };
}
export function useAgendaViewModel() {
    const { data } = useClinicData();
    const resource = useResource('agenda');
    const [params, setParams] = useSearchParams();
    // Em telas estreitas a lista do dia e o calendário alternam na mesma área.
    const [area, setArea] = useState('list');
    const selectedDate = validDate(params.get('date') ?? '') ? params.get('date') : today();
    const view = params.get('view') === 'month' ? 'month' : 'week';
    const doctorId = data.doctors.some(value => value.id === params.get('doutor')) ? params.get('doutor') : '';
    const clinicId = clinicContext(data, params.get('clinica'));
    const days = view === 'week' ? weekDates(selectedDate) : monthDates(selectedDate);
    const filteredAppointments = (data.appointments ?? []).filter(value => (!doctorId || value.doctorId === doctorId) && matchesClinic(value, clinicId));
    const daySelected = daySegments(filteredAppointments, selectedDate);
    const range = /^(\d{1,4})-(\d{1,4})$/.exec(params.get('faixa') ?? '');
    const slot = range && Number(range[1]) < Number(range[2]) && Number(range[2]) <= 1440 ? { start: Number(range[1]), end: Number(range[2]) } : null;
    const slotSegments = slot ? daySelected.filter(segment => segment.start >= slot.start && segment.start < slot.end) : [];
    const activeSlot = slotSegments.length ? slot : null;
    const selectedAppointments = (activeSlot ? slotSegments : daySelected).map(segment => segment.appointment);
    // Sem doutor escolhido a semana mostra contagens por horário; com doutor, cartões proporcionais à duração.
    const grouped = !doctorId;
    const calendarDays = days.map((day, index) => {
        const segments = daySegments(filteredAppointments, day);
        return { date: day, weekday: fullWeekdays[index], count: segments.length, segments, blocks: grouped ? hourBlocks(segments) : overlapBlocks(segments) };
    });
    const visibleSegments = calendarDays.flatMap(day => day.segments);
    const periodAppointments = [...new Map(visibleSegments.map(segment => [segment.appointment.id, segment.appointment])).values()].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    const initialHour = visibleSegments.length ? Math.max(0, Math.floor(Math.min(...visibleSegments.map(segment => segment.start)) / 60) - 1) : 8;
    const monthDays = monthCells(selectedDate).map(cell => {
        const events = daySegments(filteredAppointments, cell.date).map(segment => segment.appointment);
        return { ...cell, count: events.length, events: events.slice(0, 3), extra: Math.max(0, events.length - 3) };
    });
    const context = `${doctorId ? `&doutor=${doctorId}` : ''}${clinicId ? `&clinica=${clinicId}` : ''}`;
    const dayPath = `/agenda?date=${selectedDate}&view=${view}${context}`;
    const search = `?date=${selectedDate}&view=${view}${context}${activeSlot ? `&faixa=${activeSlot.start}-${activeSlot.end}` : ''}${params.get('pagina') ? `&pagina=${encodeURIComponent(params.get('pagina'))}` : ''}`;
    const newAppointment = `/agenda/nova?date=${selectedDate}&view=${view}${context}${activeSlot ? `&time=${minuteLabel(activeSlot.start)}` : ''}`;
    const period = view === 'week' ? `${dateLabel(days[0])} a ${dateLabel(days[6])}` : new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(parseDate(selectedDate));
    const base = { ...(doctorId ? { doutor: doctorId } : {}), ...(clinicId ? { clinica: clinicId } : {}) };
    function goTo(date, nextView = view) { setParams({ date, view: nextView, ...base }); }
    function filterDoctor(value) { setParams({ date: selectedDate, view, ...(value ? { doutor: value } : {}), ...(clinicId ? { clinica: clinicId } : {}) }); }
    function filterClinic(value) { setParams({ date: selectedDate, view, ...(doctorId ? { doutor: doctorId } : {}), ...(value ? { clinica: value } : {}) }); }
    function slotPath(date, block) { return `/agenda?date=${date}&view=${view}${context}&faixa=${block.start}-${block.end}`; }
    const clinicOptions = data.clinics.length ? [...data.clinics.map(clinic => ({ value: clinic.id, label: clinic.name })), ...(data.appointments.some(value => !value.clinicId) ? [{ value: withoutClinic, label: 'Sem clínica' }] : [])] : [];
    return { data, resource, area, setArea, selectedDate, view, doctorId, clinicId, clinicOptions, days, periodAppointments, selectedAppointments, dayTotal: daySelected.length, activeSlot, calendarDays, calendarHours, grouped, initialHour, monthDays, context, dayPath, search, newAppointment, period, goTo, filterDoctor, filterClinic, slotPath };
}
export function useAppointmentFormViewModel({ id }) {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { saveAppointment } = useClinicRepository('agenda');
    const [params] = useSearchParams();
    const resource = useResource(`appointment-form:${id ?? 'new'}`);
    const source = data.appointments?.find(value => value.id === id);
    // Consultas anteriores guardam o procedimento pelo nome; o ID é localizado no catálogo sem alterar o registro até salvar.
    const [initial] = useState(() => source ? { ...emptyAppointment, ...source, procedureId: source.procedureId || (data.procedures.find(value => value.name === source.procedure)?.id ?? '') } : { ...emptyAppointment, patientId: data.patients.some(value => value.id === params.get('paciente')) ? params.get('paciente') : '', doctorId: data.doctors.some(value => value.id === params.get('doutor')) ? params.get('doutor') : '', clinicId: data.clinics.some(value => value.id === params.get('clinica')) ? params.get('clinica') : data.clinics.length === 1 ? data.clinics[0].id : '', date: validDate(params.get('date') ?? '') ? params.get('date') : '', time: /^\d{2}:\d{2}$/.test(params.get('time') ?? '') ? params.get('time') : '' });
    const [fields, setFields] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    const [saveError, setSaveError] = useState('');
    const [errors, setErrors] = useState({});
    const dirty = !saved && Object.keys(emptyAppointment).some(key => fields[key] !== initial[key]);
    useUnsaved(dirty, saving);
    const doctorSearch = `${params.get('doutor') ? `&doutor=${encodeURIComponent(params.get('doutor'))}` : ''}${params.get('clinica') ? `&clinica=${encodeURIComponent(params.get('clinica'))}` : ''}`;
    const returnSearch = `?date=${validDate(params.get('date') ?? '') ? params.get('date') : fields.date || today()}&view=${params.get('view') === 'month' ? 'month' : 'week'}${doctorSearch}`;
    const returnTo = id ? `/agenda/${id}${returnSearch}` : `/agenda${returnSearch}`;
    const budgets = data.budgets.filter(value => value.patientId === fields.patientId);
    const patient = data.patients.find(value => value.id === fields.patientId);
    const conflictError = saveError.includes('nesse intervalo') ? 'Este doutor já tem uma consulta nesse intervalo.' : undefined;
    const statuses = appointmentStatuses.filter(status => status !== 'Concluída' || source?.status === 'Concluída');
    const clinicOptional = Boolean(source) && !source.clinicId;
    function change(key, value) {
        setFields(previous => ({
            ...previous, [key]: value,
            ...(key === 'patientId' && !data.budgets.some(budget => budget.id === previous.budgetId && budget.patientId === value) ? { budgetId: '' } : {}),
            ...(key === 'procedureId' ? { procedure: data.procedures.find(procedure => procedure.id === value)?.name ?? '' } : {}),
            // O convênio do cadastro do paciente é apenas uma sugestão editável.
            ...(key === 'attendance' && value === 'Convênio' && !previous.insurance ? { insurance: data.patients.find(candidate => candidate.id === previous.patientId)?.insurance ?? '' } : {}),
        }));
        setSaveError('');
        setErrors(previous => ({ ...previous, [key === 'procedureId' ? 'procedure' : key]: undefined }));
    }
    async function submit() {
        if (submissionLock.current || saving || saved)
            return;
        setSaveError('');
        const nextErrors = {};
        if (data.clinics.length && !fields.clinicId && !clinicOptional)
            nextErrors.clinicId = 'Selecione a clínica.';
        if (!fields.patientId)
            nextErrors.patientId = 'Selecione o paciente.';
        if (!fields.doctorId)
            nextErrors.doctorId = 'Selecione o doutor.';
        if (!fields.procedureId && !(source && fields.procedure && fields.procedure === source.procedure))
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
    return { data, params, resource, source, fields, saving, saved, saveError, errors, doctorSearch, returnTo, budgets, patient, statuses, clinicOptional, legacy: legacyAttendance(fields.attendance), conflictError, change, submit };
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
    if (resource.busy || resource.error || !appointment)
        return { search, resource, appointment, cancelOpen, setCancelOpen, reason, setReason, saving, cancelError, setCancelError, cancelled, setCancelled, cancel };
    const patient = data.patients.find(value => value.id === appointment.patientId);
    const doctor = data.doctors.find(value => value.id === appointment.doctorId);
    const budget = data.budgets.find(value => value.id === appointment.budgetId);
    const clinic = appointment.clinicId || data.clinics.length ? clinicLabel(data.clinics, appointment.clinicId) : '';
    return { search, resource, appointment, cancelOpen, setCancelOpen, reason, setReason, saving, cancelError, setCancelError, cancelled, setCancelled, cancel, patient, doctor, budget, clinic, finalizable: canFinalize(appointment), reportLocked: Boolean(lockedReport(data.dailyReports, appointment.id)) };
}
// Procedimentos agendados e previstos no orçamento são sugestões: só entra no registro o que for incluído como realizado.
export function useFinalizationViewModel({ id }) {
    const submissionLock = useRef(false);
    const { search } = useLocation();
    const { data } = useClinicData();
    const { finalizeAppointment } = useClinicRepository('agenda');
    const resource = useResource(`finalization:${id}`);
    const appointment = data.appointments?.find(value => value.id === id);
    const patient = data.patients.find(value => value.id === appointment?.patientId);
    const doctor = data.doctors.find(value => value.id === appointment?.doctorId);
    const budget = data.budgets.find(value => value.id === appointment?.budgetId);
    const scheduled = appointment ? data.procedures.find(value => value.id === appointment.procedureId) ?? data.procedures.find(value => value.name === appointment.procedure) : undefined;
    const [correction] = useState(() => Boolean(appointment?.completion));
    const [initial] = useState(() => {
        const completion = appointment?.completion;
        if (completion)
            return { fields: { attendance: completion.attendance, insurance: completion.insurance, observation: completion.observation, pendingGuide: completion.pendingGuide }, items: completion.items.map(item => ({ key: item.id, id: item.id, procedureId: item.procedureId, name: item.procedure, quantity: String(item.quantity), tooth: item.tooth, region: item.region, origin: item.origin, conferred: Boolean(item.claim) })) };
        const attendance = attendanceOptions.includes(appointment?.attendance) ? appointment.attendance : '';
        return { fields: { ...emptyCompletion, attendance, insurance: attendance === 'Convênio' ? appointment.insurance || patient?.insurance || '' : '' }, items: scheduled ? [{ key: 'agendado', id: '', procedureId: scheduled.id, name: scheduled.name, quantity: '1', tooth: '', region: '', origin: 'Agendado' }] : [] };
    });
    const [fields, setFields] = useState(initial.fields);
    const [items, setItems] = useState(initial.items);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    const [saveError, setSaveError] = useState('');
    const dirty = !saved && (JSON.stringify(fields) !== JSON.stringify(initial.fields) || JSON.stringify(items) !== JSON.stringify(initial.items));
    useUnsaved(dirty, saving);
    const planned = [
        ...(scheduled ? [{ key: 'agendado', group: 'Agendado nesta consulta', name: scheduled.name, procedureId: scheduled.id, origin: 'Agendado', quantity: '1', tooth: '', region: '' }] : []),
        ...(budget?.items ?? []).map(item => ({ key: `orcamento:${item.id}`, group: `Orçamento ${budget.code}`, name: item.procedure, procedureId: data.procedures.find(value => value.name === item.procedure)?.id ?? '', origin: `Orçamento ${budget.code}`, quantity: String(item.quantity), tooth: item.tooth ?? '', region: item.surface ?? '' })),
    ].map(value => ({ ...value, included: items.some(item => item.origin === value.origin && item.procedureId === value.procedureId) }));
    function changeField(key, value) {
        setFields(previous => ({ ...previous, [key]: value, ...(key === 'attendance' && value === 'Convênio' && !previous.insurance ? { insurance: patient?.insurance ?? '' } : {}) }));
        setSaveError('');
    }
    function changeItem(key, patch, errorKey) {
        setItems(previous => previous.map(item => item.key === key ? { ...item, ...patch, ...(patch.procedureId ? { name: data.procedures.find(value => value.id === patch.procedureId)?.name ?? item.name } : {}) } : item));
        setSaveError('');
        if (errorKey)
            setErrors(previous => ({ ...previous, [errorKey]: undefined }));
    }
    function addItem(source) {
        const key = crypto.randomUUID();
        setItems(previous => [...previous, { key, id: '', procedureId: source.procedureId, name: data.procedures.find(value => value.id === source.procedureId)?.name ?? '', quantity: source.quantity ?? '1', tooth: source.tooth ?? '', region: source.region ?? '', origin: source.origin ?? 'No atendimento' }]);
        setSaveError('');
        setErrors(previous => ({ ...previous, finalization_items: undefined }));
        return `item_${key}_quantity`;
    }
    function removeItem(key) {
        setItems(previous => previous.filter(item => item.key !== key));
        setErrors(previous => Object.fromEntries(Object.entries(previous).filter(([name]) => !name.startsWith(`item_${key}_`))));
        setSaveError('');
        return 'finalization_items';
    }
    async function submit() {
        if (submissionLock.current || saving || saved)
            return;
        setSaveError('');
        const nextErrors = {};
        if (!items.length)
            nextErrors.finalization_items = 'Inclua ao menos um procedimento realizado.';
        for (const item of items) {
            if (!item.procedureId)
                nextErrors[`item_${item.key}_procedure`] = 'Escolha o procedimento.';
            if (!/^\d+$/.test(item.quantity.trim()) || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0)
                nextErrors[`item_${item.key}_quantity`] = 'Informe uma quantidade inteira maior que zero.';
        }
        setErrors(nextErrors);
        const firstError = Object.keys(nextErrors)[0];
        if (firstError)
            return firstError;
        submissionLock.current = true;
        setSaving(true);
        try {
            setSaved(await finalizeAppointment(id, { ...fields, items: items.map(item => ({ id: item.id, procedureId: item.procedureId, quantity: Number(item.quantity), tooth: item.tooth, region: item.region, origin: item.origin })) }, correction));
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível finalizar. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    const clinic = appointment && (appointment.clinicId || data.clinics.length) ? clinicLabel(data.clinics, appointment.clinicId) : '';
    const blocked = !appointment ? '' : appointment.status === 'Cancelada' || appointment.status === 'Faltou' ? 'Consultas canceladas ou com falta não recebem procedimentos realizados.' : correction && lockedReport(data.dailyReports, appointment.id) && !saved ? 'O relatório diário desta consulta já foi enviado. Para alterar os procedimentos, o relatório precisa ser devolvido para correção.' : '';
    return { data, search, resource, appointment, patient, doctor, clinic, budget, correction, blocked, legacy: legacyAttendance(appointment?.attendance ?? ''), fields, items, planned, errors, saving, saved, saveError, dirty, changeField, changeItem, addItem, removeItem, submit };
}
