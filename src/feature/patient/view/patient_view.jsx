import { Link } from 'react-router-dom';
import { CalendarPlus, Cake, ChevronRight, IdCard, Mail, MapPin, MessageCircle, Pencil, Phone, Search, UserPlus, UserRound, Users } from 'lucide-react';
import { Alert, Avatar, Button, ButtonLink, Card, DefinitionList, EmptyState, ErrorState, ExternalButton, Field, FormGrid, Input, PageHeader, Skeleton } from '../../../component/ui/index.js';
import { ageOf, dateShort, maskCep, maskCpf, maskPhone, telLink, whatsappLink } from '../../../component/format.js';
import { patientSummary } from '../model/patient_model.js';
import { usePatientDetailViewModel, usePatientFormViewModel, usePatientListViewModel } from '../view_model/use_patient_view_models.js';
import styles from './patient.module.css';

export function PatientListPage() {
    const vm = usePatientListViewModel();
    return <>
        <PageHeader title="Pacientes" subtitle={vm.loading ? 'Carregando…' : `${vm.total} ${vm.total === 1 ? 'cadastrado' : 'cadastrados'}`}
            actions={<ButtonLink to="/pacientes/novo" icon={UserPlus} className={styles.newDesktop}>Novo paciente</ButtonLink>}/>
        <div className={styles.search}>
            <label htmlFor="patient_search" className="sr-only">Buscar paciente</label>
            <Input id="patient_search" icon={Search} type="search" value={vm.term} onChange={event => vm.setTerm(event.target.value)} placeholder="Buscar pelo nome, CPF ou telefone" autoComplete="off"/>
        </div>
        {vm.error && !vm.total ? <ErrorState error={vm.error} onRetry={vm.reload}/>
            : vm.loading ? <Skeleton rows={8} height={60}/>
            : !vm.total ? <EmptyState icon={Users} title="Nenhum paciente cadastrado" action={<ButtonLink to="/pacientes/novo" icon={UserPlus}>Cadastrar o primeiro paciente</ButtonLink>}>Os pacientes cadastrados aparecem aqui, em ordem alfabética.</EmptyState>
            : !vm.count ? <EmptyState icon={Search} title="Ninguém encontrado" action={<Button variant="secondary" onClick={() => vm.setTerm('')}>Limpar a busca</Button>}>Confira a grafia ou busque pelo CPF ou telefone.</EmptyState>
            : <div className={styles.list}>
                {vm.term && <p className={styles.count} role="status">{vm.count} {vm.count === 1 ? 'paciente encontrado' : 'pacientes encontrados'}</p>}
                {vm.groups.map(group => <section key={group.letter} aria-label={`Letra ${group.letter}`}>
                    <h2 className={styles.letter}>{group.letter}</h2>
                    <ul className={styles.rows}>
                        {group.items.map(patient => {
                            const whatsapp = whatsappLink(patient.phone);
                            return <li key={patient.id} className={styles.row}>
                                <Link to={`/pacientes/${patient.id}`} className={styles.rowMain}>
                                    <Avatar name={patient.name}/>
                                    <span className={styles.rowText}><b>{patient.name}</b><small>{patientSummary(patient) || 'Sem dados adicionais'}</small></span>
                                    <span className={styles.rowPhone}>{patient.phone ? maskPhone(patient.phone) : '—'}</span>
                                    <span className={styles.rowCpf}>{maskCpf(patient.cpf)}</span>
                                    <ChevronRight aria-hidden="true" className={styles.chevron}/>
                                </Link>
                                {whatsapp && <a className={styles.whats} href={whatsapp} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${patient.name}`}><MessageCircle aria-hidden="true"/></a>}
                            </li>;
                        })}
                    </ul>
                </section>)}
                {vm.hasMore && <Button variant="secondary" block onClick={vm.showMore}>Mostrar mais pacientes</Button>}
            </div>}
        <ButtonLink to="/pacientes/novo" icon={UserPlus} className={styles.fab}>Novo paciente</ButtonLink>
    </>;
}

export function PatientDetailPage() {
    const vm = usePatientDetailViewModel();
    if (vm.error && !vm.patient)
        return <><PageHeader title="Paciente" back={{ to: '/pacientes', label: 'Pacientes' }}/><ErrorState error={vm.error} onRetry={vm.reload}/></>;
    if (vm.loading || !vm.patient)
        return <><PageHeader title="Paciente" back={{ to: '/pacientes', label: 'Pacientes' }}/><Skeleton rows={3} height={140}/></>;
    const { patient } = vm;
    const age = ageOf(patient.birthDate);
    const whatsapp = whatsappLink(patient.phone);
    const tel = telLink(patient.phone);
    return <>
        <PageHeader title={patient.name} back={{ to: '/pacientes', label: 'Pacientes' }}
            actions={<ButtonLink to={`/pacientes/${patient.id}/editar`} variant="secondary" icon={Pencil}>Editar</ButtonLink>}/>
        <div className={styles.detail}>
            <Card className={styles.profile}>
                <Avatar name={patient.name} size="xl"/>
                <div><p className={styles.profileName}>{patient.name}</p><p className={styles.muted}>{[age !== null && `${age} anos`, patient.neighborhood].filter(Boolean).join(' · ')}</p></div>
                <div className={styles.profileActions}>
                    <ButtonLink to={`/agenda/nova?paciente=${patient.id}`} icon={CalendarPlus}>Agendar consulta</ButtonLink>
                    {whatsapp && <ExternalButton href={whatsapp} variant="whatsapp" icon={MessageCircle}>WhatsApp</ExternalButton>}
                    {tel && <a href={tel} className={styles.callLink}><Phone aria-hidden="true"/>Ligar</a>}
                </div>
            </Card>
            <div className={styles.cards}>
                <Card title="Contato"><DefinitionList items={[{ icon: Phone, label: 'Celular', value: patient.phone && maskPhone(patient.phone) }, { icon: Mail, label: 'E-mail', value: patient.email }]}/></Card>
                <Card title="Documento"><DefinitionList items={[{ icon: IdCard, label: 'CPF', value: maskCpf(patient.cpf) }, { icon: Cake, label: 'Nascimento', value: patient.birthDate && `${dateShort(patient.birthDate)}${age !== null ? ` · ${age} anos` : ''}` }]}/></Card>
                <Card title="Endereço"><DefinitionList items={[{ icon: MapPin, label: 'Rua e número', value: patient.address }, { icon: MapPin, label: 'Bairro e CEP', value: `${patient.neighborhood} · ${maskCep(patient.zipCode)}` }]}/></Card>
            </div>
        </div>
    </>;
}

export function PatientFormPage() {
    const vm = usePatientFormViewModel();
    const title = vm.editing ? 'Editar paciente' : 'Novo paciente';
    if (vm.error && !vm.form)
        return <><PageHeader title={title} back={{ to: vm.backLink, label: 'Voltar' }}/><ErrorState error={vm.error} onRetry={vm.reload}/></>;
    if (vm.loading || !vm.form)
        return <><PageHeader title={title} back={{ to: vm.backLink, label: 'Voltar' }}/><Skeleton rows={3} height={160}/></>;
    const { form, errors } = vm;
    const input = (field, props = {}) => <Input value={form[field]} onChange={event => vm.change(field, event.target.value)} {...props}/>;
    return <>
        <PageHeader title={title} back={{ to: vm.backLink, label: vm.editing ? 'Ficha do paciente' : 'Voltar' }}/>
        <form className={styles.form} noValidate onSubmit={event => { event.preventDefault(); vm.submit(); }}>
            {vm.failure && <Alert tone="danger" title="Não foi possível salvar">{vm.failure}</Alert>}
            {Object.keys(errors).some(key => errors[key]) && <Alert tone="warning">Confira os campos destacados abaixo.</Alert>}
            <Card title={<span className={styles.sectionTitle}><UserRound aria-hidden="true"/>Quem é o paciente</span>}>
                <FormGrid>
                    <Field label="Nome completo" error={errors.name} className="full">{input('name', { autoComplete: 'name', maxLength: 100 })}</Field>
                    <Field label="CPF" error={errors.cpf}>{input('cpf', { inputMode: 'numeric', placeholder: '000.000.000-00' })}</Field>
                    <Field label="Data de nascimento" optional error={errors.birthDate}>{input('birthDate', { type: 'date' })}</Field>
                </FormGrid>
            </Card>
            <Card title={<span className={styles.sectionTitle}><MessageCircle aria-hidden="true"/>Como falar com ele(a)</span>}>
                <FormGrid>
                    <Field label="Celular / WhatsApp" optional error={errors.phone}>{input('phone', { inputMode: 'tel', autoComplete: 'tel', placeholder: '(00) 00000-0000' })}</Field>
                    <Field label="E-mail" optional error={errors.email}>{input('email', { type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'nome@email.com' })}</Field>
                </FormGrid>
            </Card>
            <Card title={<span className={styles.sectionTitle}><MapPin aria-hidden="true"/>Endereço</span>}>
                <FormGrid>
                    <Field label="CEP" error={errors.zipCode}>{input('zipCode', { inputMode: 'numeric', autoComplete: 'postal-code', placeholder: '00000-000' })}</Field>
                    <Field label="Bairro" error={errors.neighborhood}>{input('neighborhood', { maxLength: 80 })}</Field>
                    <Field label="Rua e número" error={errors.address} className="full">{input('address', { autoComplete: 'street-address', maxLength: 150 })}</Field>
                </FormGrid>
            </Card>
            <div className={styles.footer}>
                <ButtonLink to={vm.backLink} variant="secondary">Cancelar</ButtonLink>
                <Button type="submit" size="lg" busy={vm.busy}>{vm.editing ? 'Salvar alterações' : 'Salvar paciente'}</Button>
            </div>
        </form>
    </>;
}
