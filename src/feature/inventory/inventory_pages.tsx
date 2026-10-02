import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActionLink, Button, EmptyState, Feedback, Field, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../component/ui';
import { useResource } from '../../component/use_resource';
import { useUnsaved } from '../../component/use_unsaved';
import { dateLabel, money, normalize, readMoney, today } from '../../demo/format';
import type { Product, ProductInput, StockMovement } from '../../demo/model';
import { useDemo } from '../../demo/store';
import styles from './inventory.module.css';

function StockSituation({ product }: { product: Product }) {
  return product.quantity < product.minimum
    ? <StatusLabel tone="warning">Abaixo do mínimo</StatusLabel>
    : <StatusLabel>No mínimo ou acima</StatusLabel>;
}

function ResourceError({ message, retry }: { message: string; retry: () => void }) {
  return <div className={uiStyles.stack}><Feedback tone="error" title="Não foi possível carregar">{message}</Feedback><div><Button variant="secondary" onClick={retry}>Tentar novamente</Button></div></div>;
}

function NotFound({ search }: { search: string }) {
  return <EmptyState title="Material não encontrado" detail="Volte à lista para escolher outro material." action={<ActionLink to={`/estoque${search}`}>Voltar ao estoque</ActionLink>} />;
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function readQuantity(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) ? quantity : null;
}

function focusError(errors: Record<string, string>, prefix: string) {
  const first = Object.keys(errors)[0];
  if (first) requestAnimationFrame(() => document.getElementById(`${prefix}_${first}`)?.focus());
}

export function InventoryListPage() {
  const { data } = useDemo();
  const resource = useResource('inventory');
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const lowOnly = params.get('abaixo') === '1';
  const search = params.size ? `?${params}` : '';
  const filtered = data.products.filter(product => (!lowOnly || product.quantity < product.minimum) && normalize(`${product.name} ${product.code} ${product.category}`).includes(normalize(query)));
  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true, flushSync: true });
  }
  function clearFilters() { setParams({}, { replace: true, flushSync: true }); }
  return <>
    <PageHeader title="Estoque" action={<ActionLink to={`/estoque/novo${search}`}>Cadastrar material</ActionLink>} />
    <div className={styles.searchToolbar}>
      <Field id="inventory_search" label="Buscar material"><input type="search" value={query} onChange={event => updateFilter('q', event.target.value)} placeholder="Nome, código ou categoria" /></Field>
      <label className={styles.checkFilter}><input type="checkbox" checked={lowOnly} onChange={event => updateFilter('abaixo', event.target.checked ? '1' : '')} /><span>Somente abaixo do mínimo</span></label>
    </div>
    {resource.busy ? <LoadingState /> : resource.error ? <ResourceError message={resource.error} retry={resource.retry} /> : !data.products.length ? <EmptyState title="Ainda não há materiais" detail="Cadastre o primeiro material para acompanhar o estoque." action={<ActionLink to="/estoque/novo">Cadastrar material</ActionLink>} /> : !filtered.length ? <EmptyState title="Nenhum material encontrado" detail="Tente outro nome, código ou categoria, ou remova o filtro de quantidade." action={<Button variant="secondary" onClick={clearFilters}>Limpar filtros</Button>} /> : <>
      <div className={styles.listHeading}><p role="status">{filtered.length} {filtered.length === 1 ? 'material' : 'materiais'}{query || lowOnly ? ' nesta seleção' : ''}</p></div>
      <table className={`${uiStyles.table} ${styles.desktopRecords}`}>
        <caption className={styles.srOnly}>Materiais e quantidades em estoque</caption>
        <thead><tr><th scope="col">Material</th><th scope="col" className={uiStyles.numeric}>Quantidade atual</th><th scope="col" className={uiStyles.numeric}>Mínimo</th><th scope="col">Situação</th></tr></thead>
        <tbody>{filtered.map(product => <tr key={product.id}><th scope="row" className={styles.materialCell}><Link to={`/estoque/${product.id}${search}`}>{product.name}</Link><span>{product.code}{product.category && ` · ${product.category}`}</span></th><td className={uiStyles.numeric}><strong>{product.quantity}</strong><span className={styles.unit}>{product.unit}</span></td><td className={uiStyles.numeric}>{product.minimum}<span className={styles.unit}>{product.unit}</span></td><td><StockSituation product={product} /></td></tr>)}</tbody>
      </table>
      <ul className={styles.mobileRecords}>{filtered.map(product => <li key={product.id}><div className={styles.mobileRecordHeading}><span className={styles.code}>{product.code}</span><StockSituation product={product} /></div><Link className={styles.mobileMaterialLink} to={`/estoque/${product.id}${search}`}>{product.name}</Link>{product.category && <p className={styles.category}>{product.category}</p>}<dl className={styles.mobileQuantities}><div><dt>Quantidade atual</dt><dd><strong>{product.quantity}</strong> {product.unit}</dd></div><div><dt>Mínimo</dt><dd>{product.minimum} {product.unit}</dd></div></dl></li>)}</ul>
    </>}
  </>;
}

function MovementHistory({ movements, product }: { movements: StockMovement[]; product: Product }) {
  if (!movements.length) return <EmptyState title="Nenhuma movimentação registrada" detail="As entradas e saídas deste material aparecerão aqui." />;
  const ordered = [...movements].reverse().sort((a, b) => b.date.localeCompare(a.date));
  return <ol className={styles.movements}>{ordered.map(movement => <li key={movement.id}>
    <div className={styles.movementMeta}><time dateTime={movement.date}>{dateLabel(movement.date)}</time><span>{movement.actor.replace(' · demonstração', '').replace(' · exemplo', '')}</span></div>
    <div className={styles.movementContent}><div className={styles.movementTitle}><h3>{movement.type}</h3><span className={styles.movementQuantity}>{movement.type === 'Saída' ? '−' : movement.quantity >= 0 ? '+' : '−'}{Math.abs(movement.quantity)} {product.unit}</span></div><p>{movement.reason}</p>
      {(movement.supplier || movement.lot || movement.expiresOn || (movement.type === 'Entrada' && movement.purchaseCents > 0)) && <dl className={styles.movementDetails}>{movement.supplier && <div><dt>Fornecedor</dt><dd>{movement.supplier}</dd></div>}{movement.type === 'Entrada' && movement.purchaseCents > 0 && <div><dt>Valor da compra</dt><dd>{money(movement.purchaseCents)}</dd></div>}{movement.lot && <div><dt>Lote informado</dt><dd>{movement.lot}</dd></div>}{movement.expiresOn && <div><dt>Validade informada</dt><dd>{dateLabel(movement.expiresOn)}</dd></div>}</dl>}
      {movement.observation && <p className={styles.movementObservation}>{movement.observation}</p>}
    </div>
  </li>)}</ol>;
}

export function ProductDetailPage() {
  const { id } = useParams();
  const { data } = useDemo();
  const { search } = useLocation();
  const resource = useResource(`product:${id}`);
  const product = data.products.find(value => value.id === id);
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ResourceError message={resource.error} retry={resource.retry} />;
  if (!product) return <NotFound search={search} />;
  const movements = data.movements.filter(value => value.productId === product.id);
  return <>
    <Link className={uiStyles.back} to={`/estoque${search}`}>← Voltar ao estoque</Link>
    <PageHeader eyebrow={product.code} title={product.name} description={product.category || undefined} action={<div className={styles.detailActions}><ActionLink to={`/estoque/${product.id}/entrada${search}`}>Registrar entrada</ActionLink><ActionLink variant="secondary" to={`/estoque/${product.id}/saida${search}`}>Registrar saída</ActionLink></div>} />
    <div className={styles.stockStrip}><div><span>Quantidade atual</span><strong>{product.quantity} <small>{product.unit}</small></strong></div><div><span>Estoque mínimo</span><strong>{product.minimum} <small>{product.unit}</small></strong></div><div className={styles.stockSituation}><StockSituation product={product} /></div></div>
    <section className={styles.detailSection} aria-labelledby="product_information"><h2 id="product_information">Informações do material</h2><dl className={styles.productDefinition}>{product.description && <div className={styles.productDescription}><dt>Descrição</dt><dd>{product.description}</dd></div>}<div><dt>Valor de custo</dt><dd>{money(product.costCents)}</dd></div>{product.supplier && <div><dt>Fornecedor</dt><dd>{product.supplier}</dd></div>}{product.lot && <div><dt>Lote</dt><dd>{product.lot}</dd></div>}{product.expiresOn && <div><dt>Validade</dt><dd>{dateLabel(product.expiresOn)}</dd></div>}</dl></section>
    <section className={styles.detailSection} aria-labelledby="product_history"><div className={styles.sectionHeading}><h2 id="product_history">Histórico de movimentações</h2><span>{movements.length} {movements.length === 1 ? 'registro' : 'registros'}</span></div><MovementHistory movements={movements} product={product} /></section>
  </>;
}

interface ProductFields { name: string; category: string; description: string; unit: string; quantity: string; minimum: string; cost: string; supplier: string; lot: string; expiresOn: string }
const initialProduct: ProductFields = { name: '', category: '', description: '', unit: '', quantity: '0', minimum: '0', cost: '0,00', supplier: '', lot: '', expiresOn: '' };

export function ProductFormPage() {
  const { createProduct } = useDemo();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [fields, setFields] = useState<ProductFields>(initialProduct);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Product | null>(null);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const dirty = !created && Object.keys(fields).some(key => fields[key as keyof ProductFields] !== initialProduct[key as keyof ProductFields]);
  useUnsaved(dirty, busy);
  useEffect(() => { if (created) document.querySelector<HTMLHeadingElement>('h1')?.focus(); }, [created]);
  function change(key: keyof ProductFields, value: string) { setFields(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: '' })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || created) return;
    const nextErrors: Record<string, string> = {};
    if (!fields.name.trim()) nextErrors.name = 'Informe o nome do material.';
    if (!fields.unit.trim()) nextErrors.unit = 'Informe a unidade de medida, como caixa ou unidade.';
    const quantity = readQuantity(fields.quantity);
    const minimum = readQuantity(fields.minimum);
    const costCents = readMoney(fields.cost);
    if (quantity === null) nextErrors.quantity = 'Informe uma quantidade inteira igual ou maior que zero.';
    if (minimum === null) nextErrors.minimum = 'Informe um mínimo inteiro igual ou maior que zero.';
    if (costCents === null) nextErrors.cost = 'Informe um valor igual ou maior que zero, com até duas casas decimais.';
    if (fields.expiresOn && !isDate(fields.expiresOn)) nextErrors.expiresOn = 'Informe uma data válida ou deixe o campo vazio.';
    setErrors(nextErrors); setSaveError('');
    if (Object.keys(nextErrors).length) { if (nextErrors.expiresOn) setAdditionalOpen(true); focusError(nextErrors, 'product'); return; }
    const input: ProductInput = { name: fields.name.trim(), category: fields.category.trim(), description: fields.description.trim(), unit: fields.unit.trim(), quantity: quantity!, minimum: minimum!, costCents: costCents!, supplier: fields.supplier.trim(), lot: fields.lot.trim(), expiresOn: fields.expiresOn };
    setBusy(true);
    try { setCreated(await createProduct(input)); }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.'); }
    finally { setBusy(false); }
  }
  if (created) return <><PageHeader title="Material cadastrado" /><Feedback tone="success">{created.name} está disponível no estoque.</Feedback><div className={styles.savedSummary}><span>{created.code}</span><h2>{created.name}</h2><p>Quantidade inicial: <strong>{created.quantity} {created.unit}</strong></p><p>Estoque mínimo: {created.minimum} {created.unit}</p></div><div className={uiStyles.formActions}><ActionLink to={`/estoque/${created.id}${search}`}>Ver material</ActionLink><ActionLink variant="secondary" to={`/estoque${search}`}>Voltar ao estoque</ActionLink></div></>;
  return <>
    <Link className={uiStyles.back} to={`/estoque${search}`}>← Voltar ao estoque</Link>
    <PageHeader title="Cadastrar material" />
    <form noValidate onSubmit={submit} className={styles.form}>
      {(saveError || Object.values(errors).some(Boolean)) && <div className={styles.formFeedback}><Feedback tone="error" title={saveError ? 'O material ainda não foi salvo' : 'Confira os campos indicados'}>{saveError || 'Corrija o preenchimento e tente novamente. Os dados foram mantidos.'}</Feedback></div>}
      <fieldset disabled={busy} className={styles.formSection}><legend>Identificação do material</legend><div className={uiStyles.formGrid}>
        <div className={uiStyles.full}><Field id="product_name" label="Nome do material" error={errors.name}><input required value={fields.name} onChange={event => change('name', event.target.value)} autoComplete="off" /></Field></div>
        <Field id="product_category" label="Categoria (opcional)"><input value={fields.category} onChange={event => change('category', event.target.value)} autoComplete="off" /></Field>
        <Field id="product_unit" label="Unidade de medida" hint="Por exemplo: caixa, unidade ou frasco." error={errors.unit}><input required value={fields.unit} onChange={event => change('unit', event.target.value)} autoComplete="off" /></Field>
        <div className={uiStyles.full}><Field id="product_description" label="Descrição (opcional)"><textarea value={fields.description} onChange={event => change('description', event.target.value)} rows={3} /></Field></div>
      </div></fieldset>
      <fieldset disabled={busy} className={styles.formSection}><legend>Quantidades e custo</legend><div className={uiStyles.formGrid}>
        <Field id="product_quantity" label="Quantidade inicial" error={errors.quantity}><input inputMode="numeric" value={fields.quantity} onChange={event => change('quantity', event.target.value)} /></Field>
        <Field id="product_minimum" label="Estoque mínimo" hint="A indicação aparece quando a quantidade atual é menor que este valor." error={errors.minimum}><input inputMode="numeric" value={fields.minimum} onChange={event => change('minimum', event.target.value)} /></Field>
        <Field id="product_cost" label="Valor de custo (R$)" error={errors.cost}><input inputMode="decimal" value={fields.cost} onChange={event => change('cost', event.target.value)} /></Field>
      </div></fieldset>
      <details className={styles.additionalFields} open={additionalOpen} onToggle={event => setAdditionalOpen(event.currentTarget.open)}><summary>Informações adicionais (opcional)</summary><fieldset disabled={busy} className={styles.additionalSection}><legend className={styles.srOnly}>Informações adicionais do material</legend><div className={uiStyles.formGrid}>
        <div className={uiStyles.full}><Field id="product_supplier" label="Fornecedor"><input value={fields.supplier} onChange={event => change('supplier', event.target.value)} autoComplete="off" /></Field></div>
        <Field id="product_lot" label="Lote"><input value={fields.lot} onChange={event => change('lot', event.target.value)} autoComplete="off" /></Field>
        <Field id="product_expiresOn" label="Data de validade" error={errors.expiresOn}><input type="date" value={fields.expiresOn} onChange={event => change('expiresOn', event.target.value)} /></Field>
      </div></fieldset></details>
      <div className={uiStyles.formActions}><Button type="submit" busy={busy}>{busy ? 'Salvando material…' : 'Salvar material'}</Button><Button variant="secondary" disabled={busy} onClick={() => navigate(`/estoque${search}`)}>Cancelar</Button></div>
    </form>
  </>;
}

interface EntryFields { quantity: string; date: string; supplier: string; purchase: string; lot: string; expiresOn: string; observation: string }

export function StockEntryPage() {
  const { id } = useParams();
  return <StockEntryForm key={id} id={id} />;
}

function StockEntryForm({ id }: { id?: string }) {
  const { data, addEntry } = useDemo();
  const { search } = useLocation();
  const navigate = useNavigate();
  const resource = useResource(`entry:${id}`);
  const product = data.products.find(value => value.id === id);
  const [initial] = useState<EntryFields>(() => ({ quantity: '', date: today(), supplier: '', purchase: '', lot: '', expiresOn: '', observation: '' }));
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedQuantity, setSavedQuantity] = useState<number | null>(null);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const dirty = savedQuantity === null && Object.keys(fields).some(key => fields[key as keyof EntryFields] !== initial[key as keyof EntryFields]);
  useUnsaved(dirty, busy);
  useEffect(() => { if (savedQuantity !== null) document.querySelector<HTMLHeadingElement>('h1')?.focus(); }, [savedQuantity]);
  function change(key: keyof EntryFields, value: string) { setFields(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: '' })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || busy || savedQuantity !== null) return;
    const nextErrors: Record<string, string> = {};
    const quantity = readQuantity(fields.quantity);
    const purchaseCents = fields.purchase.trim() ? readMoney(fields.purchase) : 0;
    if (quantity === null || quantity <= 0 || !Number.isSafeInteger(product.quantity + quantity)) nextErrors.quantity = 'Informe uma quantidade inteira maior que zero.';
    if (!isDate(fields.date)) nextErrors.date = 'Informe uma data válida para registrar a movimentação.';
    if (purchaseCents === null) nextErrors.purchase = 'Informe um valor igual ou maior que zero, com até duas casas decimais, ou deixe vazio.';
    if (fields.expiresOn && !isDate(fields.expiresOn)) nextErrors.expiresOn = 'Informe uma data válida ou deixe o campo vazio.';
    setErrors(nextErrors); setSaveError('');
    if (Object.keys(nextErrors).length) { if (nextErrors.purchase || nextErrors.expiresOn) setAdditionalOpen(true); focusError(nextErrors, 'entry'); return; }
    setBusy(true);
    try { await addEntry({ productId: product.id, quantity: quantity!, date: fields.date, supplier: fields.supplier.trim(), purchaseCents: purchaseCents!, lot: fields.lot.trim(), expiresOn: fields.expiresOn, observation: fields.observation.trim() }); setSavedQuantity(quantity); }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar a entrada. Seu preenchimento foi mantido. Tente novamente.'); }
    finally { setBusy(false); }
  }
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ResourceError message={resource.error} retry={resource.retry} />;
  if (!product) return <NotFound search={search} />;
  const detailPath = `/estoque/${product.id}${search}`;
  if (savedQuantity !== null) return <><PageHeader title="Entrada registrada" /><Feedback tone="success">Entrada de {savedQuantity} {product.unit} para {product.name}.</Feedback><div className={styles.savedSummary}><span>Quantidade atual</span><h2>{product.quantity} {product.unit}</h2></div><div className={uiStyles.formActions}><ActionLink to={detailPath}>Ver material e histórico</ActionLink><ActionLink variant="secondary" to={`/estoque${search}`}>Voltar ao estoque</ActionLink></div></>;
  const entryQuantity = readQuantity(fields.quantity);
  const resultingQuantity = entryQuantity !== null && entryQuantity > 0 && Number.isSafeInteger(product.quantity + entryQuantity) ? product.quantity + entryQuantity : null;
  return <>
    <Link className={uiStyles.back} to={detailPath}>← Voltar ao material</Link>
    <PageHeader title="Registrar entrada" />
    <div className={styles.entryContext}><div><span>{product.code}</span><h2>{product.name}</h2></div><p>Quantidade atual<strong>{product.quantity} {product.unit}</strong></p></div>
    <form noValidate onSubmit={submit} className={styles.form}>
      {(saveError || Object.values(errors).some(Boolean)) && <div className={styles.formFeedback}><Feedback tone="error" title={saveError ? 'A entrada ainda não foi salva' : 'Confira os campos indicados'}>{saveError || 'Corrija o preenchimento e tente novamente. Os dados foram mantidos.'}</Feedback></div>}
      <fieldset disabled={busy} className={styles.formSection}><legend>Dados da entrada</legend><div className={uiStyles.formGrid}>
        <Field id="entry_quantity" label={`Quantidade de entrada (${product.unit})`} error={errors.quantity}><input required inputMode="numeric" value={fields.quantity} onChange={event => change('quantity', event.target.value)} /></Field>
        <Field id="entry_date" label="Data" error={errors.date}><input required type="date" value={fields.date} onChange={event => change('date', event.target.value)} /></Field>
      </div></fieldset>
      <details className={styles.additionalFields} open={additionalOpen} onToggle={event => setAdditionalOpen(event.currentTarget.open)}><summary>Informações adicionais (opcional)</summary><fieldset disabled={busy} className={styles.additionalSection}><legend className={styles.srOnly}>Informações adicionais da entrada</legend><div className={uiStyles.formGrid}>
        <Field id="entry_supplier" label="Fornecedor"><input value={fields.supplier} onChange={event => change('supplier', event.target.value)} autoComplete="off" /></Field>
        <Field id="entry_purchase" label="Valor total da compra (R$)" error={errors.purchase}><input inputMode="decimal" value={fields.purchase} onChange={event => change('purchase', event.target.value)} placeholder="0,00" /></Field>
        <Field id="entry_lot" label="Lote"><input value={fields.lot} onChange={event => change('lot', event.target.value)} autoComplete="off" /></Field>
        <Field id="entry_expiresOn" label="Data de validade" error={errors.expiresOn}><input type="date" value={fields.expiresOn} onChange={event => change('expiresOn', event.target.value)} /></Field>
        <div className={uiStyles.full}><Field id="entry_observation" label="Observações"><textarea value={fields.observation} onChange={event => change('observation', event.target.value)} rows={3} /></Field></div>
      </div></fieldset></details>
      {resultingQuantity !== null && <p className={styles.resultingBalance} role="status">Quantidade após a entrada: <strong>{resultingQuantity} {product.unit}</strong></p>}
      <div className={uiStyles.formActions}><Button type="submit" busy={busy}>{busy ? 'Registrando entrada…' : 'Salvar entrada'}</Button><Button variant="secondary" disabled={busy} onClick={() => navigate(detailPath)}>Cancelar</Button></div>
    </form>
  </>;
}

const exitReasons = ['Consumo interno', 'Procedimento', 'Perda', 'Vencimento', 'Ajuste', 'Outros motivos'];
interface ExitFields { quantity: string; date: string; reason: string; observation: string }

export function StockExitPage() {
  const { id } = useParams();
  return <StockExitForm key={id} id={id} />;
}

function StockExitForm({ id }: { id?: string }) {
  const { data, addExit } = useDemo();
  const { search } = useLocation();
  const navigate = useNavigate();
  const resource = useResource(`exit:${id}`);
  const product = data.products.find(value => value.id === id);
  const [initial] = useState<ExitFields>(() => ({ quantity: '', date: today(), reason: '', observation: '' }));
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedQuantity, setSavedQuantity] = useState<number | null>(null);
  const dirty = savedQuantity === null && Object.keys(fields).some(key => fields[key as keyof ExitFields] !== initial[key as keyof ExitFields]);
  useUnsaved(dirty, busy);
  useEffect(() => { if (savedQuantity !== null) document.querySelector<HTMLHeadingElement>('h1')?.focus(); }, [savedQuantity]);
  function change(key: keyof ExitFields, value: string) { setFields(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: '' })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || busy || savedQuantity !== null) return;
    const nextErrors: Record<string, string> = {};
    const quantity = readQuantity(fields.quantity);
    if (quantity === null || quantity <= 0) nextErrors.quantity = 'Informe uma quantidade inteira maior que zero.';
    else if (quantity > product.quantity) nextErrors.quantity = 'A quantidade supera o saldo disponível. Revise a quantidade.';
    if (!isDate(fields.date)) nextErrors.date = 'Informe uma data válida para registrar a movimentação.';
    if (!exitReasons.includes(fields.reason)) nextErrors.reason = 'Selecione o motivo da saída.';
    setErrors(nextErrors); setSaveError('');
    if (Object.keys(nextErrors).length) { focusError(nextErrors, 'exit'); return; }
    setBusy(true);
    try {
      await addExit({ productId: product.id, quantity: quantity!, date: fields.date, reason: fields.reason, observation: fields.observation.trim() });
      setSavedQuantity(quantity);
    } catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar a saída. Seu preenchimento foi mantido. Tente novamente.'); }
    finally { setBusy(false); }
  }
  if (resource.busy) return <LoadingState />;
  if (resource.error) return <ResourceError message={resource.error} retry={resource.retry} />;
  if (!product) return <NotFound search={search} />;
  const detailPath = `/estoque/${product.id}${search}`;
  if (savedQuantity !== null) return <><PageHeader title="Saída registrada" /><Feedback tone="success">Saída de {savedQuantity} {product.unit} de {product.name}.</Feedback><div className={styles.savedSummary}><span>Quantidade atual</span><h2>{product.quantity} {product.unit}</h2><p>Motivo: {fields.reason}</p></div><div className={uiStyles.formActions}><ActionLink to={detailPath}>Ver material e histórico</ActionLink><ActionLink variant="secondary" to={`/estoque${search}`}>Voltar ao estoque</ActionLink></div></>;
  const exitQuantity = readQuantity(fields.quantity);
  const resultingQuantity = exitQuantity !== null && exitQuantity > 0 && exitQuantity <= product.quantity ? product.quantity - exitQuantity : null;
  return <>
    <Link className={uiStyles.back} to={detailPath}>← Voltar ao material</Link>
    <PageHeader title="Registrar saída" />
    <div className={styles.entryContext}><div><span>{product.code}</span><h2>{product.name}</h2></div><p>Quantidade disponível<strong>{product.quantity} {product.unit}</strong></p></div>
    {product.quantity === 0 ? <><Feedback tone="warning" title="Material sem estoque">Registre uma entrada antes de retirar este material.</Feedback><div className={uiStyles.formActions}><ActionLink to={`/estoque/${product.id}/entrada${search}`}>Registrar entrada</ActionLink><ActionLink variant="secondary" to={detailPath}>Voltar ao material</ActionLink></div></> : <form noValidate onSubmit={submit} className={styles.form}>
      {(saveError || Object.values(errors).some(Boolean)) && <div className={styles.formFeedback}><Feedback tone="error" title={saveError ? 'A saída ainda não foi salva' : 'Confira os campos indicados'}>{saveError || 'Corrija o preenchimento e tente novamente. Os dados foram mantidos.'}</Feedback></div>}
      <fieldset disabled={busy} className={styles.formSection}><legend>Dados da saída</legend><div className={uiStyles.formGrid}>
        <Field id="exit_quantity" label={`Quantidade de saída (${product.unit})`} error={errors.quantity}><input required inputMode="numeric" value={fields.quantity} onChange={event => change('quantity', event.target.value)} /></Field>
        <Field id="exit_date" label="Data" error={errors.date}><input required type="date" value={fields.date} onChange={event => change('date', event.target.value)} /></Field>
        <div className={uiStyles.full}><Field id="exit_reason" label="Motivo" error={errors.reason}><select required value={fields.reason} onChange={event => change('reason', event.target.value)}><option value="">Selecione o motivo</option>{exitReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}</select></Field></div>
        <div className={uiStyles.full}><Field id="exit_observation" label="Observações (opcional)"><textarea value={fields.observation} onChange={event => change('observation', event.target.value)} rows={3} /></Field></div>
      </div></fieldset>
      {resultingQuantity !== null && <p className={styles.resultingBalance} role="status">Quantidade após a saída: <strong>{resultingQuantity} {product.unit}</strong></p>}
      <div className={uiStyles.formActions}><Button type="submit" busy={busy}>{busy ? 'Registrando saída…' : 'Salvar saída'}</Button><Button variant="secondary" disabled={busy} onClick={() => navigate(detailPath)}>Cancelar</Button></div>
    </form>}
  </>;
}
