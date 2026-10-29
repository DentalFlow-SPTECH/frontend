import { useState } from 'react';
import { CalendarClock, Search, Sparkles, Stethoscope, StickyNote, UserPlus, UserRound, X } from 'lucide-react';
import { Alert, Avatar, Button, ButtonLink, Card, Chips, Combobox, ErrorState, Field, FormGrid, Input, Page, PageHeader, Skeleton, Textarea } from '../../../component/ui/index.js';
import { ageOf, maskPhone } from '../../../component/format.js';
import { useAppointmentFormViewModel } from '../view_model/use_appointment_form_view_model.js';
import styles from './appointment_form.module.css';

const slotsShown = 8;

export function AppointmentFormPage() {
    const vm = useAppointmentFormViewModel();
    const [expanded, setExpanded] = useState([]);
    const title = vm.editing ? 'Remarcar consulta' : 'Agendar consulta';
    if (vm.error && !vm.form)
        return <Page width="wide"><PageHeader title={title} back={{ to: '/agenda', label: 'Agenda' }}/><ErrorState error={vm.error} onRetry={vm.reload}/></Page>;
    if (vm.loading || !vm.form)
        return <Page width="wide"><PageHeader title={title} back={{ to: '/agenda', label: 'Agenda' }}/><Skeleton rows={4} height={120}/></Page>;
    const { form, summary } = vm;
    const submitLabel = vm.editing ? 'Salvar alterações' : 'Agendar consulta';
    const conflict = vm.conflicts.length > 0 && <Alert tone="warning" title="Este horário já está ocupado">{vm.conflicts.map(item => `${item.time} · ${item.patientName}`).join('; ')}. Você pode salvar mesmo assim, mas confira com o dentista.</Alert>;
    return <Page width="wide">
        <PageHeader title={title} back={{ to: vm.cancelLink, label: vm.editing ? 'Consulta' : 'Agenda' }}/>
        <form className={styles.layout} noValidate onSubmit={event => { event.preventDefault(); vm.submit(); }}>
            <div className={styles.main}>
                {vm.failure && <Alert tone="danger" title="Não foi possível salvar">{vm.failure}</Alert>}
                <Card title={<span className={styles.sectionTitle}><UserRound aria-hidden="true"/>Paciente</span>}>
                    {vm.patient
                        ? <div className={styles.chosen}>
                            <Avatar name={vm.patient.name} size="lg"/>
                            <span className={styles.chosenText}><b>{vm.patient.name}</b><small>{[ageOf(vm.patient.birthDate) !== null && `${ageOf(vm.patient.birthDate)} anos`, vm.patient.phone && maskPhone(vm.patient.phone)].filter(Boolean).join(' · ')}</small></span>
                            {!vm.editing && <Button variant="secondary" size="sm" icon={X} onClick={vm.clearPatient} className={styles.chosenAction}>Trocar</Button>}
                        </div>
                        : <>
                            <Field label="Buscar paciente" error={vm.errors.patientId} hint="Digite o nome, o CPF ou o telefone.">
                                <Input icon={Search} value={vm.search} onChange={event => vm.setSearch(event.target.value)} autoComplete="off" autoFocus/>
                            </Field>
                            {vm.search && <ul className={styles.results} aria-label="Pacientes encontrados">
                                {vm.patientResults.map(item => <li key={item.id}><button type="button" onClick={() => vm.choosePatient(item)}>
                                    <Avatar name={item.name}/><span className={styles.chosenText}><b>{item.name}</b><small>{[item.phone && maskPhone(item.phone), item.neighborhood].filter(Boolean).join(' · ')}</small></span>
                                </button></li>)}
                                {!vm.patientResults.length && <li className={styles.noResult}>Nenhum paciente com esse nome.</li>}
                            </ul>}
                            <ButtonLink to="/pacientes/novo?agendar=1" variant="ghost" size="sm" icon={UserPlus} className={styles.newPatient}>Cadastrar novo paciente</ButtonLink>
                        </>}
                </Card>
                <Card title={<span className={styles.sectionTitle}><Sparkles aria-hidden="true"/>Dentista e procedimento</span>}>
                    <div className={styles.stack}>
                        {vm.dentistPicker === 'chips'
                            ? <div className={styles.field}>
                                <span className={styles.label}>Dentista</span>
                                <Chips wrap label="Dentista" options={vm.dentistOptions} value={form.dentistId} onChange={value => vm.change('dentistId', value ?? '')}/>
                                {vm.errors.dentistId && <p className={styles.error} role="alert">{vm.errors.dentistId}</p>}
                            </div>
                            : <Field label="Dentista" error={vm.errors.dentistId}>
                                <Combobox options={vm.dentistSearchOptions} value={form.dentistId} onChange={value => vm.change('dentistId', value)} placeholder="Digite o nome do dentista"/>
                            </Field>}
                        <Field label="Procedimento" error={vm.errors.procedureId}>
                            <Combobox options={vm.procedureOptions} value={form.procedureId} onChange={value => vm.change('procedureId', value)} placeholder="Digite o nome do procedimento"/>
                        </Field>
                    </div>
                </Card>
                <Card title={<span className={styles.sectionTitle}><CalendarClock aria-hidden="true"/>Dia e horário</span>}>
                    <FormGrid>
                        <Field label="Data" error={vm.errors.date}><Input type="date" value={form.date} onChange={event => vm.change('date', event.target.value)}/></Field>
                        <Field label="Horário" error={vm.errors.time} hint={`Duração prevista: ${vm.duration} min`}><Input type="time" step="300" value={form.time} onChange={event => vm.change('time', event.target.value)}/></Field>
                    </FormGrid>
                    {form.dentistId && <div className={styles.slots}>
                        <p className={styles.label}>Horários livres{vm.procedure ? ` para ${vm.procedure.name.toLowerCase()}` : ''}</p>
                        {vm.slotsLoading ? <p className={styles.muted}>Conferindo a agenda…</p>
                            : vm.slotGroups.length ? vm.slotGroups.map(group => {
                                const open = expanded.includes(group.title);
                                const times = open ? group.times : group.times.slice(0, slotsShown);
                                return <section key={group.title} className={styles.slotGroup} aria-label={`Horários livres: ${group.title}`}>
                                    <h3>{group.title}</h3>
                                    <div className={styles.slotList}>{times.map(time => <button key={time} type="button" aria-pressed={form.time === time} onClick={() => vm.change('time', time)}>{time}</button>)}</div>
                                    {group.times.length > slotsShown && <button type="button" className={styles.more} onClick={() => setExpanded(list => (open ? list.filter(item => item !== group.title) : [...list, group.title]))}>
                                        {open ? 'Ver menos' : `Ver todos (${group.times.length})`}
                                    </button>}
                                </section>;
                            })
                            : <p className={styles.muted}>Não há horário livre neste dia. Escolha outro dia ou informe o horário manualmente.</p>}
                    </div>}
                    <div className={styles.inlineConflict}>{conflict}</div>
                </Card>
                <Card title={<span className={styles.sectionTitle}><StickyNote aria-hidden="true"/>Observação</span>}>
                    <Field label="Observação" optional error={vm.errors.notes} hint={`${form.notes.length} de 255 caracteres`}>
                        <Textarea value={form.notes} maxLength={255} onChange={event => vm.change('notes', event.target.value)}/>
                    </Field>
                </Card>
            </div>
            <aside className={styles.summary} aria-label="Resumo da consulta">
                <h2>Resumo da consulta</h2>
                <dl>
                    <SummaryRow icon={UserRound} label="Paciente" value={summary.patient}/>
                    <SummaryRow icon={Stethoscope} label="Dentista" value={summary.dentist}/>
                    <SummaryRow icon={Sparkles} label="Procedimento" value={summary.procedure}/>
                    <SummaryRow icon={CalendarClock} label="Dia e horário" value={summary.when}/>
                </dl>
                {conflict}
                <Button type="submit" size="lg" block busy={vm.busy}>{submitLabel}</Button>
                <ButtonLink to={vm.cancelLink} variant="ghost" block>Cancelar</ButtonLink>
            </aside>
            <div className={styles.bar}>
                <span className={styles.barText}><b>{summary.patient ?? 'Escolha o paciente'}</b><small>{summary.short}</small></span>
                <Button type="submit" busy={vm.busy}>{vm.editing ? 'Salvar' : 'Agendar'}</Button>
            </div>
        </form>
    </Page>;
}

function SummaryRow({ icon: Icon, label, value }) {
    return <div className={styles.summaryRow}>
        <dt><Icon aria-hidden="true"/>{label}</dt>
        <dd className={value ? '' : styles.pending}>{value ?? 'A escolher'}</dd>
    </div>;
}
