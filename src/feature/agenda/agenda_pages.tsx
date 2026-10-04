import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../component/ui';
import { useResource } from '../../component/use_resource';
import { useUnsaved } from '../../component/use_unsaved';
import { budgetTotal, dateLabel, money, today } from '../../demo/format';
import type { Appointment, AppointmentInput } from '../../demo/model';
import { appointmentInterval, appointmentStatuses } from '../../demo/clinic';
import { useDemo } from '../../demo/store';
import styles from './agenda.module.css';

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const emptyAppointment: AppointmentInput = { patientId: '', doctorId: '', procedure: '', date: '', time: '', duration: 0, observation: '', attendance: '', budgetId: '', status: 'Agendada' };
function parseDate(value: string) { return new Date(`${value}T12:00:00`); }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDate(value).getTime()) && dateKey(parseDate(value)) === value; }
function shiftDate(value: string, days: number) { const date = parseDate(value); date.setDate(date.getDate() + days); return dateKey(date); }
function weekDates(value: string) { const day = parseDate(value).getDay(); const start = shiftDate(value, -(day === 0 ? 6 : day - 1)); return Array.from({ length: 7 }, (_, index) => shiftDate(start, index)); }
function shiftMonth(value: string, months: number) { const date = parseDate(value); const day = date.getDate(); date.setDate(1); date.setMonth(date.getMonth() + months); const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); date.setDate(Math.min(day, last)); return dateKey(date); }
function monthDates(value: string) { const date = parseDate(value); const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); return Array.from({ length: count }, (_, index) => `${value.slice(0, 7)}-${String(index + 1).padStart(2, '0')}`); }
function endTime(appointment: Appointment) { const interval = appointmentInterval(appointment); if (!interval) return 'término não informado'; const end = new Date(interval.end).toISOString(); return end.slice(0, 10) === appointment.date ? end.slice(11, 16) : `${dateLabel(end.slice(0, 10))} às ${end.slice(11, 16)}`; }
function ReadError({ message, retry }: { message: string; retry: () => void }) { return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>; }
function MissingAppointment() { return <><PageHeader title="Consulta não encontrada" /><EmptyState title="Esta consulta não está disponível" detail="Volte à agenda para consultar os agendamentos." action={<ActionLink to="/agenda">Voltar à agenda</ActionLink>} /></>; }

function AppointmentCard({ appointment, search }: { appointment: Appointment; search: string }) {
  const { data } = useDemo();
  const patient = data.patients.find(value => value.id === appointment.patientId);
  const doctor = data.doctors.find(value => value.id === appointment.doctorId);
  return <Link className={`${styles.appointment} ${appointment.status === 'Cancelada' ? styles.cancelled : ''}`} to={`/agenda/${appointment.id}${search}`}>
    <span className={styles.appointmentTime}>{appointment.time}–{endTime(appointment)} · {appointment.duration} min</span>
    <strong>{patient?.name ?? 'Paciente não disponível'}</strong>
    <span>{doctor?.name ?? 'Doutor não disponível'}</span>
    <span>{appointment.procedure}</span>
    <StatusLabel tone={appointment.status === 'Concluída' ? 'success' : appointment.status === 'Faltou' ? 'warning' : 'neutral'}>{appointment.status || 'Status não definido'}</StatusLabel>
  </Link>;
}

export function AgendaPage() {
  const { data } = useDemo();
  const resource = useResource('agenda');
  const [params, setParams] = useSearchParams();
  const [showWeekGrid, setShowWeekGrid] = useState(false);
  const selectedDate = validDate(params.get('date') ?? '') ? params.get('date')! : today();
  const view = params.get('view') === 'month' ? 'month' : 'week';
  const doctorId = data.doctors.some(value => value.id === params.get('doutor')) ? params.get('doutor')! : '';
  const days = view === 'week' ? weekDates(selectedDate) : monthDates(selectedDate);
  const periodAppointments = (data.appointments ?? []).filter(value => days.includes(value.date) && (!doctorId || value.doctorId === doctorId)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const selectedAppointments = periodAppointments.filter(value => value.date === selectedDate);
  const times = [...new Set(periodAppointments.map(value => value.time))].sort();
  const doctorSearch = doctorId ? `&doutor=${doctorId}` : '';
  const search = `?date=${selectedDate}&view=${view}${doctorSearch}`;
  const newAppointment = `/agenda/nova${search}`;
  const monthOffset = (parseDate(days[0]).getDay() + 6) % 7;
  const period = view === 'week' ? `${dateLabel(days[0])} a ${dateLabel(days[6])}` : new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(parseDate(selectedDate));
  function goTo(date: string, nextView = view) { setParams({ date, view: nextView, ...(doctorId ? { doutor: doctorId } : {}) }); }
  return <>
    <PageHeader title="Agenda" description="Escolha uma data para consultar os atendimentos ou agendar uma consulta." action={<ActionLink to={newAppointment}>Agendar consulta</ActionLink>} />
    <div className={styles.toolbar}>
      <div className={styles.periodControls}>
        <div className={styles.navigation}><Button variant="secondary" aria-label={view === 'week' ? 'Semana anterior' : 'Mês anterior'} onClick={() => goTo(view === 'week' ? shiftDate(selectedDate, -7) : shiftMonth(selectedDate, -1))}>←</Button><Button variant="secondary" onClick={() => goTo(today())}>Hoje</Button><Button variant="secondary" aria-label={view === 'week' ? 'Próxima semana' : 'Próximo mês'} onClick={() => goTo(view === 'week' ? shiftDate(selectedDate, 7) : shiftMonth(selectedDate, 1))}>→</Button></div>
        <Field id="agenda_date" label="Ir para a data"><input type="date" value={selectedDate} onChange={event => { if (validDate(event.target.value)) goTo(event.target.value); }} /></Field>
        <Field id="agenda_doctor" label="Filtrar por doutor"><select value={doctorId} onChange={event => setParams({ date: selectedDate, view, ...(event.target.value ? { doutor: event.target.value } : {}) })}><option value="">Todos os doutores</option>{data.doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></Field>
      </div>
      <div className={styles.viewSwitcher} role="group" aria-label="Visão da agenda"><Button variant={view === 'week' ? 'primary' : 'secondary'} aria-pressed={view === 'week'} onClick={() => goTo(selectedDate, 'week')}>Visão semanal</Button><Button variant={view === 'month' ? 'primary' : 'secondary'} aria-pressed={view === 'month'} onClick={() => goTo(selectedDate, 'month')}>Visão mensal</Button></div>
    </div>
    <div className={styles.periodHeading}><h2>{period}</h2>{!resource.busy && !resource.error && <p role="status">{periodAppointments.length} {periodAppointments.length === 1 ? 'consulta' : 'consultas'}</p>}</div>
    {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry} /> : view === 'week' ? <>
      <section className={styles.mobileWeek} aria-labelledby="agenda_mobile_day">
        <div className={styles.weekDayPicker} role="group" aria-label="Escolher dia da semana">{days.map((day, index) => <Button key={day} variant={day === selectedDate ? 'primary' : 'secondary'} aria-pressed={day === selectedDate} aria-label={`Ver consultas de ${dateLabel(day)}`} onClick={() => goTo(day)}>{weekdays[index]} {dateLabel(day).slice(0, 5)}</Button>)}</div>
        <div className={styles.dayHeading}><h2 id="agenda_mobile_day">Consultas de {dateLabel(selectedDate)}</h2><ActionLink variant="secondary" to={newAppointment}>Agendar neste dia</ActionLink></div>
        {selectedAppointments.length ? <div className={styles.dayAppointments}>{selectedAppointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} search={search} />)}</div> : <p className={uiStyles.muted}>Nenhuma consulta cadastrada para este dia.</p>}
        <Button variant="quiet" aria-expanded={showWeekGrid} aria-controls="agenda_week_grid" onClick={() => setShowWeekGrid(value => !value)}>{showWeekGrid ? 'Ocultar grade de horários' : 'Ver grade de horários da semana'}</Button>
      </section>
      <div id="agenda_week_grid" className={`${styles.calendarScroll} ${showWeekGrid ? styles.revealed : ''}`} role="region" aria-label="Agenda semanal, dias e horários" tabIndex={0}>
        <table className={styles.weekTable}><caption className={styles.hidden}>Consultas da semana de {period}. Os horários exibidos correspondem às consultas cadastradas.</caption><thead><tr><th scope="col">Horário</th>{days.map((day, index) => <th scope="col" key={day} className={day === today() ? styles.currentDay : undefined}><Link to={`/agenda/nova?date=${day}&view=week${doctorSearch}`} aria-label={`Agendar em ${dateLabel(day)}`}><span>{weekdays[index]}</span><strong>{dateLabel(day).slice(0, 5)}</strong></Link></th>)}</tr></thead><tbody>{times.length ? times.map(time => <tr key={time}><th scope="row">{time}</th>{days.map(day => {
        const appointments = periodAppointments.filter(value => value.date === day && value.time === time);
        return <td key={day}>{appointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} search={search} />)}<Link className={styles.addSlot} to={`/agenda/nova?date=${day}&time=${time}&view=week${doctorSearch}`} aria-label={`Agendar em ${dateLabel(day)} às ${time}`}>+ Nova consulta</Link></td>;
      })}</tr>) : <tr><td colSpan={8} className={styles.emptyWeek}>Selecione um dia acima ou use “Nova consulta” para informar data, horário e duração.</td></tr>}</tbody></table>
      </div>
      {!periodAppointments.length && <EmptyState title="Nenhuma consulta nesta semana" detail="Cadastre uma consulta para organizar o atendimento da clínica." action={<ActionLink to={newAppointment}>Cadastrar primeira consulta</ActionLink>} />}
    </> : <>
      <section className={styles.monthSection} aria-label="Calendário mensal"><div className={styles.monthWeekdays}>{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className={styles.monthGrid}>{Array.from({ length: monthOffset }, (_, index) => <div key={`empty-${index}`} aria-hidden="true" className={styles.monthSpacer} />)}{days.map(day => {
        const count = periodAppointments.filter(value => value.date === day).length;
        return <button key={day} type="button" className={`${styles.monthDay} ${day === selectedDate ? styles.selectedDay : ''} ${day === today() ? styles.today : ''}`} aria-pressed={day === selectedDate} aria-label={`${dateLabel(day)}, ${count} ${count === 1 ? 'consulta' : 'consultas'}`} onClick={() => goTo(day)}><span>{parseDate(day).getDate()}</span>{count > 0 && <strong>{count}<span className={styles.monthCountText}> {count === 1 ? 'consulta' : 'consultas'}</span></strong>}</button>;
      })}</div></section>
      <section className={styles.daySection} aria-labelledby="agenda_day"><div className={styles.dayHeading}><h2 id="agenda_day">Consultas de {dateLabel(selectedDate)}</h2><ActionLink variant="secondary" to={newAppointment}>Agendar neste dia</ActionLink></div>{selectedAppointments.length ? <div className={styles.dayAppointments}>{selectedAppointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} search={search} />)}</div> : <p className={uiStyles.muted}>Nenhuma consulta cadastrada para este dia.</p>}</section>
    </>}
  </>;
}

export function AppointmentFormPage() { const { id } = useParams(); const { search } = useLocation(); return <AppointmentForm key={`${id ?? 'new'}${search}`} id={id} />; }
function AppointmentForm({ id }: { id?: string }) {
  const { data, saveAppointment } = useDemo();
  const [params] = useSearchParams();
  const resource = useResource(`appointment-form:${id ?? 'new'}`);
  const source = data.appointments?.find(value => value.id === id);
  const [initial] = useState<AppointmentInput>(() => source ? { ...source } : { ...emptyAppointment, patientId: data.patients.some(value => value.id === params.get('paciente')) ? params.get('paciente')! : '', doctorId: data.doctors.some(value => value.id === params.get('doutor')) ? params.get('doutor')! : '', date: validDate(params.get('date') ?? '') ? params.get('date')! : '', time: /^\d{2}:\d{2}$/.test(params.get('time') ?? '') ? params.get('time')! : '' });
  const [fields, setFields] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Appointment | null>(null);
  const [saveError, setSaveError] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof AppointmentInput, string>>>({});
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (saveError) feedbackRef.current?.focus(); }, [saveError]);
  const dirty = !saved && (Object.keys(emptyAppointment) as (keyof AppointmentInput)[]).some(key => fields[key] !== initial[key]);
  useUnsaved(dirty, saving);
  const doctorSearch = params.get('doutor') ? `&doutor=${encodeURIComponent(params.get('doutor')!)}` : '';
  const returnSearch = `?date=${validDate(params.get('date') ?? '') ? params.get('date') : fields.date || today()}&view=${params.get('view') === 'month' ? 'month' : 'week'}${doctorSearch}`;
  const returnTo = id ? `/agenda/${id}${returnSearch}` : `/agenda${returnSearch}`;
  const budgets = data.budgets.filter(value => value.patientId === fields.patientId);
  const conflictError = saveError.includes('nesse intervalo') ? 'Este doutor já tem uma consulta nesse intervalo.' : undefined;
  function change<K extends keyof AppointmentInput>(key: K, value: AppointmentInput[K]) {
    setFields(previous => ({ ...previous, [key]: value, ...(key === 'patientId' && !data.budgets.some(budget => budget.id === previous.budgetId && budget.patientId === value) ? { budgetId: '' } : {}) }));
    setSaveError('');
    setErrors(previous => ({ ...previous, [key]: undefined }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving || saved) return; setSaveError('');
    const nextErrors: Partial<Record<keyof AppointmentInput, string>> = {};
    if (!fields.patientId) nextErrors.patientId = 'Selecione o paciente.';
    if (!fields.doctorId) nextErrors.doctorId = 'Selecione o doutor.';
    if (!fields.procedure) nextErrors.procedure = 'Selecione o procedimento.';
    if (!validDate(fields.date)) nextErrors.date = 'Informe uma data válida.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.time)) nextErrors.time = 'Informe um horário válido.';
    if (!Number.isSafeInteger(fields.duration) || fields.duration <= 0 || (validDate(fields.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(fields.time) && !appointmentInterval(fields))) nextErrors.duration = 'Informe uma duração inteira maior que zero.';
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) { document.getElementById(`appointment_${firstError}`)?.focus(); return; }
    setSaving(true);
    try { setSaved(await saveAppointment(fields, id)); }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.'); }
    finally { setSaving(false); }
  }
  if (saved) return <><PageHeader title={id ? 'Consulta atualizada' : 'Consulta agendada'} /><Feedback tone="success">Consulta de {data.patients.find(value => value.id === saved.patientId)?.name} salva para {dateLabel(saved.date)} às {saved.time}.</Feedback><div className={uiStyles.formActions}><ActionLink to={`/agenda/${saved.id}?date=${saved.date}&view=${params.get('view') === 'month' ? 'month' : 'week'}${doctorSearch}`}>Ver consulta</ActionLink><ActionLink variant="secondary" to={`/agenda?date=${saved.date}&view=${params.get('view') === 'month' ? 'month' : 'week'}${doctorSearch}`}>Voltar à agenda</ActionLink></div></>;
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ReadError message={resource.error} retry={resource.retry} />;
  if (id && !source) return <MissingAppointment />;
  return <>
    <Link className={uiStyles.back} to={returnTo}>← {id ? 'Voltar à consulta' : 'Voltar à agenda'}</Link>
    <PageHeader title={id ? 'Editar consulta' : 'Nova consulta'} />
    <p className={styles.formHint}>{id ? 'Paciente e duração são preservados. Revise os demais dados do atendimento.' : 'Informe paciente, doutor, procedimento, data, horário e duração. A consulta começa como Agendada.'}</p>
    <form onSubmit={submit} noValidate>
      {saveError && <div ref={feedbackRef} tabIndex={-1} className={styles.formFeedback}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      <fieldset className={styles.formSection} disabled={saving}><legend>Agendamento</legend><div className={uiStyles.formGrid}>
        <Field id="appointment_patientId" label="Paciente (obrigatório)" error={errors.patientId}><select required value={fields.patientId} disabled={Boolean(id)} onChange={event => change('patientId', event.target.value)}><option value="">Selecione o paciente</option>{data.patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name} — {patient.code}</option>)}</select></Field>
        <Field id="appointment_doctorId" label="Doutor (obrigatório)" error={errors.doctorId || conflictError}><select required value={fields.doctorId} onChange={event => change('doctorId', event.target.value)}><option value="">Selecione o doutor</option>{data.doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></Field>
        <div className={uiStyles.full}><Field id="appointment_procedure" label="Procedimento (obrigatório)" error={errors.procedure}><select required value={fields.procedure} onChange={event => change('procedure', event.target.value)}><option value="">Selecione o procedimento</option>{data.procedures.map(procedure => <option key={procedure.id} value={procedure.name}>{procedure.name}</option>)}</select></Field></div>
        <Field id="appointment_date" label="Data (obrigatória)" error={errors.date || conflictError}><input required type="date" value={fields.date} onChange={event => change('date', event.target.value)} /></Field>
        <Field id="appointment_time" label="Horário (obrigatório)" error={errors.time || conflictError}><input required type="time" value={fields.time} onChange={event => change('time', event.target.value)} /></Field>
        <Field id="appointment_duration" label="Duração (minutos, obrigatória)" error={errors.duration} hint="Informe a duração deste atendimento."><input required type="number" min="1" step="1" value={fields.duration || ''} disabled={Boolean(id)} onChange={event => change('duration', Number(event.target.value))} /></Field>
        {id && <Field id="appointment_status" label="Status da consulta"><select value={fields.status} onChange={event => change('status', event.target.value as AppointmentInput['status'])}>{appointmentStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select></Field>}
        <Field id="appointment_attendance" label="Forma de atendimento (opcional)"><input value={fields.attendance} onChange={event => change('attendance', event.target.value)} placeholder="Convênio ou particular" /></Field>
        <div className={uiStyles.full}><Field id="appointment_budgetId" label="Orçamento relacionado (opcional)"><select value={fields.budgetId} onChange={event => change('budgetId', event.target.value)}><option value="">Sem orçamento relacionado</option>{budgets.map(budget => <option key={budget.id} value={budget.id}>{budget.code} — {money(budgetTotal(budget.items))}</option>)}</select></Field></div>
        <div className={uiStyles.full}><Field id="appointment_observation" label="Observações (opcional)"><textarea rows={3} value={fields.observation} onChange={event => change('observation', event.target.value)} /></Field></div>
      </div></fieldset>
      <div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Salvando consulta…' : 'Salvar consulta'}</Button><ActionLink variant="secondary" to={returnTo}>Cancelar</ActionLink></div>
    </form>
  </>;
}

export function AppointmentDetailPage() { const { id } = useParams(); return <AppointmentDetail key={id} id={id} />; }
function AppointmentDetail({ id }: { id?: string }) {
  const { search } = useLocation(); const { data, cancelAppointment } = useDemo();
  const resource = useResource(`appointment:${id}`);
  const appointment = data.appointments?.find(value => value.id === id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const cancelFeedback = useRef<HTMLDivElement>(null);
  const cancelHeading = useRef<HTMLHeadingElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (cancelError || cancelled) cancelFeedback.current?.focus(); }, [cancelError, cancelled]);
  useEffect(() => { if (cancelOpen) cancelHeading.current?.focus(); }, [cancelOpen]);
  useUnsaved(cancelOpen && Boolean(reason) && !cancelled, saving);
  async function cancel(event: FormEvent) {
    event.preventDefault(); if (saving || !id) return;
    setCancelError(''); setSaving(true);
    try { await cancelAppointment(id, reason); setCancelled(true); setCancelOpen(false); }
    catch (error) { setCancelError(error instanceof Error ? error.message : 'Não foi possível cancelar. O motivo foi mantido. Tente novamente.'); }
    finally { setSaving(false); }
  }
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ReadError message={resource.error} retry={resource.retry} />;
  if (!appointment) return <MissingAppointment />;
  const patient = data.patients.find(value => value.id === appointment.patientId);
  const doctor = data.doctors.find(value => value.id === appointment.doctorId);
  const budget = data.budgets.find(value => value.id === appointment.budgetId);
  return <>
    <Link className={uiStyles.back} to={`/agenda${search || `?date=${appointment.date}`}`}>← Voltar à agenda</Link>
    <PageHeader eyebrow={`${dateLabel(appointment.date)} · ${appointment.time}`} title={patient ? `Consulta de ${patient.name}` : 'Consulta'} action={<ActionLink to={`/agenda/${appointment.id}/editar${search}`}>Editar consulta</ActionLink>} />
    {cancelled && <div ref={cancelFeedback} tabIndex={-1} className={styles.formFeedback}><Feedback tone="success">Consulta cancelada. O registro e o histórico foram preservados.</Feedback></div>}
    <section className={uiStyles.section} aria-labelledby="appointment_information"><h2 id="appointment_information">Dados da consulta</h2><dl className={uiStyles.definition}>
      <div><dt>Paciente</dt><dd>{patient ? <Link to={`/pacientes/${patient.id}`}>{patient.name}</Link> : 'Paciente não disponível'}</dd></div>
      <div><dt>Doutor responsável</dt><dd>{doctor ? <Link to={`/doutores/${doctor.id}`}>{doctor.name}</Link> : 'Doutor não disponível'}</dd></div>
      <div><dt>Data e horário</dt><dd>{dateLabel(appointment.date)} · {appointment.time}–{endTime(appointment)}</dd></div>
      <div><dt>Duração</dt><dd>{appointment.duration} minutos</dd></div>
      <div><dt>Procedimento</dt><dd>{appointment.procedure}</dd></div>
      <div><dt>Status</dt><dd><StatusLabel tone={appointment.status === 'Concluída' ? 'success' : 'neutral'}>{appointment.status || 'Status não definido'}</StatusLabel></dd></div>
      {appointment.attendance && <div><dt>Forma de atendimento</dt><dd>{appointment.attendance}</dd></div>}
      {appointment.observation && <div className={uiStyles.full}><dt>Observações</dt><dd className={styles.multiline}>{appointment.observation}</dd></div>}
      {appointment.cancelReason && <div className={uiStyles.full}><dt>Motivo do cancelamento</dt><dd className={styles.multiline}>{appointment.cancelReason}</dd></div>}
    </dl></section>
    {budget && <section className={uiStyles.section} aria-labelledby="appointment_budget"><div className={styles.dayHeading}><h2 id="appointment_budget">Orçamento relacionado</h2><ActionLink variant="secondary" to={`/orcamentos/${budget.id}`}>Ver orçamento {budget.code}</ActionLink></div><dl className={uiStyles.definition}><div><dt>Total do orçamento</dt><dd>{money(budgetTotal(budget.items))}</dd></div>{budget.paymentNote && <div><dt>Condições registradas no orçamento</dt><dd>{budget.paymentNote}</dd></div>}</dl></section>}
    {appointment.status !== 'Cancelada' && (cancelOpen ? <section className={uiStyles.section} aria-labelledby="appointment_cancel"><h2 ref={cancelHeading} tabIndex={-1} id="appointment_cancel">Cancelar esta consulta?</h2><p className={styles.formHint}>A consulta continuará disponível no histórico.</p><form onSubmit={cancel}>{cancelError && <div ref={cancelFeedback} tabIndex={-1} className={styles.formFeedback}><Feedback tone="error" title="Não foi possível cancelar">{cancelError}</Feedback></div>}<fieldset className={styles.cancelFields} disabled={saving}><Field id="appointment_cancelReason" label="Motivo do cancelamento (opcional)"><textarea rows={3} value={reason} onChange={event => { setReason(event.target.value); setCancelError(''); }} /></Field><div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Cancelando consulta…' : 'Confirmar cancelamento'}</Button><Button variant="secondary" onClick={() => { setCancelOpen(false); setReason(''); setCancelError(''); requestAnimationFrame(() => cancelButton.current?.focus()); }}>Manter consulta</Button></div></fieldset></form></section> : <div className={styles.cancelAction}><button ref={cancelButton} className={`${uiStyles.button} ${uiStyles.secondary}`} type="button" onClick={() => { setCancelOpen(true); setCancelled(false); }}>Cancelar consulta</button></div>)}
    <section className={uiStyles.section} aria-labelledby="appointment_history"><h2 id="appointment_history">Histórico da consulta</h2><HistoryList entries={appointment.history} /></section>
  </>;
}
