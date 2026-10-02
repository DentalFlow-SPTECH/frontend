import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDemo } from '../../demo/store';
import { dateLabel, normalize } from '../../demo/format';
import { ActionLink, Button, EmptyState, Feedback, Field, LoadingState, PageHeader } from '../../component/ui';
import { useResource } from '../../component/use_resource';
import styles from './patient.module.css';
export function PatientListPage() {
  const { data } = useDemo();
  const [params, setParams] = useSearchParams();
  const contextPatient = data.patients.find(patient => patient.id === params.get('paciente'));
  const [query, setQuery] = useState(contextPatient?.name ?? '');
  const { busy, error, retry } = useResource('patients');
  const filtered = data.patients.filter(patient => normalize(`${patient.name} ${patient.code} ${patient.phone}`).includes(normalize(query)));
  return <>
    <PageHeader title="Pacientes" />
    {contextPatient && <div className={styles.context}><Button variant="quiet" onClick={() => { setQuery(''); setParams({}); }}>Ver todos os pacientes</Button></div>}
    <div className={styles.search}><Field id="patient_search" label="Buscar paciente"><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, código ou telefone" /></Field><p>{filtered.length} {filtered.length === 1 ? 'paciente' : 'pacientes'}</p></div>
    {busy ? <LoadingState /> : error ? <Feedback tone="error" title="Não foi possível carregar">{error}<div><Button variant="secondary" onClick={retry}>Tentar novamente</Button></div></Feedback> : filtered.length ? <ul className={styles.list}>{filtered.map(patient => <li key={patient.id}><div className={styles.identity}><span className={styles.code}>{patient.code}</span><h2>{patient.name}</h2></div><dl className={styles.meta}><div><dt>Nascimento</dt><dd>{dateLabel(patient.birthDate)}</dd></div><div><dt>Telefone</dt><dd>{patient.phone}</dd></div><div><dt>E-mail</dt><dd>{patient.email}</dd></div></dl><ActionLink variant="secondary" to={`/orcamentos?paciente=${patient.id}`}>Ver orçamentos<span className={styles.hidden}> de {patient.name}</span></ActionLink></li>)}</ul> : <EmptyState title="Nenhum paciente encontrado" detail="Tente outro nome, código ou telefone." action={<Button variant="secondary" onClick={() => setQuery('')}>Limpar busca</Button>} />}
  </>;
}
