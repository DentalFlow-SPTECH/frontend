import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { budgetTotal, dateLabel, money } from '../../../demo/format.js';
import { patientFieldLabels } from '../../../demo/patient.js';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, uiStyles } from '../../../component/ui.jsx';
import { usePatientListViewModel } from '../view_model/use_patient_list_view_model.js';
import { usePatientDetailViewModel } from '../view_model/use_patient_detail_view_model.js';
import { usePatientFormViewModel } from '../view_model/use_patient_form_view_model.js';
import styles from './patient.module.css';
const groups = [
    { title: 'Dados pessoais', keys: ['name', 'cpf', 'birthDate'] },
    { title: 'Contato', keys: ['phone', 'mobile', 'email'] },
    { title: 'Endereço', keys: ['postalCode', 'street', 'number', 'complement', 'district', 'city', 'state'] },
    { title: 'Informações complementares', keys: ['observation', 'emergencyContact', 'insurance', 'insuranceNumber'] },
];
function ReadError({ message, retry }) {
    return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>;
}
function MissingPatient() {
    return <><PageHeader title="Paciente não encontrado"/><EmptyState title="Este cadastro não está disponível" detail="Volte à lista para consultar os pacientes." action={<ActionLink to="/pacientes">Voltar aos pacientes</ActionLink>}/></>;
}
export function PatientListPage() {
    const { contextPatient, query, search, resource, patients: filtered, changeQuery, clearQuery } = usePatientListViewModel();
    const { busy, error, retry } = resource;
    return <>
    <PageHeader title="Pacientes" description="Consulte os cadastros ou adicione um paciente para agendar e criar orçamentos." action={<ActionLink to={`/pacientes/novo${search}`}>Cadastrar paciente</ActionLink>}/>
    {contextPatient && <div className={styles.context}><Button variant="quiet" onClick={() => clearQuery()}>Ver todos os pacientes</Button></div>}
    <div className={styles.search}><Field id="patient_search" label="Buscar paciente"><input type="search" value={query} onChange={event => changeQuery(event.target.value)} placeholder="Nome, CPF, código ou telefone"/></Field>{!busy && !error && <p role="status">{filtered.length} {filtered.length === 1 ? 'paciente' : 'pacientes'}</p>}</div>
    {busy ? <LoadingState /> : error ? <ReadError message={error} retry={retry}/> : filtered.length ? <ul className={styles.list}>{filtered.map(patient => <li key={patient.id}>
      <div className={styles.identity}><span className={styles.code}>{patient.code}</span><h2><Link to={`/pacientes/${patient.id}${search}`}>{patient.name}</Link></h2></div>
      <dl className={styles.meta}>{patient.birthDate && <div><dt>Nascimento</dt><dd>{dateLabel(patient.birthDate)}</dd></div>}{(patient.mobile || patient.phone) && <div><dt>{patient.mobile ? 'Celular' : 'Telefone'}</dt><dd>{patient.mobile || patient.phone}</dd></div>}{patient.email && <div><dt>E-mail</dt><dd>{patient.email}</dd></div>}</dl>
      <ActionLink variant="secondary" to={`/orcamentos?paciente=${patient.id}`}>Ver orçamentos<span className={styles.hidden}> de {patient.name}</span></ActionLink>
    </li>)}</ul> : <EmptyState title={query ? 'Nenhum paciente encontrado' : 'Ainda não há pacientes'} detail={query ? 'Tente outro nome, CPF, código ou telefone.' : 'Cadastre um paciente para começar.'} action={query ? <Button variant="secondary" onClick={() => clearQuery()}>Limpar busca</Button> : <ActionLink to="/pacientes/novo">Cadastrar primeiro paciente</ActionLink>}/>}
  </>;
}
export function PatientDetailPage() {
    const { patient, budgets, search, resource } = usePatientDetailViewModel();
    if (resource.busy)
        return <LoadingState />;
    if (resource.error)
        return <ReadError message={resource.error} retry={resource.retry}/>;
    if (!patient)
        return <MissingPatient />;
    return <>
    <Link className={uiStyles.back} to={`/pacientes${search}`}>← Voltar aos pacientes</Link>
    <PageHeader eyebrow={patient.code} title={patient.name} action={<ActionLink to={`/pacientes/${patient.id}/editar${search}`}>Editar cadastro</ActionLink>}/>
    {groups.map(group => {
            const filled = group.keys.filter(key => key !== 'name' && patient[key]);
            return filled.length > 0 && <section key={group.title} className={styles.detailSection} aria-label={group.title}><h2>{group.title}</h2><dl className={styles.definition}>{filled.map(key => <div key={key} className={key === 'observation' ? styles.full : undefined}><dt>{patientFieldLabels[key]}</dt><dd>{key === 'birthDate' ? dateLabel(patient[key]) : patient[key]}</dd></div>)}</dl></section>;
        })}
    <section className={styles.detailSection} aria-labelledby="patient_budgets"><div className={styles.sectionHeading}><h2 id="patient_budgets">Orçamentos</h2><div className={styles.relatedActions}><ActionLink to={`/orcamentos/novo?paciente=${patient.id}`}>Criar orçamento</ActionLink><ActionLink variant="secondary" to={`/orcamentos?paciente=${patient.id}`}>Ver orçamentos</ActionLink></div></div>
      {budgets.length ? <ul className={styles.budgetList}>{budgets.map(budget => <li key={budget.id}><Link to={`/orcamentos/${budget.id}`} aria-label={`Ver orçamento ${budget.code}`}>{budget.code}</Link><time dateTime={budget.createdOn}>{dateLabel(budget.createdOn)}</time><strong>{money(budgetTotal(budget.items))}</strong></li>)}</ul> : <p className={uiStyles.muted}>Ainda não há orçamentos para este paciente.</p>}
    </section>
    {patient.history.length > 0 && <section className={styles.detailSection} aria-labelledby="patient_history"><h2 id="patient_history">Histórico cadastral</h2><HistoryList entries={patient.history}/></section>}
  </>;
}
export function PatientFormPage() {
    const { id } = useParams();
    return <PatientForm key={id ?? 'new'} id={id}/>;
}
function PatientForm({ id }) {
    const { search, resource, source, fields, nameError, saveError, saving, saved, change, submit, returnTo } = usePatientFormViewModel(id);
    const saveFeedback = useRef(null);
    useEffect(() => { if (saveError)
        saveFeedback.current?.focus(); }, [saveError]);
    async function handleSubmit(event) {
        event.preventDefault();
        const focusTarget = await submit();
        if (focusTarget)
            document.getElementById(focusTarget)?.focus();
    }
    if (saved)
        return <>
    <PageHeader title={id ? 'Cadastro atualizado' : 'Paciente cadastrado'}/>
    <Feedback tone="success">{saved.name} {id ? 'teve o cadastro salvo.' : 'está disponível para criar orçamentos.'}</Feedback>
    <div className={uiStyles.formActions}><ActionLink to={`/pacientes/${saved.id}${search}`}>Ver paciente</ActionLink><ActionLink variant="secondary" to={`/orcamentos/novo?paciente=${saved.id}`}>Criar orçamento</ActionLink><ActionLink variant="secondary" to={`/orcamentos?paciente=${saved.id}`}>Ver orçamentos</ActionLink><ActionLink variant="quiet" to={`/pacientes${search}`}>Voltar aos pacientes</ActionLink></div>
  </>;
    if (resource.busy)
        return <LoadingState />;
    if (resource.error)
        return <ReadError message={resource.error} retry={resource.retry}/>;
    if (id && !source)
        return <MissingPatient />;
    return <>
    <Link className={uiStyles.back} to={returnTo}>← {id ? 'Voltar ao paciente' : 'Voltar aos pacientes'}</Link>
    <PageHeader eyebrow={source?.code} title={id ? 'Editar paciente' : 'Novo paciente'}/>
    <p className={styles.formHint}>Preencha o nome completo. Os demais campos são opcionais.</p>
    <form onSubmit={handleSubmit} noValidate>
      {saveError && <div ref={saveFeedback} tabIndex={-1} className={styles.formFeedback}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      {groups.map(group => <fieldset key={group.title} className={styles.formSection} disabled={saving}><legend>{group.title}</legend><div className={uiStyles.formGrid}>
        {group.keys.map(key => <div key={key} className={key === 'name' || key === 'street' || key === 'observation' || key === 'emergencyContact' ? uiStyles.full : undefined}>
          <Field id={`patient_${key}`} label={`${patientFieldLabels[key]} (${key === 'name' ? 'obrigatório' : 'opcional'})`} error={key === 'name' ? nameError : undefined}>
            {key === 'observation' ? <textarea rows={3} value={fields[key]} onChange={event => change(key, event.target.value)}/> : <input type={key === 'birthDate' ? 'date' : key === 'phone' || key === 'mobile' ? 'tel' : key === 'email' ? 'email' : 'text'} autoComplete={{ name: 'name', birthDate: 'bday', phone: 'tel', mobile: 'tel', email: 'email', postalCode: 'postal-code', city: 'address-level2', state: 'address-level1' }[key] ?? 'off'} required={key === 'name'} value={fields[key]} onChange={event => change(key, event.target.value)}/>}
          </Field>
        </div>)}
      </div></fieldset>)}
      <div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Salvando paciente…' : 'Salvar paciente'}</Button><ActionLink variant="secondary" to={returnTo}>Cancelar</ActionLink></div>
    </form>
  </>;
}
