import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { budgetTotal, dateLabel, money } from '../../../demo/format.js';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../../component/ui.jsx';
import styles from './doctor.module.css';
import { labels, fields } from '../model/doctor_model.js';
import { useDoctorListViewModel, useDoctorDetailViewModel, useDoctorFormViewModel } from '../view_model/use_doctor_view_model.js';
function ReadError({ message, retry }) { return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>; }
function MissingDoctor() { return <><PageHeader title="Doutor não encontrado"/><EmptyState title="Este cadastro não está disponível" detail="Volte à lista para consultar os profissionais." action={<ActionLink to="/doutores">Voltar aos doutores</ActionLink>}/></>; }
export function DoctorListPage() {
    const { changeQuery, clearQuery, query, search, resource, filtered } = useDoctorListViewModel();
    return <>
    <PageHeader title="Doutores" description="Consulte os profissionais, seus dados e atendimentos." action={<ActionLink to={`/doutores/novo${search}`}>Cadastrar doutor</ActionLink>}/>
    <div className={styles.search}><Field id="doctor_search" label="Buscar doutor"><input type="search" value={query} onChange={event => changeQuery(event.target.value)} placeholder="Nome, especialidade, CPF ou CRO"/></Field>{query && filtered.length > 0 && <Button variant="quiet" onClick={() => clearQuery()}>Limpar busca</Button>}{!resource.busy && !resource.error && <p role="status">{filtered.length} {filtered.length === 1 ? 'profissional' : 'profissionais'}</p>}</div>
    {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : filtered.length ? <ul className={styles.list}>{filtered.map(doctor => <li key={doctor.id}>
      <div className={styles.identity}><h2><Link to={`/doutores/${doctor.id}${search}`}>{doctor.name}</Link></h2><p>{doctor.specialty || 'Especialidade não informada'}</p></div>
      <dl className={styles.meta}>{doctor.cro && <div><dt>CRO</dt><dd>{doctor.cro}</dd></div>}{doctor.phone && <div><dt>Telefone</dt><dd>{doctor.phone}</dd></div>}{doctor.status && <div><dt>Status profissional</dt><dd>{doctor.status}</dd></div>}</dl>
      <ActionLink variant="secondary" to={`/agenda?doutor=${doctor.id}`}>Ver agenda<span className={styles.hidden}> de {doctor.name}</span></ActionLink>
    </li>)}</ul> : <EmptyState title={query ? 'Nenhum doutor encontrado' : 'Ainda não há doutores'} detail={query ? 'Tente outro nome, especialidade, CPF ou CRO.' : 'Cadastre um profissional para vinculá-lo aos atendimentos e orçamentos.'} action={query ? <Button variant="secondary" onClick={() => clearQuery()}>Limpar busca</Button> : <ActionLink to="/doutores/novo">Cadastrar primeiro doutor</ActionLink>}/>}
  </>;
}
export function DoctorDetailPage() {
    const { search, data, resource, doctor, budgets, appointments } = useDoctorDetailViewModel();
    if (resource.busy)
        return <LoadingState />;
    if (resource.error)
        return <ReadError message={resource.error} retry={resource.retry}/>;
    if (!doctor)
        return <MissingDoctor />;
    return <>
    <Link className={uiStyles.back} to={`/doutores${search}`}>← Voltar aos doutores</Link>
    <PageHeader title={doctor.name} description={doctor.specialty || undefined} action={<ActionLink to={`/doutores/${doctor.id}/editar${search}`}>Editar cadastro</ActionLink>}/>
    <section className={styles.section} aria-labelledby="doctor_information"><h2 id="doctor_information">Dados profissionais</h2><dl className={uiStyles.definition}>{fields.filter(key => key !== 'name').map(key => <div key={key}><dt>{labels[key]}</dt><dd>{doctor[key] || 'Não informado'}</dd></div>)}</dl></section>
    <section className={styles.section} aria-labelledby="doctor_appointments"><div className={styles.sectionHeading}><h2 id="doctor_appointments">Consultas</h2><ActionLink variant="secondary" to={`/agenda?doutor=${doctor.id}`}>Ver agenda</ActionLink></div>
      {appointments.length ? <ul className={styles.appointments}>{appointments.map(appointment => <li key={appointment.id}><div><Link to={`/agenda/${appointment.id}`}>{data.patients.find(patient => patient.id === appointment.patientId)?.name || 'Paciente não disponível'}</Link><p>{appointment.procedure || 'Procedimento não informado'}</p></div><time dateTime={`${appointment.date}T${appointment.time}`}>{dateLabel(appointment.date)} · {appointment.time}</time>{appointment.status && <StatusLabel>{appointment.status}</StatusLabel>}</li>)}</ul> : <p className={uiStyles.muted}>Ainda não há consultas para este profissional.</p>}
    </section>
    <section className={styles.section} aria-labelledby="doctor_budgets"><h2 id="doctor_budgets">Orçamentos</h2>{budgets.length ? <ul className={styles.budgets}>{budgets.map(budget => <li key={budget.id}><div><Link to={`/orcamentos/${budget.id}`} aria-label={`Ver orçamento ${budget.code}`}>{budget.code}</Link><p>{data.patients.find(patient => patient.id === budget.patientId)?.name || 'Paciente não disponível'}</p></div><time dateTime={budget.createdOn}>{dateLabel(budget.createdOn)}</time><strong>{money(budgetTotal(budget.items))}</strong></li>)}</ul> : <p className={uiStyles.muted}>Ainda não há orçamentos para este profissional.</p>}</section>
    <section className={styles.section} aria-labelledby="doctor_history"><h2 id="doctor_history">Histórico cadastral</h2><HistoryList entries={doctor.history ?? []}/></section>
  </>;
}
export function DoctorFormPage() { const { id } = useParams(); return <DoctorForm key={id ?? 'new'} id={id}/>; }
function DoctorForm({ id }) {
    const { search, resource, source, values, nameError, change, saveError, saving, saved, submit, returnTo } = useDoctorFormViewModel({ id });
    async function handleSubmit(event) { event.preventDefault(); const target = await submit(); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    const saveFeedback = useRef(null);
    useEffect(() => {
        if (saveError)
            saveFeedback.current?.focus();
    }, [saveError]);
    if (saved)
        return <><PageHeader title={id ? 'Cadastro atualizado' : 'Doutor cadastrado'}/><Feedback tone="success">{saved.name} {id ? 'teve o cadastro salvo.' : 'está disponível para atendimentos e orçamentos.'}</Feedback><div className={uiStyles.formActions}><ActionLink to={`/doutores/${saved.id}${search}`}>Ver doutor</ActionLink><ActionLink variant="secondary" to={`/agenda?doutor=${saved.id}`}>Ver agenda</ActionLink><ActionLink variant="quiet" to={`/doutores${search}`}>Voltar aos doutores</ActionLink></div></>;
    if (resource.busy)
        return <LoadingState />;
    if (resource.error)
        return <ReadError message={resource.error} retry={resource.retry}/>;
    if (id && !source)
        return <MissingDoctor />;
    return <>
    <Link className={uiStyles.back} to={returnTo}>← {id ? 'Voltar ao doutor' : 'Voltar aos doutores'}</Link>
    <PageHeader title={id ? 'Editar doutor' : 'Novo doutor'}/>
    <p className={styles.hint}>Preencha o nome completo. Os demais campos são opcionais.</p>
    <form onSubmit={handleSubmit} noValidate>
      {saveError && <div ref={saveFeedback} tabIndex={-1} className={styles.feedback}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      <fieldset className={styles.formSection} disabled={saving}><legend>Dados profissionais</legend><div className={uiStyles.formGrid}>{fields.map(key => <div key={key} className={key === 'name' ? uiStyles.full : undefined}><Field id={`doctor_${key}`} label={`${labels[key]} (${key === 'name' ? 'obrigatório' : 'opcional'})`} error={key === 'name' ? nameError : undefined}><input type={key === 'phone' ? 'tel' : key === 'email' ? 'email' : 'text'} autoComplete={key === 'name' ? 'name' : key === 'phone' ? 'tel' : key === 'email' ? 'email' : 'off'} required={key === 'name'} value={values[key]} onChange={event => change(key, event.target.value)}/></Field></div>)}</div></fieldset>
      <div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Salvando doutor…' : 'Salvar doutor'}</Button><ActionLink variant="secondary" to={returnTo}>Cancelar</ActionLink></div>
    </form>
  </>;
}
