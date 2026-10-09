import { PagedList } from '../../../component/paged_list.jsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../../component/ui.jsx';
import { RecordPicker } from '../../../component/record_picker.jsx';
import { budgetTotal, dateLabel, money, today } from '../../../demo/format.js';
import { appointmentStatuses, attendanceOptions } from '../../../demo/clinic.js';
import { permanentTeeth, primaryTeeth } from '../../budget/model/teeth.js';
import styles from './agenda.module.css';
import { weekdays, validDate, shiftDate, shiftMonth, endTime, minuteLabel, attendanceLabel, legacyAttendance } from '../model/agenda_model.js';
import { outsideCounts, statusCounts } from '../model/calendar_model.js';
import { useAppointmentCardViewModel, useAgendaViewModel, useAppointmentFormViewModel, useAppointmentDetailViewModel, useFinalizationViewModel } from '../view_model/use_agenda_view_model.js';
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
function ReadError({ message, retry }) { return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>; }
function MissingAppointment() { return <><PageHeader title="Consulta não encontrada"/><EmptyState title="Esta consulta não está disponível" detail="Volte à agenda para consultar os agendamentos." action={<ActionLink to="/agenda">Voltar à agenda</ActionLink>}/></>; }
function AppointmentRow({ appointment, search }) {
    const { patient, doctor, clinic, quickFinalize } = useAppointmentCardViewModel({ appointment });
    const name = patient?.name ?? 'Paciente não disponível';
    return <li className={`${styles.dayRow} ${uiStyles.appointmentColor}`} data-status={appointment.status}>
      <div className={styles.rowTop}><span className={styles.appointmentTime}>{appointment.time}–{endTime(appointment)} · {appointment.duration} min</span><StatusLabel appointment>{appointment.status || 'Status não definido'}</StatusLabel></div>
      <div className={styles.rowMain}><Link to={`/agenda/${appointment.id}${search}`}>{name}</Link>{clinic && <span className={styles.clinicTag}>{clinic}</span>}</div>
      <div className={styles.rowMeta}><span>{doctor?.name ?? 'Doutor não disponível'} · {appointment.procedure}</span>{quickFinalize && <Link to={`/agenda/${appointment.id}/finalizar${search}`} aria-label={`Finalizar consulta de ${name}`}>Finalizar</Link>}</div>
    </li>;
}
function CalendarAppointment({ segment, grouped, search }) {
    const { appointment, start, end, continuesBefore, continuesAfter } = segment;
    const { patient, doctor } = useAppointmentCardViewModel({ appointment });
    const label = `${patient?.name ?? 'Paciente não disponível'}, ${appointment.time}–${endTime(appointment)}, ${appointment.duration} minutos, ${doctor?.name ?? 'Doutor não disponível'}, ${appointment.procedure}, ${appointment.status}${continuesBefore ? ', continuação do dia anterior' : ''}${continuesAfter ? ', continua no próximo dia' : ''}`;
    // Na visão agrupada cada hora é uma célula; com doutor filtrado a posição e a altura acompanham minutos e duração.
    const box = grouped ? { top: `${Math.floor(start / 60) * 60 / 1440 * 100}%` } : { top: `${start / 1440 * 100}%`, height: `${(end - start) / 1440 * 100}%` };
    return <Link to={`/agenda/${appointment.id}${search}`} aria-label={label} title={label} data-status={appointment.status} data-appointment-id={appointment.id}
      className={`${styles.timedAppointment} ${uiStyles.appointmentColor} ${grouped ? styles.cellAppointment : ''} ${!grouped && end - start < 40 ? styles.shortAppointment : ''} ${!grouped && end - start >= 60 ? styles.withStatus : ''}`} style={box}>
      <strong>{patient?.name ?? 'Paciente não disponível'}</strong><span>{continuesBefore ? '↳ ' : ''}{grouped ? appointment.time : `${appointment.time}–${endTime(appointment)}`}{continuesAfter ? ' ↴' : ''}</span>{!grouped && <span className={styles.calendarStatus}>{appointment.status}</span>}
    </Link>;
}
function CalendarGroup({ day, block, grouped, selected, to, onSelect }) {
    const appointments = block.items.map(segment => segment.appointment);
    const counts = statusCounts(appointments, appointmentStatuses);
    const label = `${appointments.length} consultas em ${dateLabel(day.date)}, das ${minuteLabel(block.start)} às ${minuteLabel(Math.min(block.end, 1439))}: ${counts.map(value => `${value.count} ${value.status}`).join(', ')}. Abrir a lista do horário.`;
    return <Link to={to} onClick={onSelect} aria-label={label} title={label} aria-current={selected ? 'true' : undefined} data-group={`${day.date}:${block.start}`} className={`${styles.groupBlock} ${grouped ? styles.cellAppointment : ''}`}
      style={grouped ? { top: `${block.start / 1440 * 100}%` } : { top: `${block.start / 1440 * 100}%`, height: `${(block.end - block.start) / 1440 * 100}%` }}>
      <strong>{appointments.length} consultas</strong>
      <span className={styles.statusMix} aria-hidden="true">{counts.map(value => <i key={value.status} className={uiStyles.appointmentColor} data-status={value.status} style={{ flexGrow: value.count }}/>)}</span>
      {!grouped && <span>{minuteLabel(block.start)}–{minuteLabel(Math.min(block.end, 1439))}</span>}
    </Link>;
}
function MonthAppointment({ appointment, search }) {
    const { patient } = useAppointmentCardViewModel({ appointment });
    return <Link className={`${styles.monthEvent} ${uiStyles.appointmentColor}`} data-status={appointment.status} to={`/agenda/${appointment.id}${search}`} aria-label={`${appointment.time}, ${patient?.name ?? 'Paciente não disponível'}, ${appointment.status}`}><time>{appointment.time}</time><span>{patient?.name ?? 'Paciente não disponível'}</span></Link>;
}
function CalendarLegend({ note }) {
    return <ul className={styles.calendarLegend} aria-label="Situações das consultas">{appointmentStatuses.map(status => <li key={status} className={uiStyles.appointmentColor} data-status={status}><i aria-hidden="true"/>{status}</li>)}{note && <li className={styles.legendNote}>{note}</li>}</ul>;
}
const periods = [['Madrugada', 0], ['Manhã', 6], ['Tarde', 12], ['Noite', 18]];
function visibleRange(calendar) {
    const hour = parseFloat(getComputedStyle(calendar).getPropertyValue('--hour-height'));
    const head = calendar.querySelector('[data-calendar-head]')?.offsetHeight ?? 0;
    return { first: Math.round(calendar.scrollTop / hour * 60), last: Math.round((calendar.scrollTop + calendar.clientHeight - head) / hour * 60) };
}
function WeeklyCalendar({ calendarDays, calendarHours, grouped, selectedDate, activeSlot, initialHour, search, context, slotPath, revealed, jumpHost, onSelect }) {
    const scrollRef = useRef(null);
    const [visible, setVisible] = useState(null);
    const weekStart = calendarDays[0].date;
    function showHour(hour) {
        const calendar = scrollRef.current;
        calendar.scrollTop = hour * parseFloat(getComputedStyle(calendar).getPropertyValue('--hour-height'));
        setVisible(visibleRange(calendar));
    }
    useEffect(() => {
        const calendar = scrollRef.current;
        if (!calendar)
            return;
        calendar.scrollTop = initialHour * parseFloat(getComputedStyle(calendar).getPropertyValue('--hour-height'));
        setVisible(visibleRange(calendar));
    }, [initialHour, weekStart, grouped, revealed]);
    const outside = visible ? outsideCounts(calendarDays, visible.first, visible.last) : { before: 0, after: 0 };
    const starts = calendarDays.flatMap(day => day.blocks.map(block => block.start));
    return <div className={`${styles.calendarPanel} ${grouped ? styles.groupedCalendar : ''}`}>
      {jumpHost && createPortal(<div className={styles.jump} role="group" aria-label="Ir para o horário"><span aria-hidden="true">Ir para o horário:</span>{periods.map(([name, hour]) => <button key={name} type="button" aria-pressed={Boolean(visible) && visible.first >= hour * 60 && visible.first < (hour + 6) * 60} onClick={() => showHour(hour)}>{name}</button>)}</div>, jumpHost)}
      <div className={styles.calendarViewport}>
        <div ref={scrollRef} id="agenda_week_grid" className={styles.calendarScroll} role="region" aria-label="Agenda semanal, dias e horários" tabIndex={0} onScroll={event => setVisible(visibleRange(event.currentTarget))}>
          <div className={styles.weekCanvas}>
            <div className={styles.calendarHeaders} data-calendar-head><span className={styles.corner}>Horário</span>{calendarDays.map(day => <Link key={day.date} className={`${styles.dayHeader} ${day.date === selectedDate ? styles.currentDay : ''}`} to={`/agenda/nova?date=${day.date}&view=week${context}`} aria-label={`Agendar em ${dateLabel(day.date)}`}><span>{day.weekday.slice(0, 3)} {dateLabel(day.date).slice(0, 5)}</span><strong>{day.date === today() ? `Hoje · ${day.count}` : plural(day.count, 'consulta', 'consultas')}</strong></Link>)}</div>
            <div className={styles.weekBody}><div className={styles.hourAxis} aria-label="Horários, em intervalos de uma hora">{calendarHours.map(time => <div key={time}>{time}</div>)}</div>
              {calendarDays.map(day => <div key={day.date} className={`${styles.dayColumn} ${day.date === selectedDate ? styles.selectedColumn : ''}`} aria-label={`Consultas de ${dateLabel(day.date)}`}>
                {calendarHours.map(time => <Link key={time} className={styles.hourSlot} to={`/agenda/nova?date=${day.date}&time=${time}&view=week${context}`} aria-label={`Agendar em ${dateLabel(day.date)} às ${time}`}><span aria-hidden="true">+ Nova consulta</span></Link>)}
                {day.blocks.map(block => block.items.length === 1
                    ? <CalendarAppointment key={block.items[0].appointment.id} segment={block.items[0]} grouped={grouped} search={search}/>
                    : <CalendarGroup key={block.start} day={day} block={block} grouped={grouped} selected={day.date === selectedDate && activeSlot?.start === block.start && activeSlot?.end === block.end} to={slotPath(day.date, block)} onSelect={onSelect}/>)}
              </div>)}
            </div>
          </div>
        </div>
        {outside.before > 0 && <button type="button" className={`${styles.edge} ${styles.edgeTop}`} onClick={() => showHour(Math.floor(Math.min(...starts) / 60))}>↑ {plural(outside.before, 'consulta', 'consultas')} antes das {minuteLabel(Math.floor(visible.first / 60) * 60)}</button>}
        {outside.after > 0 && <button type="button" className={`${styles.edge} ${styles.edgeBottom}`} onClick={() => showHour(Math.floor(Math.max(...starts) / 60))}>↓ {plural(outside.after, 'consulta', 'consultas')} depois das {minuteLabel(Math.min(1380, Math.ceil(visible.last / 60) * 60))}</button>}
      </div>
      <CalendarLegend note={grouped ? 'Bloco com contagem: consultas que começam na mesma hora.' : 'Altura proporcional à duração.'}/>
    </div>;
}
function DayPanel({ selectedDate, appointments, dayTotal, activeSlot, dayPath, newAppointment, search, days, goTo }) {
    return <section className={styles.daySection} aria-labelledby="agenda_day">
      {days && <div className={styles.weekDayPicker} role="group" aria-label="Escolher dia da semana">{days.map((day, index) => <Button key={day} variant={day === selectedDate ? 'primary' : 'secondary'} aria-pressed={day === selectedDate} aria-label={`Ver consultas de ${dateLabel(day)}`} onClick={() => goTo(day)}>{weekdays[index]} {dateLabel(day).slice(0, 5)}</Button>)}</div>}
      <div className={styles.dayHeading}><div><h2 id="agenda_day" tabIndex={-1}>Consultas de {dateLabel(selectedDate)}</h2><p role="status">{activeSlot ? `Das ${minuteLabel(activeSlot.start)} às ${minuteLabel(Math.min(activeSlot.end, 1439))} · ${plural(appointments.length, 'consulta', 'consultas')}` : plural(dayTotal, 'consulta', 'consultas')}</p></div><ActionLink variant="secondary" to={newAppointment} aria-label="Agendar neste dia">Agendar</ActionLink></div>
      {activeSlot && <Link className={styles.wholeDay} to={dayPath}>Ver o dia inteiro ({dayTotal})</Link>}
      {appointments.length ? <PagedList records={appointments} label="Consultas do dia" pageSize={4} pageKey="pagina" compact>{rows => <ul className={styles.dayRows}>{rows.map(appointment => <AppointmentRow key={appointment.id} appointment={appointment} search={search}/>)}</ul>}</PagedList> : <p className={uiStyles.muted}>Nenhuma consulta cadastrada para este dia.</p>}
    </section>;
}
export function AgendaPage() {
    const { data, resource, area, setArea, selectedDate, view, doctorId, clinicId, clinicOptions, days, periodAppointments, selectedAppointments, dayTotal, activeSlot, calendarDays, calendarHours, grouped, initialHour, monthDays, context, dayPath, search, newAppointment, period, goTo, filterDoctor, filterClinic, slotPath } = useAgendaViewModel();
    const [jumpHost, setJumpHost] = useState(null);
    const panel = <DayPanel {...{ selectedDate, appointments: selectedAppointments, dayTotal, activeSlot, dayPath, newAppointment, search, goTo }} days={view === 'week' ? days : undefined}/>;
    return <>
      <PageHeader title="Agenda" description="Escolha uma data para consultar os atendimentos ou agendar uma consulta." action={<ActionLink to={newAppointment}>Agendar consulta</ActionLink>}/>
      <div className={styles.toolbar}><div className={styles.periodControls}>
        <div className={styles.navigation}><Button variant="secondary" aria-label={view === 'week' ? 'Semana anterior' : 'Mês anterior'} onClick={() => goTo(view === 'week' ? shiftDate(selectedDate, -7) : shiftMonth(selectedDate, -1))}>←</Button><Button variant="secondary" onClick={() => goTo(today())}>Hoje</Button><Button variant="secondary" aria-label={view === 'week' ? 'Próxima semana' : 'Próximo mês'} onClick={() => goTo(view === 'week' ? shiftDate(selectedDate, 7) : shiftMonth(selectedDate, 1))}>→</Button></div>
        <Field id="agenda_date" label="Ir para a data"><input type="date" value={selectedDate} onChange={event => { if (validDate(event.target.value)) goTo(event.target.value); }}/></Field>
        {clinicOptions.length > 0 && <Field id="agenda_clinic" label="Clínica"><select value={clinicId} onChange={event => filterClinic(event.target.value)}><option value="">Todas as clínicas</option>{clinicOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>}
        <RecordPicker id="agenda_doctor" label="Filtrar por doutor" kind="doctor" records={data.doctors} value={doctorId} compact emptyLabel="Todos os doutores" onChange={filterDoctor}/>
      </div><div className={styles.viewSwitcher} role="group" aria-label="Visão da agenda"><Button variant={view === 'week' ? 'primary' : 'secondary'} aria-pressed={view === 'week'} aria-label="Visão semanal" onClick={() => goTo(selectedDate, 'week')}>Semana</Button><Button variant={view === 'month' ? 'primary' : 'secondary'} aria-pressed={view === 'month'} aria-label="Visão mensal" onClick={() => goTo(selectedDate, 'month')}>Mês</Button></div></div>
      <div className={styles.periodHeading}><h2>{period}</h2>{!resource.busy && !resource.error && <p role="status">{plural(periodAppointments.length, 'consulta', 'consultas')}</p>}{view === 'week' && <div ref={setJumpHost} className={styles.jumpHost} data-area={area}/>}</div>
      {resource.busy ? <LoadingState/> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : view === 'week' ? <>
        <div className={styles.areaSwitch} role="group" aria-label="Área da agenda"><Button variant={area === 'list' ? 'primary' : 'secondary'} aria-pressed={area === 'list'} onClick={() => setArea('list')}>Consultas do dia</Button><Button variant={area === 'grid' ? 'primary' : 'secondary'} aria-pressed={area === 'grid'} aria-controls="agenda_week_grid" onClick={() => setArea('grid')}>Calendário</Button></div>
        <div className={styles.weekLayout} data-area={area}>
          <WeeklyCalendar {...{ calendarDays, calendarHours, grouped, selectedDate, activeSlot, initialHour, search, context, slotPath, jumpHost }} revealed={area === 'grid'} onSelect={() => { setArea('list'); requestAnimationFrame(() => document.getElementById('agenda_day')?.focus()); }}/>
          {panel}
        </div>
        {!periodAppointments.length && <EmptyState title="Nenhuma consulta nesta semana" detail="Cadastre uma consulta para organizar o atendimento da clínica." action={<ActionLink to={newAppointment}>Cadastrar primeira consulta</ActionLink>}/>}
      </> : <>
        <div className={styles.monthLayout}><section className={styles.monthSection} aria-label="Calendário mensal"><div className={styles.monthWeekdays}>{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className={styles.monthGrid}>
          {monthDays.map(day => !day.currentMonth ? <div key={day.date} className={styles.monthSpacer} aria-hidden="true">{day.number}</div> : <div key={day.date} className={`${styles.monthDay} ${day.date === selectedDate ? styles.selectedDay : ''} ${day.date === today() ? styles.today : ''}`}>
            <button type="button" className={styles.monthDate} aria-pressed={day.date === selectedDate} aria-label={`${dateLabel(day.date)}, ${day.count} ${day.count === 1 ? 'consulta' : 'consultas'}`} onClick={() => goTo(day.date)}><span>{day.number}</span>{day.count > 0 && <small className={styles.monthCount}>{day.count}</small>}</button>
            <div className={styles.monthEvents}>{day.events.map(appointment => <MonthAppointment key={appointment.id} appointment={appointment} search={search}/>)}</div>
            {day.extra > 0 && <button className={styles.moreEvents} type="button" onClick={() => { goTo(day.date); requestAnimationFrame(() => document.getElementById('agenda_day')?.focus()); }}>Ver mais {day.extra}</button>}
          </div>)}
        </div></section>{panel}</div><CalendarLegend/>
      </>}
    </>;
}
export function AppointmentFormPage() { const { id } = useParams(); const { search } = useLocation(); return <AppointmentForm key={`${id ?? 'new'}${search}`} id={id}/>; }
function AttendanceChoice({ id, value, legacy, disabled, onChange }) {
    return <fieldset className={styles.choice} disabled={disabled} aria-describedby={`${id}_hint`}><legend>Forma de atendimento (opcional)</legend>
      <div className={styles.options}>{attendanceOptions.map(option => <label key={option} className={styles.option}><input type="radio" name={id} id={`${id}_${option === 'Particular' ? 'particular' : 'convenio'}`} value={option} checked={value === option} onChange={() => onChange(option)}/><span>{option}</span></label>)}{value && <Button variant="quiet" aria-label="Limpar escolha da forma de atendimento" onClick={() => onChange('')}>Limpar</Button>}</div>
      <p id={`${id}_hint`} className={uiStyles.hint}>{legacy ? `Registro anterior: “${legacy}”. Escolha uma opção para substituir ou mantenha como está.` : 'Sem escolha, o registro fica como “Não informada”.'}</p>
    </fieldset>;
}
function AppointmentForm({ id }) {
    const { data, params, resource, source, fields, saving, saved, saveError, errors, doctorSearch, returnTo, budgets, patient, statuses, clinicOptional, legacy, conflictError, change, submit } = useAppointmentFormViewModel({ id });
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
    if (source?.completion)
        return <><Link className={uiStyles.back} to={returnTo}>← Voltar à consulta</Link><PageHeader title="Editar consulta"/><Feedback tone="info" title="Esta consulta foi finalizada"><p>Os dados do agendamento ficam preservados. Para alterar o que foi realizado, use a correção da finalização.</p></Feedback><div className={uiStyles.formActions}><ActionLink to={`/agenda/${id}/finalizar`}>Corrigir finalização</ActionLink><ActionLink variant="secondary" to={returnTo}>Voltar à consulta</ActionLink></div></>;
    return <>
    <Link className={uiStyles.back} to={returnTo}>← {id ? 'Voltar à consulta' : 'Voltar à agenda'}</Link>
    <PageHeader title={id ? 'Editar consulta' : 'Nova consulta'} description={id ? 'Paciente e duração são preservados. Revise os demais dados do atendimento.' : 'Informe paciente, doutor, procedimento, data, horário e duração. A consulta começa como Agendada.'}/>
    <form onSubmit={handleSubmit} noValidate>
      {saveError && <div ref={feedbackRef} tabIndex={-1} className={styles.formFeedback}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      <fieldset className={styles.formSection} disabled={saving}><legend>Agendamento</legend><div className={styles.formGrid}>
        {data.clinics.length > 0 && <div className={styles.span2}><Field id="appointment_clinicId" label={clinicOptional ? 'Clínica (opcional)' : 'Clínica (obrigatória)'} error={errors.clinicId} hint={clinicOptional && !fields.clinicId ? 'Consulta anterior às clínicas: continua pendente de vinculação.' : undefined}><select required={!clinicOptional} value={fields.clinicId} onChange={event => change('clinicId', event.target.value)}><option value="">{clinicOptional ? 'Sem clínica' : 'Selecione a clínica'}</option>{data.clinics.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}</select></Field></div>}
        <div className={data.clinics.length ? styles.span2 : styles.span3}><RecordPicker id="appointment_patientId" label="Paciente (obrigatório)" kind="patient" records={data.patients} value={fields.patientId} disabled={saving || Boolean(id)} error={errors.patientId} onChange={value => change('patientId', value)}/></div>
        <div className={data.clinics.length ? styles.span2 : styles.span3}><RecordPicker id="appointment_doctorId" label="Doutor (obrigatório)" kind="doctor" records={data.doctors} value={fields.doctorId} disabled={saving} error={errors.doctorId || conflictError} onChange={value => change('doctorId', value)}/></div>
        <div className={styles.span3}><RecordPicker id="appointment_procedure" label="Procedimento (obrigatório)" kind="procedure" records={data.procedures} value={fields.procedureId} disabled={saving} allowClear={false} error={errors.procedure} hint={!fields.procedureId && fields.procedure ? `Registro anterior: “${fields.procedure}”. Busque no catálogo para trocar.` : undefined} onChange={value => change('procedureId', value)}/></div>
        <div className={styles.span3}><Field id="appointment_budgetId" label="Orçamento relacionado (opcional)"><select value={fields.budgetId} onChange={event => change('budgetId', event.target.value)}><option value="">Sem orçamento relacionado</option>{budgets.map(budget => <option key={budget.id} value={budget.id}>{budget.code} — {money(budgetTotal(budget.items))}</option>)}</select></Field></div>
        <Field id="appointment_date" label="Data (obrigatória)" error={errors.date || conflictError}><input required type="date" value={fields.date} onChange={event => change('date', event.target.value)}/></Field>
        <Field id="appointment_time" label="Horário (obrigatório)" error={errors.time || conflictError}><input required type="time" value={fields.time} onChange={event => change('time', event.target.value)}/></Field>
        <Field id="appointment_duration" label="Duração (minutos, obrigatória)" error={errors.duration}><input required type="number" min="1" step="1" value={fields.duration || ''} disabled={Boolean(id)} onChange={event => change('duration', Number(event.target.value))}/></Field>
        <div className={styles.span3}><AttendanceChoice id="appointment_attendance" value={legacy ? '' : fields.attendance} legacy={legacy} onChange={value => change('attendance', value)}/></div>
        <div className={styles.span3}>{fields.attendance === 'Convênio' && <Field id="appointment_insurance" label="Convênio (opcional)" hint={patient?.insurance ? `Cadastro do paciente: ${patient.insurance}${patient.insuranceNumber ? ` · carteirinha ${patient.insuranceNumber}` : ''}.` : 'O cadastro do paciente não informa convênio.'}><input value={fields.insurance} onChange={event => change('insurance', event.target.value)}/></Field>}</div>
        <div className={styles.span3}>{id && <Field id="appointment_status" label="Status da consulta" hint={source.status === 'Concluída' ? undefined : 'Para concluir, use Finalizar consulta no detalhe.'}><select value={fields.status} onChange={event => change('status', event.target.value)}>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select></Field>}</div>
        <div className={styles.span6}><Field id="appointment_observation" label="Observações (opcional)"><textarea rows={1} value={fields.observation} onChange={event => change('observation', event.target.value)}/></Field></div>
      </div></fieldset>
      <div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Salvando consulta…' : 'Salvar consulta'}</Button><ActionLink variant="secondary" to={returnTo}>Cancelar</ActionLink></div>
    </form>
  </>;
}
export function AppointmentDetailPage() { const { id } = useParams(); return <AppointmentDetail key={id} id={id}/>; }
function AppointmentDetail({ id }) {
    const { search, resource, appointment, cancelOpen, setCancelOpen, reason, setReason, saving, cancelError, setCancelError, cancelled, setCancelled, cancel, patient, doctor, budget, clinic, finalizable, reportLocked } = useAppointmentDetailViewModel({ id });
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
    const completion = appointment.completion;
    const legacy = legacyAttendance(appointment.attendance);
    const finalize = `/agenda/${appointment.id}/finalizar${search}`;
    return <>
    <Link className={uiStyles.back} to={`/agenda${search || `?date=${appointment.date}`}`}>← Voltar à agenda</Link>
    <PageHeader eyebrow={`${dateLabel(appointment.date)} · ${appointment.time}`} title={patient ? `Consulta de ${patient.name}` : 'Consulta'} action={completion ? !reportLocked && <ActionLink variant="secondary" to={finalize}>Corrigir finalização</ActionLink> : <>{finalizable && <ActionLink to={finalize}>{appointment.status === 'Concluída' ? 'Registrar procedimentos realizados' : 'Finalizar consulta'}</ActionLink>}<ActionLink variant={finalizable ? 'secondary' : 'primary'} to={`/agenda/${appointment.id}/editar${search}`}>Editar consulta</ActionLink></>}/>
    {cancelled && <div ref={cancelFeedback} tabIndex={-1} className={styles.formFeedback}><Feedback tone="success">Consulta cancelada. O registro e o histórico foram preservados.</Feedback></div>}
    <section className={uiStyles.section} aria-labelledby="appointment_information"><h2 id="appointment_information">Dados da consulta</h2><dl className={uiStyles.definition}>
      <div><dt>Paciente</dt><dd>{patient ? <Link to={`/pacientes/${patient.id}`}>{patient.name}</Link> : 'Paciente não disponível'}</dd></div>
      <div><dt>Doutor responsável</dt><dd>{doctor ? <Link to={`/doutores/${doctor.id}`}>{doctor.name}</Link> : 'Doutor não disponível'}</dd></div>
      {clinic && <div><dt>Clínica</dt><dd>{appointment.clinicId ? clinic : 'Sem clínica — pendente de vinculação'}</dd></div>}
      <div><dt>Data e horário</dt><dd>{dateLabel(appointment.date)} · {appointment.time}–{endTime(appointment)}</dd></div>
      <div><dt>Duração</dt><dd>{appointment.duration} minutos</dd></div>
      <div><dt>Procedimento agendado</dt><dd>{appointment.procedure}</dd></div>
      <div><dt>Status</dt><dd><StatusLabel appointment>{appointment.status || 'Status não definido'}</StatusLabel></dd></div>
      {appointment.attendance && <div><dt>Forma de atendimento</dt><dd>{legacy || attendanceLabel(appointment.attendance, appointment.insurance)}</dd></div>}
      {appointment.observation && <div className={uiStyles.full}><dt>Observações</dt><dd className={styles.multiline}>{appointment.observation}</dd></div>}
      {appointment.cancelReason && <div className={uiStyles.full}><dt>Motivo do cancelamento</dt><dd className={styles.multiline}>{appointment.cancelReason}</dd></div>}
    </dl></section>
    {completion ? <section className={uiStyles.section} aria-labelledby="appointment_performed"><h2 id="appointment_performed">Procedimentos realizados</h2>
      <ul className={styles.performed}>{completion.items.map(item => <li key={item.id}><strong>{item.procedure}</strong><span>{plural(item.quantity, 'unidade', 'unidades')}{item.tooth ? ` · dente ${item.tooth}` : ''}{item.region ? ` · ${item.region}` : ''}</span><span>{item.origin}</span></li>)}</ul>
      <dl className={uiStyles.definition}><div><dt>Forma de atendimento na finalização</dt><dd>{attendanceLabel(completion.attendance, completion.insurance)}</dd></div><div><dt>Finalizada em</dt><dd>{dateLabel(completion.finalizedAt)}</dd></div>{completion.pendingGuide && <div><dt>Pendência</dt><dd>Guia do convênio pendente</dd></div>}{completion.observation && <div className={uiStyles.full}><dt>Observações da finalização</dt><dd className={styles.multiline}>{completion.observation}</dd></div>}</dl>
      {reportLocked && <p className={styles.formHint}>Esta consulta está em um relatório diário já enviado. A correção depende da devolução do relatório.</p>}
    </section> : appointment.status === 'Concluída' && <div className={styles.formFeedback}><Feedback tone="warning" title="Concluída sem procedimentos realizados registrados"><p>Esta consulta foi concluída pela alteração de status. Ela não entra nos relatórios até que os procedimentos realizados sejam registrados.</p></Feedback></div>}
    {budget && <section className={uiStyles.section} aria-labelledby="appointment_budget"><div className={styles.dayHeading}><h2 id="appointment_budget">Orçamento relacionado</h2><ActionLink variant="secondary" to={`/orcamentos/${budget.id}`}>Ver orçamento {budget.code}</ActionLink></div><dl className={uiStyles.definition}><div><dt>Total do orçamento</dt><dd>{money(budgetTotal(budget.items))}</dd></div>{budget.paymentNote && <div><dt>Condições registradas no orçamento</dt><dd>{budget.paymentNote}</dd></div>}</dl></section>}
    {appointment.status !== 'Cancelada' && !completion && (cancelOpen ? <section className={uiStyles.section} aria-labelledby="appointment_cancel"><h2 ref={cancelHeading} tabIndex={-1} id="appointment_cancel">Cancelar esta consulta?</h2><p className={styles.formHint}>A consulta continuará disponível no histórico.</p><form onSubmit={handleCancel}>{cancelError && <div ref={cancelFeedback} tabIndex={-1} className={styles.formFeedback}><Feedback tone="error" title="Não foi possível cancelar">{cancelError}</Feedback></div>}<fieldset className={styles.cancelFields} disabled={saving}><Field id="appointment_cancelReason" label="Motivo do cancelamento (opcional)"><textarea rows={3} value={reason} onChange={event => { setReason(event.target.value); setCancelError(''); }}/></Field><div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Cancelando consulta…' : 'Confirmar cancelamento'}</Button><Button variant="secondary" onClick={() => { setCancelOpen(false); setReason(''); setCancelError(''); requestAnimationFrame(() => cancelButton.current?.focus()); }}>Manter consulta</Button></div></fieldset></form></section> : <div className={styles.cancelAction}><button ref={cancelButton} className={`${uiStyles.button} ${uiStyles.secondary}`} type="button" onClick={() => { setCancelOpen(true); setCancelled(false); }}>Cancelar consulta</button></div>)}
    <section className={uiStyles.section} aria-labelledby="appointment_history"><h2 id="appointment_history">Histórico da consulta</h2><HistoryList entries={appointment.history}/></section>
  </>;
}
export function FinalizationPage() { const { id } = useParams(); return <Finalization key={id} id={id}/>; }
function Finalization({ id }) {
    const { data, search, resource, appointment, patient, doctor, clinic, budget, correction, blocked, legacy, fields, items, planned, errors, saving, saved, saveError, dirty, changeField, changeItem, addItem, removeItem, submit } = useFinalizationViewModel({ id });
    const feedbackRef = useRef(null);
    useEffect(() => {
        if (saveError)
            feedbackRef.current?.focus();
    }, [saveError]);
    function focus(target) { if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    async function handleSubmit(event) { event.preventDefault(); focus(await submit()); }
    if (resource.busy)
        return <LoadingState />;
    if (resource.error)
        return <ReadError message={resource.error} retry={resource.retry}/>;
    if (!appointment)
        return <MissingAppointment />;
    const detail = `/agenda/${appointment.id}${search}`;
    if (saved)
        return <><PageHeader title={correction ? 'Finalização corrigida' : 'Consulta finalizada'}/><Feedback tone="success">{plural(saved.completion.items.length, 'procedimento realizado registrado', 'procedimentos realizados registrados')} para {patient?.name ?? 'o paciente'} em {dateLabel(saved.date)}. Nenhum lançamento foi feito no Caixa.</Feedback><div className={uiStyles.formActions}><ActionLink to={detail}>Ver consulta</ActionLink><ActionLink variant="secondary" to={`/relatorios/diario?data=${saved.date}&doutor=${saved.doctorId}${saved.clinicId ? `&clinica=${saved.clinicId}` : ''}`}>Abrir relatório do dia</ActionLink><ActionLink variant="quiet" to={`/agenda${search || `?date=${saved.date}`}`}>Voltar à agenda</ActionLink></div></>;
    const title = correction ? 'Corrigir finalização' : 'Finalizar consulta';
    if (blocked)
        return <><Link className={uiStyles.back} to={detail}>← Voltar à consulta</Link><PageHeader title={title}/><Feedback tone="warning">{blocked}</Feedback><div className={uiStyles.formActions}><ActionLink variant="secondary" to={detail}>Voltar à consulta</ActionLink></div></>;
    const groups = [...new Set(planned.map(value => value.group))];
    return <>
    <Link className={uiStyles.back} to={detail}>← Voltar à consulta</Link>
    <PageHeader title={title} description="Confirme o que foi efetivamente realizado. A finalização não gera recebimento nem lançamento no Caixa."/>
    <dl className={styles.summaryStrip}>
      <div><dt>Paciente</dt><dd>{patient ? `${patient.name} · ${patient.code}` : 'Paciente não disponível'}</dd></div><div><dt>Doutor</dt><dd>{doctor?.name ?? 'Doutor não disponível'}</dd></div>{clinic && <div><dt>Clínica</dt><dd>{clinic}</dd></div>}
      <div><dt>Data e horário</dt><dd>{dateLabel(appointment.date)} · {appointment.time}–{endTime(appointment)}</dd></div><div><dt>Situação atual</dt><dd><StatusLabel appointment>{appointment.status}</StatusLabel></dd></div>
    </dl>
    <form onSubmit={handleSubmit} noValidate>
      {saveError && <div ref={feedbackRef} tabIndex={-1} className={styles.formFeedback}><Feedback tone="error" title="Não foi possível finalizar">{saveError}</Feedback></div>}
      <div className={styles.finalLayout}>
        <fieldset className={styles.finalMain} disabled={saving}><legend className={styles.visuallyHidden}>Procedimentos realizados e forma de atendimento</legend>
          <div className={styles.finalHeading}><div><h2>Procedimentos realizados</h2><p>{plural(items.length, 'item', 'itens')} · base do relatório diário e do relatório mensal.</p></div>
            <RecordPicker id="finalization_items" label="Adicionar procedimento realizado" kind="procedure" records={data.procedures} value="" disabled={saving} allowClear={false} compact emptyLabel="Adicionar procedimento" error={errors.finalization_items} onChange={value => focus(addItem({ procedureId: value }))}/></div>
          {items.length > 0 && <ul className={styles.doneItems}>{items.map((item, index) => <li key={item.key}>
            <div className={styles.doneName}><RecordPicker id={`item_${item.key}_procedure`} label={`Procedimento ${index + 1}`} kind="procedure" records={data.procedures} value={item.procedureId} disabled={saving || item.conferred} allowClear={false} compact error={errors[`item_${item.key}_procedure`]} onChange={value => changeItem(item.key, { procedureId: value }, `item_${item.key}_procedure`)}/></div>
            <Field id={`item_${item.key}_quantity`} label="Quantidade" error={errors[`item_${item.key}_quantity`]}><input type="number" inputMode="numeric" min="1" step="1" value={item.quantity} onChange={event => changeItem(item.key, { quantity: event.target.value }, `item_${item.key}_quantity`)}/></Field>
            <Field id={`item_${item.key}_tooth`} label="Dente (opcional)"><select value={item.tooth} onChange={event => changeItem(item.key, { tooth: event.target.value })}><option value="">Sem dente</option><optgroup label="Permanente">{permanentTeeth.map(tooth => <option key={tooth} value={tooth}>{tooth}</option>)}</optgroup><optgroup label="Infantil">{primaryTeeth.map(tooth => <option key={tooth} value={tooth}>{tooth}</option>)}</optgroup></select></Field>
            <Field id={`item_${item.key}_region`} label="Região (opcional)"><input value={item.region} onChange={event => changeItem(item.key, { region: event.target.value })}/></Field>
            <div className={styles.doneOrigin}><StatusLabel>{item.origin}</StatusLabel><Button variant="quiet" disabled={saving || item.conferred} onClick={() => focus(removeItem(item.key))} aria-label={`Remover procedimento ${index + 1}${item.name ? `: ${item.name}` : ''}`}>Remover</Button></div>
          </li>)}</ul>}
          <div className={styles.finalFields}>
            <AttendanceChoice id="finalization_attendance" value={fields.attendance} legacy={legacy} onChange={value => changeField('attendance', value)}/>
            <div>{fields.attendance === 'Convênio' && <Field id="finalization_insurance" label="Convênio (opcional)"><input value={fields.insurance} onChange={event => changeField('insurance', event.target.value)}/></Field>}</div>
            <Field id="finalization_observation" label="Observações da finalização (opcional)"><input value={fields.observation} onChange={event => changeField('observation', event.target.value)}/></Field>
            <div>{fields.attendance === 'Convênio' && <fieldset className={styles.choice}><legend>Pendência (opcional)</legend><div className={styles.options}><label className={styles.option}><input type="checkbox" id="finalization_pendingGuide" checked={fields.pendingGuide} onChange={event => changeField('pendingGuide', event.target.checked)}/><span>Guia do convênio pendente</span></label></div></fieldset>}</div>
          </div>
        </fieldset>
        <aside className={styles.planned} aria-labelledby="finalization_planned"><h2 id="finalization_planned">Previsto para este paciente</h2><p>Só entra no registro o que for incluído como realizado.</p>
          {groups.length ? groups.map(group => <div key={group}><h3>{group}{group.startsWith('Orçamento') && budget ? ` · ${plural(budget.items.length, 'item', 'itens')}` : ''}</h3><ul>{planned.filter(value => value.group === group).map(value => <li key={value.key}><div><strong>{value.name}</strong><span>{plural(Number(value.quantity), 'unidade', 'unidades')}{value.tooth ? ` · dente ${value.tooth}` : ''}</span></div>{value.included ? <StatusLabel tone="success">Incluído</StatusLabel> : value.procedureId ? <Button variant="secondary" disabled={saving} onClick={() => focus(addItem(value))} aria-label={`Incluir ${value.name} como realizado`}>Incluir</Button> : <StatusLabel>Fora do catálogo</StatusLabel>}</li>)}</ul></div>) : <p>Não há procedimento agendado ou orçamento relacionado para sugerir.</p>}
        </aside>
      </div>
      <div className={styles.finalActions}><Button type="submit" busy={saving}>{saving ? 'Salvando…' : title}</Button><ActionLink variant="secondary" to={detail}>Cancelar</ActionLink>{dirty && <p className={styles.unsaved}>Alterações não salvas</p>}<p className={styles.finalNote}>{correction ? 'A correção fica registrada no histórico da consulta.' : 'Ao finalizar, a situação passa para Concluída e os procedimentos são registrados com histórico. Um segundo envio não repete o registro.'}</p></div>
    </form>
  </>;
}
