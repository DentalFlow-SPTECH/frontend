import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useDemo } from '../../demo/store';
import { budgetTotal, dateLabel, money, normalize } from '../../demo/format';
import type { Doctor, DoctorInput } from '../../demo/model';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../component/ui';
import { useResource } from '../../component/use_resource';
import { useUnsaved } from '../../component/use_unsaved';
import styles from './doctor.module.css';

const emptyDoctor: DoctorInput = { name: '', cpf: '', cro: '', specialty: '', phone: '', email: '', status: '' };
const labels: Record<keyof DoctorInput, string> = { name: 'Nome completo', cpf: 'CPF', cro: 'CRO', specialty: 'Especialidade', phone: 'Telefone', email: 'E-mail', status: 'Status profissional' };
const fields = Object.keys(emptyDoctor) as (keyof DoctorInput)[];
function ReadError({ message, retry }: { message: string; retry: () => void }) { return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>; }
function MissingDoctor() { return <><PageHeader title="Doutor não encontrado" /><EmptyState title="Este cadastro não está disponível" detail="Volte à lista para consultar os profissionais." action={<ActionLink to="/doutores">Voltar aos doutores</ActionLink>} /></>; }

export function DoctorListPage() {
  const { data } = useDemo();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const search = query ? `?q=${encodeURIComponent(query)}` : '';
  const resource = useResource('doctors');
  const filtered = data.doctors.filter(doctor => {
    const values = [doctor.name, doctor.specialty, doctor.cpf, doctor.cro, doctor.phone, doctor.email, doctor.status];
    const digits = query.replace(/\D/g, '');
    return normalize(values.filter(Boolean).join(' ')).includes(normalize(query)) || (/^[\d\s().+\-]+$/.test(query) && digits.length > 0 && [doctor.cpf, doctor.phone].some(value => value?.replace(/\D/g, '').includes(digits)));
  });
  return <>
    <PageHeader title="Doutores" description="Profissionais e seus atendimentos na clínica." action={<ActionLink to={`/doutores/novo${search}`}>Novo doutor</ActionLink>} />
    <div className={styles.search}><Field id="doctor_search" label="Buscar doutor"><input type="search" value={query} onChange={event => setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })} placeholder="Nome, especialidade, CPF ou CRO" /></Field>{!resource.busy && !resource.error && <p role="status">{filtered.length} {filtered.length === 1 ? 'profissional' : 'profissionais'}</p>}</div>
    {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry} /> : filtered.length ? <ul className={styles.list}>{filtered.map(doctor => <li key={doctor.id}>
      <div className={styles.identity}><h2><Link to={`/doutores/${doctor.id}${search}`}>{doctor.name}</Link></h2><p>{doctor.specialty || 'Especialidade não informada'}</p></div>
      <dl className={styles.meta}>{doctor.cro && <div><dt>CRO</dt><dd>{doctor.cro}</dd></div>}{doctor.phone && <div><dt>Telefone</dt><dd>{doctor.phone}</dd></div>}{doctor.status && <div><dt>Status profissional</dt><dd>{doctor.status}</dd></div>}</dl>
      <ActionLink variant="secondary" to={`/agenda?doutor=${doctor.id}`}>Ver agenda<span className={styles.hidden}> de {doctor.name}</span></ActionLink>
    </li>)}</ul> : <EmptyState title={query ? 'Nenhum doutor encontrado' : 'Ainda não há doutores'} detail={query ? 'Tente outro nome, especialidade, CPF ou CRO.' : 'Cadastre um profissional para vinculá-lo aos atendimentos e orçamentos.'} action={query ? <Button variant="secondary" onClick={() => setParams({})}>Limpar busca</Button> : <ActionLink to="/doutores/novo">Cadastrar primeiro doutor</ActionLink>} />}
  </>;
}

export function DoctorDetailPage() {
  const { id } = useParams();
  const { search } = useLocation();
  const { data } = useDemo();
  const resource = useResource(`doctor:${id}`);
  const doctor = data.doctors.find(value => value.id === id);
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ReadError message={resource.error} retry={resource.retry} />;
  if (!doctor) return <MissingDoctor />;
  const budgets = data.budgets.filter(value => value.doctorId === doctor.id).sort((a, b) => b.createdOn.localeCompare(a.createdOn));
  const appointments = data.appointments.filter(value => value.doctorId === doctor.id).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  return <>
    <Link className={uiStyles.back} to={`/doutores${search}`}>← Voltar aos doutores</Link>
    <PageHeader title={doctor.name} description={doctor.specialty || undefined} action={<ActionLink to={`/doutores/${doctor.id}/editar${search}`}>Editar cadastro</ActionLink>} />
    <section className={styles.section} aria-labelledby="doctor_information"><h2 id="doctor_information">Dados profissionais</h2><dl className={uiStyles.definition}>{fields.filter(key => key !== 'name').map(key => <div key={key}><dt>{labels[key]}</dt><dd>{doctor[key] || 'Não informado'}</dd></div>)}</dl></section>
    <section className={styles.section} aria-labelledby="doctor_appointments"><div className={styles.sectionHeading}><h2 id="doctor_appointments">Consultas</h2><ActionLink variant="secondary" to={`/agenda?doutor=${doctor.id}`}>Ver agenda</ActionLink></div>
      {appointments.length ? <ul className={styles.appointments}>{appointments.map(appointment => <li key={appointment.id}><div><Link to={`/agenda/${appointment.id}`}>{data.patients.find(patient => patient.id === appointment.patientId)?.name || 'Paciente não disponível'}</Link><p>{appointment.procedure || 'Procedimento não informado'}</p></div><time dateTime={`${appointment.date}T${appointment.time}`}>{dateLabel(appointment.date)} · {appointment.time}</time>{appointment.status && <StatusLabel>{appointment.status}</StatusLabel>}</li>)}</ul> : <p className={uiStyles.muted}>Ainda não há consultas para este profissional.</p>}
    </section>
    <section className={styles.section} aria-labelledby="doctor_budgets"><h2 id="doctor_budgets">Orçamentos</h2>{budgets.length ? <ul className={styles.budgets}>{budgets.map(budget => <li key={budget.id}><div><Link to={`/orcamentos/${budget.id}`} aria-label={`Ver orçamento ${budget.code}`}>{budget.code}</Link><p>{data.patients.find(patient => patient.id === budget.patientId)?.name || 'Paciente não disponível'}</p></div><time dateTime={budget.createdOn}>{dateLabel(budget.createdOn)}</time><strong>{money(budgetTotal(budget.items))}</strong></li>)}</ul> : <p className={uiStyles.muted}>Ainda não há orçamentos para este profissional.</p>}</section>
    <section className={styles.section} aria-labelledby="doctor_history"><h2 id="doctor_history">Histórico cadastral</h2><HistoryList entries={doctor.history ?? []} /></section>
  </>;
}

export function DoctorFormPage() { const { id } = useParams(); return <DoctorForm key={id ?? 'new'} id={id} />; }
function DoctorForm({ id }: { id?: string }) {
  const { data, saveDoctor } = useDemo();
  const { search } = useLocation();
  const resource = useResource(`doctor-form:${id ?? 'new'}`);
  const source = data.doctors.find(value => value.id === id);
  const [initial] = useState<DoctorInput>(() => Object.fromEntries(fields.map(key => [key, source?.[key] ?? ''])) as unknown as DoctorInput);
  const [values, setValues] = useState(initial);
  const [nameError, setNameError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Doctor | null>(null);
  const saveFeedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (saveError) saveFeedback.current?.focus(); }, [saveError]);
  useUnsaved(!saved && fields.some(key => values[key] !== initial[key]), saving);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || saved) return;
    setSaveError('');
    if (!values.name.trim()) { setNameError('Informe o nome completo do doutor.'); document.getElementById('doctor_name')?.focus(); return; }
    setSaving(true);
    try { setSaved(await saveDoctor({ ...values, name: values.name.trim() }, id)); }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.'); }
    finally { setSaving(false); }
  }
  if (saved) return <><PageHeader title={id ? 'Cadastro atualizado' : 'Doutor cadastrado'} /><Feedback tone="success">{saved.name} {id ? 'teve o cadastro salvo.' : 'está disponível para atendimentos e orçamentos.'}</Feedback><div className={uiStyles.formActions}><ActionLink to={`/doutores/${saved.id}${search}`}>Ver doutor</ActionLink><ActionLink variant="secondary" to={`/agenda?doutor=${saved.id}`}>Ver agenda</ActionLink><ActionLink variant="quiet" to={`/doutores${search}`}>Voltar aos doutores</ActionLink></div></>;
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ReadError message={resource.error} retry={resource.retry} />;
  if (id && !source) return <MissingDoctor />;
  const returnTo = id ? `/doutores/${id}${search}` : `/doutores${search}`;
  return <>
    <Link className={uiStyles.back} to={returnTo}>← {id ? 'Voltar ao doutor' : 'Voltar aos doutores'}</Link>
    <PageHeader title={id ? 'Editar doutor' : 'Novo doutor'} />
    <p className={styles.hint}>Preencha o nome completo. Os demais campos são opcionais.</p>
    <form onSubmit={submit} noValidate>
      {saveError && <div ref={saveFeedback} tabIndex={-1} className={styles.feedback}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      <fieldset className={styles.formSection} disabled={saving}><legend>Dados profissionais</legend><div className={uiStyles.formGrid}>{fields.map(key => <div key={key} className={key === 'name' ? uiStyles.full : undefined}><Field id={`doctor_${key}`} label={`${labels[key]} (${key === 'name' ? 'obrigatório' : 'opcional'})`} error={key === 'name' ? nameError : undefined}><input type={key === 'phone' ? 'tel' : key === 'email' ? 'email' : 'text'} required={key === 'name'} value={values[key]} onChange={event => { setValues(previous => ({ ...previous, [key]: event.target.value })); if (key === 'name') setNameError(''); }} /></Field></div>)}</div></fieldset>
      <div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Salvando doutor…' : 'Salvar doutor'}</Button><ActionLink variant="secondary" to={returnTo}>Cancelar</ActionLink></div>
    </form>
  </>;
}
