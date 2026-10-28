import { CalendarClock, Search, Sparkles, StickyNote, UserPlus, UserRound, X } from 'lucide-react';
import { Alert, Avatar, Button, ButtonLink, Card, Chips, ErrorState, Field, FormGrid, Input, PageHeader, Select, Skeleton, Textarea } from '../../../component/ui/index.js';
import { ageOf, brl, maskPhone } from '../../../component/format.js';
import { useAppointmentFormViewModel } from '../view_model/use_appointment_form_view_model.js';
import styles from './appointment_form.module.css';

export function AppointmentFormPage() {
    const vm = useAppointmentFormViewModel();
    const title = vm.editing ? 'Remarcar consulta' : 'Agendar consulta';
    if (vm.error && !vm.form)
        return <><PageHeader title={title} back={{ to: '/agenda', label: 'Agenda' }}/><ErrorState error={vm.error} onRetry={vm.reload}/></>;
    if (vm.loading || !vm.form)
        return <><PageHeader title={title} back={{ to: '/agenda', label: 'Agenda' }}/><Skeleton rows={4} height={120}/></>;
    const { form } = vm;
    return <>
        <PageHeader title={title} back={{ to: vm.cancelLink, label: vm.editing ? 'Consulta' : 'Agenda' }}/>
        <form className={styles.layout} noValidate onSubmit={event => { event.preventDefault(); vm.submit(); }}>
            <div className={styles.main}>
                {vm.failure && <Alert tone="danger" title="Não foi possível salvar">{vm.failure}</Alert>}
                <Card title={<span className={styles.sectionTitle}><UserRound aria-hidden="true"/>Paciente</span>}>
                    {vm.patient
                        ? <div className={styles.chosen}>
                            <Avatar name={vm.patient.name} size="lg"/>
                            <span><b>{vm.patient.name}</b><small>{[ageOf(vm.patient.birthDate) !== null && `${ageOf(vm.patient.birthDate)} anos`, vm.patient.phone && maskPhone(vm.patient.phone)].filter(Boolean).join(' · ')}</small></span>
                            {!vm.editing && <Button variant="secondary" size="sm" icon={X} onClick={vm.clearPatient}>Trocar</Button>}
                        </div>
                        : <>
                            <Field label="Buscar paciente" error={vm.errors.patientId} hint="Digite o nome, o CPF ou o telefone.">
                                <Input icon={Search} value={vm.search} onChange={event => vm.setSearch(event.target.value)} placeholder="Ex.: Maria" autoComplete="off" autoFocus/>
                            </Field>
                            {vm.search && <ul className={styles.results} aria-label="Pacientes encontrados">
                                {vm.patientResults.map(item => <li key={item.id}><button type="button" onClick={() => vm.choosePatient(item)}>
                                    <Avatar name={item.name}/><span><b>{item.name}</b><small>{[item.phone && maskPhone(item.phone), item.neighborhood].filter(Boolean).join(' · ')}</small></span>
                                </button></li>)}
                                {!vm.patientResults.length && <li className={styles.noResult}>Nenhum paciente com esse nome.</li>}
                            </ul>}
                            <ButtonLink to="/pacientes/novo?agendar=1" variant="ghost" size="sm" icon={UserPlus} className={styles.newPatient}>Cadastrar novo paciente</ButtonLink>
                        </>}
                </Card>
                <Card title={<span className={styles.sectionTitle}><Sparkles aria-hidden="true"/>Dentista e procedimento</span>}>
                    <div className={styles.stack}>
                        <div className={styles.field}>
                            <span className={styles.label} id="dentist_label">Dentista</span>
                            <Chips label="Dentista" options={vm.dentistOptions} value={form.dentistId} onChange={value => vm.change('dentistId', value ?? '')}/>
                            {vm.errors.dentistId && <p className={styles.error} role="alert">{vm.errors.dentistId}</p>}
                        </div>
                        <Field label="Procedimento" error={vm.errors.procedureId}>
                            <Select value={form.procedureId} onChange={event => vm.change('procedureId', event.target.value)}>
                                <option value="">Escolha o procedimento</option>
                                {vm.procedures.map(item => <option key={item.id} value={item.id}>{item.name}{item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}{item.price ? ` · ${brl(item.price)}` : ''}</option>)}
                            </Select>
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
                            : vm.freeSlots.length ? <div className={styles.slotList}>{vm.freeSlots.map(time => <button key={time} type="button" aria-pressed={form.time === time} onClick={() => vm.change('time', time)}>{time}</button>)}</div>
                            : <p className={styles.muted}>Não há horário livre neste dia. Escolha outro dia ou informe o horário manualmente.</p>}
                    </div>}
                    {vm.conflicts.length > 0 && <Alert tone="warning" title="Este horário já está ocupado">{vm.conflicts.map(item => `${item.time} · ${item.patientName}`).join('; ')}. Você pode salvar mesmo assim, mas confira com o dentista.</Alert>}
                </Card>
                <Card title={<span className={styles.sectionTitle}><StickyNote aria-hidden="true"/>Observação</span>}>
                    <Field label="Observação" optional error={vm.errors.notes} hint={`${form.notes.length} de 255 caracteres`}>
                        <Textarea value={form.notes} maxLength={255} onChange={event => vm.change('notes', event.target.value)} placeholder="Ex.: prefere atendimento pela manhã"/>
                    </Field>
                </Card>
            </div>
            <div className={styles.footer}>
                <ButtonLink to={vm.cancelLink} variant="secondary">Cancelar</ButtonLink>
                <Button type="submit" size="lg" busy={vm.busy}>{vm.editing ? 'Salvar alterações' : 'Agendar consulta'}</Button>
            </div>
        </form>
    </>;
}
