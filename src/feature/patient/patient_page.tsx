import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useDemo } from '../../demo/store';
import { budgetTotal, dateLabel, money, normalize } from '../../demo/format';
import type { Patient, PatientInput } from '../../demo/model';
import { emptyPatientInput, patientFieldLabels } from '../../demo/patient';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, uiStyles } from '../../component/ui';
import { useResource } from '../../component/use_resource';
import { useUnsaved } from '../../component/use_unsaved';
import styles from './patient.module.css';

const groups: { title: string; keys: (keyof PatientInput)[] }[] = [
  { title: 'Dados pessoais', keys: ['name', 'cpf', 'birthDate'] },
  { title: 'Contato', keys: ['phone', 'mobile', 'email'] },
  { title: 'Endereço', keys: ['postalCode', 'street', 'number', 'complement', 'district', 'city', 'state'] },
  { title: 'Informações complementares', keys: ['observation', 'emergencyContact', 'insurance', 'insuranceNumber'] },
];
function ReadError({ message, retry }: { message: string; retry: () => void }) {
  return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>;
}
function MissingPatient() {
  return <><PageHeader title="Paciente não encontrado" /><EmptyState title="Este cadastro não está disponível" detail="Volte à lista para consultar os pacientes." action={<ActionLink to="/pacientes">Voltar aos pacientes</ActionLink>} /></>;
}
export function PatientListPage() {
  const { data } = useDemo();
  const [params, setParams] = useSearchParams();
  const contextPatient = data.patients.find(patient => patient.id === params.get('paciente'));
  const query = params.get('q') ?? contextPatient?.name ?? '';
  const search = query ? `?q=${encodeURIComponent(query)}` : '';
  const { busy, error, retry } = useResource('patients');
  const filtered = data.patients.filter(patient => {
    const textMatch = normalize(`${patient.name} ${patient.code} ${patient.cpf} ${patient.phone} ${patient.mobile}`).includes(normalize(query));
    const digits = query.replace(/\D/g, '');
    return textMatch || (/^[\d\s().+\-]+$/.test(query) && digits.length > 0 && [patient.cpf, patient.phone, patient.mobile].some(value => value.replace(/\D/g, '').includes(digits)));
  });
  return <>
    <PageHeader title="Pacientes" description="Consulte os cadastros ou adicione um paciente para agendar e criar orçamentos." action={<ActionLink to={`/pacientes/novo${search}`}>Cadastrar paciente</ActionLink>} />
    {contextPatient && <div className={styles.context}><Button variant="quiet" onClick={() => setParams({})}>Ver todos os pacientes</Button></div>}
    <div className={styles.search}><Field id="patient_search" label="Buscar paciente"><input type="search" value={query} onChange={event => setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })} placeholder="Nome, CPF, código ou telefone" /></Field>{!busy && !error && <p role="status">{filtered.length} {filtered.length === 1 ? 'paciente' : 'pacientes'}</p>}</div>
    {busy ? <LoadingState /> : error ? <ReadError message={error} retry={retry} /> : filtered.length ? <ul className={styles.list}>{filtered.map(patient => <li key={patient.id}>
      <div className={styles.identity}><span className={styles.code}>{patient.code}</span><h2><Link to={`/pacientes/${patient.id}${search}`}>{patient.name}</Link></h2></div>
      <dl className={styles.meta}>{patient.birthDate && <div><dt>Nascimento</dt><dd>{dateLabel(patient.birthDate)}</dd></div>}{(patient.mobile || patient.phone) && <div><dt>{patient.mobile ? 'Celular' : 'Telefone'}</dt><dd>{patient.mobile || patient.phone}</dd></div>}{patient.email && <div><dt>E-mail</dt><dd>{patient.email}</dd></div>}</dl>
      <ActionLink variant="secondary" to={`/orcamentos?paciente=${patient.id}`}>Ver orçamentos<span className={styles.hidden}> de {patient.name}</span></ActionLink>
    </li>)}</ul> : <EmptyState title={query ? 'Nenhum paciente encontrado' : 'Ainda não há pacientes'} detail={query ? 'Tente outro nome, CPF, código ou telefone.' : 'Cadastre um paciente para começar.'} action={query ? <Button variant="secondary" onClick={() => setParams({})}>Limpar busca</Button> : <ActionLink to="/pacientes/novo">Cadastrar primeiro paciente</ActionLink>} />}
  </>;
}

export function PatientDetailPage() {
  const { id } = useParams();
  const { search } = useLocation();
  const { data } = useDemo();
  const resource = useResource(`patient:${id}`);
  const patient = data.patients.find(value => value.id === id);
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ReadError message={resource.error} retry={resource.retry} />;
  if (!patient) return <MissingPatient />;
  const budgets = data.budgets.filter(value => value.patientId === patient.id).sort((a, b) => b.createdOn.localeCompare(a.createdOn));
  return <>
    <Link className={uiStyles.back} to={`/pacientes${search}`}>← Voltar aos pacientes</Link>
    <PageHeader eyebrow={patient.code} title={patient.name} action={<ActionLink to={`/pacientes/${patient.id}/editar${search}`}>Editar cadastro</ActionLink>} />
    {groups.map(group => {
      const filled = group.keys.filter(key => key !== 'name' && patient[key]);
      return filled.length > 0 && <section key={group.title} className={styles.detailSection} aria-label={group.title}><h2>{group.title}</h2><dl className={styles.definition}>{filled.map(key => <div key={key} className={key === 'observation' ? styles.full : undefined}><dt>{patientFieldLabels[key]}</dt><dd>{key === 'birthDate' ? dateLabel(patient[key]) : patient[key]}</dd></div>)}</dl></section>;
    })}
    <section className={styles.detailSection} aria-labelledby="patient_budgets"><div className={styles.sectionHeading}><h2 id="patient_budgets">Orçamentos</h2><div className={styles.relatedActions}><ActionLink to={`/orcamentos/novo?paciente=${patient.id}`}>Criar orçamento</ActionLink><ActionLink variant="secondary" to={`/orcamentos?paciente=${patient.id}`}>Ver orçamentos</ActionLink></div></div>
      {budgets.length ? <ul className={styles.budgetList}>{budgets.map(budget => <li key={budget.id}><Link to={`/orcamentos/${budget.id}`} aria-label={`Ver orçamento ${budget.code}`}>{budget.code}</Link><time dateTime={budget.createdOn}>{dateLabel(budget.createdOn)}</time><strong>{money(budgetTotal(budget.items))}</strong></li>)}</ul> : <p className={uiStyles.muted}>Ainda não há orçamentos para este paciente.</p>}
    </section>
    {patient.history.length > 0 && <section className={styles.detailSection} aria-labelledby="patient_history"><h2 id="patient_history">Histórico cadastral</h2><HistoryList entries={patient.history} /></section>}
  </>;
}

export function PatientFormPage() {
  const { id } = useParams();
  return <PatientForm key={id ?? 'new'} id={id} />;
}
function PatientForm({ id }: { id?: string }) {
  const { data, savePatient } = useDemo();
  const { search } = useLocation();
  const resource = useResource(`patient-form:${id ?? 'new'}`);
  const source = data.patients.find(value => value.id === id);
  const [initial] = useState<PatientInput>(() => Object.fromEntries((Object.keys(emptyPatientInput) as (keyof PatientInput)[]).map(key => [key, source?.[key] ?? ''])) as unknown as PatientInput);
  const [fields, setFields] = useState(initial);
  const [nameError, setNameError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Patient | null>(null);
  const saveFeedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (saveError) saveFeedback.current?.focus(); }, [saveError]);
  const dirty = !saved && (Object.keys(emptyPatientInput) as (keyof PatientInput)[]).some(key => fields[key] !== initial[key]);
  useUnsaved(dirty, saving);
  function change(key: keyof PatientInput, value: string) {
    setFields(previous => ({ ...previous, [key]: value }));
    if (key === 'name') setNameError('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || saved) return;
    setSaveError('');
    if (!fields.name.trim()) { setNameError('Informe o nome completo do paciente.'); document.getElementById('patient_name')?.focus(); return; }
    setSaving(true);
    try { setSaved(await savePatient({ ...fields, name: fields.name.trim() }, id)); }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.'); }
    finally { setSaving(false); }
  }
  if (saved) return <>
    <PageHeader title={id ? 'Cadastro atualizado' : 'Paciente cadastrado'} />
    <Feedback tone="success">{saved.name} {id ? 'teve o cadastro salvo.' : 'está disponível para criar orçamentos.'}</Feedback>
    <div className={uiStyles.formActions}><ActionLink to={`/pacientes/${saved.id}${search}`}>Ver paciente</ActionLink><ActionLink variant="secondary" to={`/orcamentos/novo?paciente=${saved.id}`}>Criar orçamento</ActionLink><ActionLink variant="secondary" to={`/orcamentos?paciente=${saved.id}`}>Ver orçamentos</ActionLink><ActionLink variant="quiet" to={`/pacientes${search}`}>Voltar aos pacientes</ActionLink></div>
  </>;
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ReadError message={resource.error} retry={resource.retry} />;
  if (id && !source) return <MissingPatient />;
  const returnTo = id ? `/pacientes/${id}${search}` : `/pacientes${search}`;
  return <>
    <Link className={uiStyles.back} to={returnTo}>← {id ? 'Voltar ao paciente' : 'Voltar aos pacientes'}</Link>
    <PageHeader eyebrow={source?.code} title={id ? 'Editar paciente' : 'Novo paciente'} />
    <p className={styles.formHint}>Preencha o nome completo. Os demais campos são opcionais.</p>
    <form onSubmit={submit} noValidate>
      {saveError && <div ref={saveFeedback} tabIndex={-1} className={styles.formFeedback}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      {groups.map(group => <fieldset key={group.title} className={styles.formSection} disabled={saving}><legend>{group.title}</legend><div className={uiStyles.formGrid}>
        {group.keys.map(key => <div key={key} className={key === 'name' || key === 'street' || key === 'observation' || key === 'emergencyContact' ? uiStyles.full : undefined}>
          <Field id={`patient_${key}`} label={`${patientFieldLabels[key]} (${key === 'name' ? 'obrigatório' : 'opcional'})`} error={key === 'name' ? nameError : undefined}>
            {key === 'observation' ? <textarea rows={3} value={fields[key]} onChange={event => change(key, event.target.value)} /> : <input type={key === 'birthDate' ? 'date' : key === 'phone' || key === 'mobile' ? 'tel' : key === 'email' ? 'email' : 'text'} autoComplete={({ name: 'name', birthDate: 'bday', phone: 'tel', mobile: 'tel', email: 'email', postalCode: 'postal-code', city: 'address-level2', state: 'address-level1' } as Partial<Record<keyof PatientInput, string>>)[key] ?? 'off'} required={key === 'name'} value={fields[key]} onChange={event => change(key, event.target.value)} />}
          </Field>
        </div>)}
      </div></fieldset>)}
      <div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Salvando paciente…' : 'Salvar paciente'}</Button><ActionLink variant="secondary" to={returnTo}>Cancelar</ActionLink></div>
    </form>
  </>;
}
