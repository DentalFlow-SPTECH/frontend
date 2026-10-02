import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../component/ui';
import { useResource } from '../../component/use_resource';
import { useUnsaved } from '../../component/use_unsaved';
import { dateLabel, money, normalize, readMoney, today } from '../../demo/format';
import { isDate } from '../../demo/clinic';
import type { CashInput, CashMovement } from '../../demo/model';
import { useDemo } from '../../demo/store';
import styles from './cash.module.css';

function ReadError({ message, retry }: { message: string; retry: () => void }) {
  return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>;
}

export function CashPage() {
  const { data } = useDemo();
  const resource = useResource('cash');
  const [params, setParams] = useSearchParams();
  const from = params.get('de') ?? '';
  const until = params.get('ate') ?? '';
  const type = params.get('tipo') ?? '';
  const category = params.get('categoria') ?? '';
  const paymentMethod = params.get('forma') ?? '';
  const search = params.size ? `?${params.toString()}` : '';
  const invalidPeriod = !!from && !!until && until < from;
  const filtered = data.cashMovements.filter(movement =>
    (!from || movement.date >= from) && (!until || movement.date <= until) &&
    (!type || movement.type === type) && normalize(movement.category).includes(normalize(category)) &&
    normalize(movement.paymentMethod).includes(normalize(paymentMethod))
  ).sort((a, b) => b.date.localeCompare(a.date));
  const entries = filtered.filter(value => value.type === 'Entrada').reduce((total, value) => total + value.amountCents, 0);
  const exits = filtered.filter(value => value.type === 'Saída').reduce((total, value) => total + value.amountCents, 0);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }
  return <>
    <PageHeader title="Caixa" description="Acompanhe as entradas e saídas registradas." action={<><ActionLink to={`/caixa/entrada${search}`}>Registrar entrada</ActionLink><ActionLink variant="secondary" to={`/caixa/saida${search}`}>Registrar saída</ActionLink></>} />
    <section className={styles.filterSection} aria-labelledby="cash_filters">
      <div className={styles.sectionHeading}><h2 id="cash_filters">Consultar movimentações</h2>{params.size > 0 && <Button variant="quiet" onClick={() => setParams({})}>Limpar filtros</Button>}</div>
      <div className={styles.filters}>
        <Field id="cash_from" label="Data inicial"><input type="date" value={from} onChange={event => filter('de', event.target.value)} /></Field>
        <Field id="cash_until" label="Data final"><input type="date" value={until} onChange={event => filter('ate', event.target.value)} /></Field>
        <Field id="cash_type_filter" label="Tipo de movimentação"><select value={type} onChange={event => filter('tipo', event.target.value)}><option value="">Entradas e saídas</option><option value="Entrada">Entradas</option><option value="Saída">Saídas</option></select></Field>
        <Field id="cash_category_filter" label="Filtrar por categoria"><input type="search" value={category} onChange={event => filter('categoria', event.target.value)} placeholder="Categoria informada" /></Field>
        <Field id="cash_payment_filter" label="Filtrar por forma de pagamento"><input type="search" value={paymentMethod} onChange={event => filter('forma', event.target.value)} placeholder="Forma informada" /></Field>
      </div>
      {invalidPeriod && <div className={styles.periodFeedback}><Feedback tone="warning">A data final deve ser igual ou posterior à data inicial.</Feedback></div>}
    </section>
    {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry} /> : <>
      <dl className={styles.summary} aria-label="Totais das movimentações exibidas">
        <div><dt>Entradas</dt><dd>{money(entries)}</dd></div>
        <div><dt>Saídas</dt><dd>{money(exits)}</dd></div>
        <div className={styles.balance}><dt>Saldo das movimentações</dt><dd>{money(entries - exits)}</dd></div>
      </dl>
      <p className={styles.summaryHint}>Totais das movimentações exibidas. O saldo corresponde às entradas menos as saídas.</p>
      <div className={styles.sectionHeading}><h2>Movimentações</h2><p role="status">{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</p></div>
      {filtered.length ? <ul className={styles.list}>{filtered.map(movement => <li key={movement.id}>
        <div className={styles.identity}><StatusLabel tone={movement.type === 'Entrada' ? 'success' : 'neutral'}>{movement.type}</StatusLabel><h3><Link to={`/caixa/${movement.id}${search}`}>{movement.description}</Link></h3><div className={styles.rowMeta}><time dateTime={movement.date}>{dateLabel(movement.date)}</time>{movement.category && <span>{movement.category}</span>}{movement.paymentMethod && <span>{movement.paymentMethod}</span>}</div></div>
        <strong className={styles.amount}>{money(movement.amountCents)}</strong>
        <ActionLink variant="secondary" to={`/caixa/${movement.id}${search}`} aria-label={`Ver movimentação: ${movement.description}`}>Ver detalhes</ActionLink>
      </li>)}</ul> : <EmptyState title={params.size ? 'Nenhuma movimentação encontrada' : 'Ainda não há movimentações'} detail={params.size ? 'Ajuste os filtros para consultar outros registros.' : 'Registre uma entrada ou uma saída para acompanhar o caixa.'} action={params.size ? <Button variant="secondary" onClick={() => setParams({})}>Limpar filtros</Button> : <ActionLink to="/caixa/entrada">Registrar primeira entrada</ActionLink>} />}
    </>}
  </>;
}

export function CashDetailPage() {
  const { id } = useParams();
  const { search } = useLocation();
  const { data } = useDemo();
  const resource = useResource(`cash:${id}`);
  const movement = data.cashMovements.find(value => value.id === id);
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ReadError message={resource.error} retry={resource.retry} />;
  if (!movement) return <><PageHeader title="Movimentação não encontrada" /><EmptyState title="Este registro não está disponível" detail="Volte ao caixa para consultar as movimentações." action={<ActionLink to={`/caixa${search}`}>Voltar ao caixa</ActionLink>} /></>;
  return <>
    <Link className={uiStyles.back} to={`/caixa${search}`}>← Voltar ao caixa</Link>
    <PageHeader eyebrow={movement.type} title={movement.description} />
    <section className={styles.detailSection} aria-labelledby="cash_detail"><h2 id="cash_detail">Dados da movimentação</h2>
      <dl className={styles.definition}>
        <div><dt>Valor</dt><dd className={styles.detailAmount}>{money(movement.amountCents)}</dd></div>
        <div><dt>Data</dt><dd>{dateLabel(movement.date)}</dd></div>
        <div><dt>Categoria</dt><dd>{movement.category || 'Não informada'}</dd></div>
        <div><dt>Forma de pagamento</dt><dd>{movement.paymentMethod || 'Não informada'}</dd></div>
        <div><dt>Responsável</dt><dd>{movement.responsible || 'Não informado'}</dd></div>
        {movement.observation && <div className={styles.full}><dt>Observações</dt><dd>{movement.observation}</dd></div>}
      </dl>
    </section>
    <section className={styles.detailSection} aria-labelledby="cash_history"><h2 id="cash_history">Histórico da movimentação</h2><HistoryList entries={movement.history} /></section>
  </>;
}

export function CashFormPage() {
  const { pathname } = useLocation();
  const type: CashInput['type'] = pathname.endsWith('/saida') ? 'Saída' : 'Entrada';
  return <CashForm key={type} type={type} />;
}

type CashFields = Omit<CashInput, 'type' | 'amountCents'> & { amount: string };
type CashErrors = Partial<Record<'amount' | 'date' | 'description', string>>;

function CashForm({ type }: { type: CashInput['type'] }) {
  const { saveCashMovement } = useDemo();
  const { search } = useLocation();
  const resource = useResource(`cash-form:${type}`);
  const [initial] = useState<CashFields>(() => ({ amount: '', date: today(), description: '', category: '', paymentMethod: '', responsible: '', observation: '' }));
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<CashErrors>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<CashMovement | null>(null);
  const saveFeedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (saveError) saveFeedback.current?.focus(); }, [saveError]);
  const dirty = !saved && (Object.keys(initial) as (keyof CashFields)[]).some(key => fields[key] !== initial[key]);
  useUnsaved(dirty, saving);
  function change(key: keyof CashFields, value: string) {
    setFields(previous => ({ ...previous, [key]: value }));
    if (key === 'amount' || key === 'date' || key === 'description') setErrors(previous => ({ ...previous, [key]: '' }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || saved) return;
    setSaveError('');
    const amountCents = readMoney(fields.amount);
    const nextErrors: CashErrors = {};
    if (amountCents === null || amountCents <= 0) nextErrors.amount = 'Informe um valor maior que zero com até duas casas decimais.';
    if (!isDate(fields.date)) nextErrors.date = 'Informe uma data válida para a movimentação.';
    if (!fields.description.trim()) nextErrors.description = 'Informe a descrição da movimentação.';
    setErrors(nextErrors);
    const first = (['amount', 'date', 'description'] as const).find(key => nextErrors[key]);
    if (first) { document.getElementById(`cash_${first}`)?.focus(); return; }
    setSaving(true);
    try {
      setSaved(await saveCashMovement({ type, amountCents: amountCents!, date: fields.date, description: fields.description.trim(), category: fields.category.trim(), paymentMethod: fields.paymentMethod.trim(), responsible: fields.responsible.trim(), observation: fields.observation.trim() }));
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
    } finally { setSaving(false); }
  }
  if (saved) return <>
    <PageHeader title={type === 'Entrada' ? 'Entrada registrada' : 'Saída registrada'} />
    <Feedback tone="success"><p>{saved.description} — {money(saved.amountCents)}.</p></Feedback>
    <div className={uiStyles.formActions}><ActionLink to={`/caixa/${saved.id}${search}`}>Ver movimentação</ActionLink><ActionLink variant="secondary" to={`/caixa${search}`}>Voltar ao caixa</ActionLink></div>
  </>;
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ReadError message={resource.error} retry={resource.retry} />;
  return <>
    <Link className={uiStyles.back} to={`/caixa${search}`}>← Voltar ao caixa</Link>
    <PageHeader title={type === 'Entrada' ? 'Registrar entrada' : 'Registrar saída'} />
    <p className={styles.formHint}>Valor, data e descrição são obrigatórios. Os demais campos são opcionais.</p>
    <form onSubmit={submit} noValidate aria-busy={saving || undefined}>
      {saveError && <div className={styles.formFeedback} ref={saveFeedback} tabIndex={-1}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      <fieldset className={styles.formSection} disabled={saving}><legend>{type === 'Entrada' ? 'Dados da entrada' : 'Dados da saída'}</legend>
        <div className={uiStyles.formGrid}>
          <Field id="cash_amount" label="Valor (R$)" error={errors.amount} hint="Exemplo: 150,00"><input type="text" inputMode="decimal" value={fields.amount} onChange={event => change('amount', event.target.value)} required /></Field>
          <Field id="cash_date" label="Data" error={errors.date}><input type="date" value={fields.date} onChange={event => change('date', event.target.value)} required /></Field>
          <div className={uiStyles.full}><Field id="cash_description" label="Descrição" error={errors.description}><input type="text" value={fields.description} onChange={event => change('description', event.target.value)} required /></Field></div>
          <Field id="cash_category" label="Categoria"><input type="text" value={fields.category} onChange={event => change('category', event.target.value)} /></Field>
          <Field id="cash_paymentMethod" label="Forma de pagamento"><input type="text" value={fields.paymentMethod} onChange={event => change('paymentMethod', event.target.value)} /></Field>
          <Field id="cash_responsible" label="Responsável"><input type="text" value={fields.responsible} onChange={event => change('responsible', event.target.value)} /></Field>
          <div className={uiStyles.full}><Field id="cash_observation" label="Observações"><textarea value={fields.observation} onChange={event => change('observation', event.target.value)} rows={3} /></Field></div>
        </div>
      </fieldset>
      <div className={uiStyles.formActions}><Button type="submit" busy={saving}>{type === 'Entrada' ? 'Salvar entrada' : 'Salvar saída'}</Button><ActionLink variant="quiet" to={`/caixa${search}`}>Cancelar</ActionLink></div>
    </form>
  </>;
}
