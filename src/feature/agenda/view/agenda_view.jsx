import { useEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../../component/ui.jsx';
import { budgetTotal, dateLabel, money, today } from '../../../demo/format.js';
import { appointmentStatuses } from '../../../demo/clinic.js';
import styles from './agenda.module.css';
import { weekdays, parseDate, validDate, shiftDate, shiftMonth, endTime } from '../model/agenda_model.js';
import { useAppointmentCardViewModel, useAgendaViewModel, useAppointmentFormViewModel, useAppointmentDetailViewModel } from '../view_model/use_agenda_view_model.js';
function ReadError({ message, retry }) { return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>; }
function MissingAppointment() { return <><PageHeader title="Consulta não encontrada"/><EmptyState title="Esta consulta não está disponível" detail="Volte à agenda para consultar os agendamentos." action={<ActionLink to="/agenda">Voltar à agenda</ActionLink>}/></>; }
function AppointmentCard({ appointment, search }) {
    const { patient, doctor } = useAppointmentCardViewModel({ appointment, search });
    return <Link className={`${styles.appointment} ${appointment.status === 'Cancelada' ? styles.cancelled : ''}`} to={`/agenda/${appointment.id}${search}`}>
    <span className={styles.appointmentTime}>{appointment.time}–{endTime(appointment)} · {appointment.duration} min</span>
    <strong>{patient?.name ?? 'Paciente não disponível'}</strong>
    <span>{doctor?.name ?? 'Doutor não disponível'}</span>
    <span>{appointment.procedure}</span>
    <StatusLabel tone={appointment.status === 'Concluída' ? 'success' : appointment.status === 'Faltou' ? 'warning' : 'neutral'}>{appointment.status || 'Status não definido'}</StatusLabel>
  </Link>;
}
export function AgendaPage() {
    const { data, resource, setParams, showWeekGrid, setShowWeekGrid, selectedDate, view, doctorId, days, periodAppointments, selectedAppointments, times, doctorSearch, search, newAppointment, monthOffset, period, goTo } = useAgendaViewModel();
    return <>
    <PageHeader title="Agenda" description="Escolha uma data para consultar os atendimentos ou agendar uma consulta." action={<ActionLink to={newAppointment}>Agendar consulta</ActionLink>}/>
    <div className={styles.toolbar}>
      <div className={styles.periodControls}>
        <div className={styles.navigation}><Button variant="secondary" aria-label={view === 'week' ? 'Semana anterior' : 'Mês anterior'} onClick={() => goTo(view === 'week' ? shiftDate(selectedDate, -7) : shiftMonth(selectedDate, -1))}>←</Button><Button variant="secondary" onClick={() => goTo(today())}>Hoje</Button><Button variant="secondary" aria-label={view === 'week' ? 'Próxima semana' : 'Próximo mês'} onClick={() => goTo(view === 'week' ? shiftDate(selectedDate, 7) : shiftMonth(selectedDate, 1))}>→</Button></div>
        <Field id="agenda_date" label="Ir para a data"><input type="date" value={selectedDate} onChange={event => {
            if (validDate(event.target.value))
                goTo(event.target.value);
        }}/></Field>
        <Field id="agenda_doctor" label="Filtrar por doutor"><select value={doctorId} onChange={event => setParams({ date: selectedDate, view, ...(event.target.value ? { doutor: event.target.value } : {}) })}><option value="">Todos os doutores</option>{data.doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></Field>
      </div>
      <div className={styles.viewSwitcher} role="group" aria-label="Visão da agenda"><Button variant={view === 'week' ? 'primary' : 'secondary'} aria-pressed={view === 'week'} onClick={() => goTo(selectedDate, 'week')}>Visão semanal</Button><Button variant={view === 'month' ? 'primary' : 'secondary'} aria-pressed={view === 'month'} onClick={() => goTo(selectedDate, 'month')}>Visão mensal</Button></div>
    </div>
    <div className={styles.periodHeading}><h2>{period}</h2>{!resource.busy && !resource.error && <p role="status">{periodAppointments.length} {periodAppointments.length === 1 ? 'consulta' : 'consultas'}</p>}</div>
    {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : view === 'week' ? <>
      <section className={styles.mobileWeek} aria-labelledby="agenda_mobile_day">
        <div className={styles.weekDayPicker} role="group" aria-label="Escolher dia da semana">{days.map((day, index) => <Button key={day} variant={day === selectedDate ? 'primary' : 'secondary'} aria-pressed={day === selectedDate} aria-label={`Ver consultas de ${dateLabel(day)}`} onClick={() => goTo(day)}>{weekdays[index]} {dateLabel(day).slice(0, 5)}</Button>)}</div>
        <div className={styles.dayHeading}><h2 id="agenda_mobile_day">Consultas de {dateLabel(selectedDate)}</h2><ActionLink variant="secondary" to={newAppointment}>Agendar neste dia</ActionLink></div>
        {selectedAppointments.length ? <div className={styles.dayAppointments}>{selectedAppointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} search={search}/>)}</div> : <p className={uiStyles.muted}>Nenhuma consulta cadastrada para este dia.</p>}
        <Button variant="quiet" aria-expanded={showWeekGrid} aria-controls="agenda_week_grid" onClick={() => setShowWeekGrid(value => !value)}>{showWeekGrid ? 'Ocultar grade de horários' : 'Ver grade de horários da semana'}</Button>
      </section>
      <div id="agenda_week_grid" className={`${styles.calendarScroll} ${showWeekGrid ? styles.revealed : ''}`} role="region" aria-label="Agenda semanal, dias e horários" tabIndex={0}>
        <table className={styles.weekTable}><caption className={styles.hidden}>Consultas da semana de {period}. Os horários exibidos correspondem às consultas cadastradas.</caption><thead><tr><th scope="col">Horário</th>{days.map((day, index) => <th scope="col" key={day} className={day === today() ? styles.currentDay : undefined}><Link to={`/agenda/nova?date=${day}&view=week${doctorSearch}`} aria-label={`Agendar em ${dateLabel(day)}`}><span>{weekdays[index]}</span><strong>{dateLabel(day).slice(0, 5)}</strong></Link></th>)}</tr></thead><tbody>{times.length ? times.map(time => <tr key={time}><th scope="row">{time}</th>{days.map(day => {
                    const appointments = periodAppointments.filter(value => value.date === day && value.time === time);
                    return <td key={day}>{appointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} search={search}/>)}<Link className={styles.addSlot} to={`/agenda/nova?date=${day}&time=${time}&view=week${doctorSearch}`} aria-label={`Agendar em ${dateLabel(day)} às ${time}`}>+ Nova consulta</Link></td>;
                })}</tr>) : <tr><td colSpan={8} className={styles.emptyWeek}>Selecione um dia acima ou use “Nova consulta” para informar data, horário e duração.</td></tr>}</tbody></table>
      </div>
      {!periodAppointments.length && <EmptyState title="Nenhuma consulta nesta semana" detail="Cadastre uma consulta para organizar o atendimento da clínica." action={<ActionLink to={newAppointment}>Cadastrar primeira consulta</ActionLink>}/>}
    </> : <>
      <section className={styles.monthSection} aria-label="Calendário mensal"><div className={styles.monthWeekdays}>{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className={styles.monthGrid}>{Array.from({ length: monthOffset }, (_, index) => <div key={`empty-${index}`} aria-hidden="true" className={styles.monthSpacer}/>)}{days.map(day => {
                const count = periodAppointments.filter(value => value.date === day).length;
                return <button key={day} type="button" className={`${styles.monthDay} ${day === selectedDate ? styles.selectedDay : ''} ${day === today() ? styles.today : ''}`} aria-pressed={day === selectedDate} aria-label={`${dateLabel(day)}, ${count} ${count === 1 ? 'consulta' : 'consultas'}`} onClick={() => goTo(day)}><span>{parseDate(day).getDate()}</span>{count > 0 && <strong>{count}<span className={styles.monthCountText}> {count === 1 ? 'consulta' : 'consultas'}</span></strong>}</button>;
            })}</div></section>
      <section className={styles.daySection} aria-labelledby="agenda_day"><div className={styles.dayHeading}><h2 id="agenda_day">Consultas de {dateLabel(selectedDate)}</h2><ActionLink variant="secondary" to={newAppointment}>Agendar neste dia</ActionLink></div>{selectedAppointments.length ? <div className={styles.dayAppointments}>{selectedAppointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} search={search}/>)}</div> : <p className={uiStyles.muted}>Nenhuma consulta cadastrada para este dia.</p>}</section>
    </>}
  </>;
}
export function AppointmentFormPage() { const { id } = useParams(); const { search } = useLocation(); return <AppointmentForm key={`${id ?? 'new'}${search}`} id={id}/>; }
function AppointmentForm({ id }) {
    const { data, params, resource, source, fields, saving, saved, saveError, errors, doctorSearch, returnTo, budgets, conflictError, change, submit } = useAppointmentFormViewModel({ id });
    async function handleSubmit(event) { event.preventDefault(); const target = await submit(); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    const feedbackRef = useRef(null);
    useEffect(() => {
        if (saveError)
            feedbackRef.current?.focus();
    }, [saveError]);
    if (saved)
        return <><PageHeader title={id ? 'Consulta atualizada' : 'Consulta agendada'}/><Feedback tone="success">Consulta de {data.patients.find(value => value.id === saved.patientId)?.name} salva para {dateLabel(saved.date)} às {saved.time}.</Feedback><div className={uiStyles.formActions}><ActionLink to={`/agenda/${saved.id}?date=${saved.date}&view=${params.get('view') === 'month' ? 'month' : 'week'}${doctorSearch}`}>Ver consulta</ActionLink><ActionLink variant="secondary" to={`/agenda?date=${saved.date}&view=${params.get('view') === 'month' ? 'month' : 'week'}${doctorSearch}`}>Voltar à agenda</ActionLink></div></>;
    if (resource.busy)
        return <LoadingState />;
    if (resource.error)
        return <ReadError message={resource.error} retry={resource.retry}/>;
    if (id && !source)
        return <MissingAppointment />;
    return <>
    <Link className={uiStyles.back} to={returnTo}>← {id ? 'Voltar à consulta' : 'Voltar à agenda'}</Link>
    <PageHeader title={id ? 'Editar consulta' : 'Nova consulta'}/>
    <p className={styles.formHint}>{id ? 'Paciente e duração são preservados. Revise os demais dados do atendimento.' : 'Informe paciente, doutor, procedimento, data, horário e duração. A consulta começa como Agendada.'}</p>
    <form onSubmit={handleSubmit} noValidate>
      {saveError && <div ref={feedbackRef} tabIndex={-1} className={styles.formFeedback}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      <fieldset className={styles.formSection} disabled={saving}><legend>Agendamento</legend><div className={uiStyles.formGrid}>
        <Field id="appointment_patientId" label="Paciente (obrigatório)" error={errors.patientId}><select required value={fields.patientId} disabled={Boolean(id)} onChange={event => change('patientId', event.target.value)}><option value="">Selecione o paciente</option>{data.patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name} — {patient.code}</option>)}</select></Field>
        <Field id="appointment_doctorId" label="Doutor (obrigatório)" error={errors.doctorId || conflictError}><select required value={fields.doctorId} onChange={event => change('doctorId', event.target.value)}><option value="">Selecione o doutor</option>{data.doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></Field>
        <div className={uiStyles.full}><Field id="appointment_procedure" label="Procedimento (obrigatório)" error={errors.procedure}><select required value={fields.procedure} onChange={event => change('procedure', event.target.value)}><option value="">Selecione o procedimento</option>{data.procedures.map(procedure => <option key={procedure.id} value={procedure.name}>{procedure.name}</option>)}</select></Field></div>
        <Field id="appointment_date" label="Data (obrigatória)" error={errors.date || conflictError}><input required type="date" value={fields.date} onChange={event => change('date', event.target.value)}/></Field>
        <Field id="appointment_time" label="Horário (obrigatório)" error={errors.time || conflictError}><input required type="time" value={fields.time} onChange={event => change('time', event.target.value)}/></Field>
        <Field id="appointment_duration" label="Duração (minutos, obrigatória)" error={errors.duration} hint="Informe a duração deste atendimento."><input required type="number" min="1" step="1" value={fields.duration || ''} disabled={Boolean(id)} onChange={event => change('duration', Number(event.target.value))}/></Field>
        {id && <Field id="appointment_status" label="Status da consulta"><select value={fields.status} onChange={event => change('status', event.target.value)}>{appointmentStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select></Field>}
        <Field id="appointment_attendance" label="Forma de atendimento (opcional)"><input value={fields.attendance} onChange={event => change('attendance', event.target.value)} placeholder="Convênio ou particular"/></Field>
        <div className={uiStyles.full}><Field id="appointment_budgetId" label="Orçamento relacionado (opcional)"><select value={fields.budgetId} onChange={event => change('budgetId', event.target.value)}><option value="">Sem orçamento relacionado</option>{budgets.map(budget => <option key={budget.id} value={budget.id}>{budget.code} — {money(budgetTotal(budget.items))}</option>)}</select></Field></div>
        <div className={uiStyles.full}><Field id="appointment_observation" label="Observações (opcional)"><textarea rows={3} value={fields.observation} onChange={event => change('observation', event.target.value)}/></Field></div>
      </div></fieldset>
      <div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Salvando consulta…' : 'Salvar consulta'}</Button><ActionLink variant="secondary" to={returnTo}>Cancelar</ActionLink></div>
    </form>
  </>;
}
export function AppointmentDetailPage() { const { id } = useParams(); return <AppointmentDetail key={id} id={id}/>; }
function AppointmentDetail({ id }) {
    const { search, resource, appointment, cancelOpen, setCancelOpen, reason, setReason, saving, cancelError, setCancelError, cancelled, setCancelled, cancel, patient, doctor, budget } = useAppointmentDetailViewModel({ id });
    async function handleCancel(event) { event.preventDefault(); const target = await cancel(); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    const cancelFeedback = useRef(null);
    const cancelHeading = useRef(null);
    const cancelButton = useRef(null);
    useEffect(() => {
        if (cancelError || cancelled)
            cancelFeedback.current?.focus();
    }, [cancelError, cancelled]);
    useEffect(() => {
        if (cancelOpen)
            cancelHeading.current?.focus();
    }, [cancelOpen]);
    if (resource.busy)
        return <LoadingState />;
    if (resource.error)
        return <ReadError message={resource.error} retry={resource.retry}/>;
    if (!appointment)
        return <MissingAppointment />;
    return <>
    <Link className={uiStyles.back} to={`/agenda${search || `?date=${appointment.date}`}`}>← Voltar à agenda</Link>
    <PageHeader eyebrow={`${dateLabel(appointment.date)} · ${appointment.time}`} title={patient ? `Consulta de ${patient.name}` : 'Consulta'} action={<ActionLink to={`/agenda/${appointment.id}/editar${search}`}>Editar consulta</ActionLink>}/>
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
    {appointment.status !== 'Cancelada' && (cancelOpen ? <section className={uiStyles.section} aria-labelledby="appointment_cancel"><h2 ref={cancelHeading} tabIndex={-1} id="appointment_cancel">Cancelar esta consulta?</h2><p className={styles.formHint}>A consulta continuará disponível no histórico.</p><form onSubmit={handleCancel}>{cancelError && <div ref={cancelFeedback} tabIndex={-1} className={styles.formFeedback}><Feedback tone="error" title="Não foi possível cancelar">{cancelError}</Feedback></div>}<fieldset className={styles.cancelFields} disabled={saving}><Field id="appointment_cancelReason" label="Motivo do cancelamento (opcional)"><textarea rows={3} value={reason} onChange={event => { setReason(event.target.value); setCancelError(''); }}/></Field><div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Cancelando consulta…' : 'Confirmar cancelamento'}</Button><Button variant="secondary" onClick={() => { setCancelOpen(false); setReason(''); setCancelError(''); requestAnimationFrame(() => cancelButton.current?.focus()); }}>Manter consulta</Button></div></fieldset></form></section> : <div className={styles.cancelAction}><button ref={cancelButton} className={`${uiStyles.button} ${uiStyles.secondary}`} type="button" onClick={() => { setCancelOpen(true); setCancelled(false); }}>Cancelar consulta</button></div>)}
    <section className={uiStyles.section} aria-labelledby="appointment_history"><h2 id="appointment_history">Histórico da consulta</h2><HistoryList entries={appointment.history}/></section>
  </>;
}
