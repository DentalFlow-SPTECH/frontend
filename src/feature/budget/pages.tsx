import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../component/ui';
import { useResource } from '../../component/use_resource';
import { useUnsaved } from '../../component/use_unsaved';
import { budgetTotal, dateLabel, money, moneyInput, normalize, readMoney, today } from '../../demo/format';
import type { Budget, BudgetInput, BudgetItem, Patient } from '../../demo/model';
import { useDemo } from '../../demo/store';
import styles from './budget.module.css';
import { allTeeth, Odontogram, permanentTeeth, primaryTeeth } from './odontogram';

function PatientContext({ patient }: { patient: Patient }) {
  return <div className={styles.patientContext}>
    <div><span className={styles.smallLabel}>Paciente · {patient.code}</span><h2>{patient.name}</h2>{(patient.birthDate || patient.mobile || patient.phone) && <p>{[patient.birthDate && `Nascimento: ${dateLabel(patient.birthDate)}`, patient.mobile || patient.phone].filter(Boolean).join(' · ')}</p>}</div>
    <Link to={`/pacientes/${patient.id}`} className={styles.contextLink}>Ver paciente</Link>
  </div>;
}

export function BudgetListPage() {
  const { data } = useDemo();
  const resource = useResource('budgets');
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const patient = data.patients.find(value => value.id === searchParams.get('paciente')) ?? data.patients[0];
  const matches = data.patients.filter(value => normalize(`${value.name} ${value.code}`).includes(normalize(search)));
  const budgets = data.budgets.filter(value => value.patientId === patient?.id).sort((a, b) => b.createdOn.localeCompare(a.createdOn));
  const context = new URLSearchParams({ ...(patient ? { paciente: patient.id } : {}), ...(search ? { q: search } : {}) });
  const newRoute = `/orcamentos/novo?${context}`;
  function searchPatient(value: string) { const next = new URLSearchParams(searchParams); if (value) next.set('q', value); else next.delete('q'); setSearchParams(next, { replace: true }); }
  function selectPatient(id: string) { setSearchParams({ paciente: id, ...(search ? { q: search } : {}) }); }
  return <>
    <PageHeader title="Orçamentos" description="Escolha o paciente para consultar ou criar seu orçamento." action={patient && <ActionLink to={newRoute}>Novo orçamento</ActionLink>} />
    {resource.busy ? <LoadingState /> : resource.error ? <Feedback tone="error" title="Não foi possível carregar"><p>{resource.error}</p><Button variant="secondary" onClick={resource.retry}>Tentar novamente</Button></Feedback> : !data.patients.length ? <EmptyState title="Cadastre um paciente para começar" detail="O orçamento precisa estar vinculado a um paciente. Depois do cadastro, escolha Criar orçamento." action={<ActionLink to="/pacientes/novo">Cadastrar paciente</ActionLink>} /> : <div className={styles.workspace}>
      <div className={styles.mobilePatientPicker}><Field id="budget_mobile_patient_search" label="Buscar paciente"><input type="search" placeholder="Nome ou código" value={search} onChange={event => searchPatient(event.target.value)} /></Field><Field id="budget_patient_picker" label="Paciente" hint={search && !matches.length ? 'Nenhum paciente encontrado. Limpe a busca para escolher outro.' : undefined}><select value={patient?.id ?? ''} onChange={event => selectPatient(event.target.value)}>{patient && !matches.some(value => value.id === patient.id) && <option value={patient.id}>{patient.name} — selecionado</option>}{matches.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></Field>{search && <Button variant="quiet" onClick={() => searchPatient('')}>Limpar busca</Button>}</div>
      <aside className={styles.patientPicker} aria-label="Seleção de paciente">
        <Field id="budget_patient_search" label="Buscar paciente"><input type="search" placeholder="Nome ou código" value={search} onChange={event => searchPatient(event.target.value)} /></Field>
        {matches.length ? <ul className={styles.patientList}>{matches.map(value => <li key={value.id}><button type="button" aria-pressed={patient?.id === value.id} className={`${styles.patientOption} ${patient?.id === value.id ? styles.patientSelected : ''}`} onClick={() => selectPatient(value.id)}><span>{value.name}</span><small>{value.code}</small></button></li>)}</ul> : <div className={styles.searchEmpty}><p>Nenhum paciente encontrado.</p><Button variant="quiet" onClick={() => searchPatient('')}>Limpar busca</Button></div>}
        <Link className={styles.allPatients} to="/pacientes">Consultar pacientes</Link>
      </aside>
      <section className={styles.records} aria-label="Orçamentos do paciente selecionado">
        {patient && <PatientContext patient={patient} />}
        <div className={styles.recordHeading}><h2>Orçamentos do paciente</h2><span>{budgets.length} {budgets.length === 1 ? 'registro' : 'registros'}</span></div>
        {budgets.length ? <>
          <table className={`${uiStyles.table} ${styles.budgetTable}`}>
            <caption className={styles.visuallyHidden}>Orçamentos de {patient?.name}</caption>
            <thead><tr><th scope="col">Orçamento / emissão</th><th scope="col">Doutor</th><th scope="col">Situação</th><th scope="col" className={uiStyles.numeric}>Total</th></tr></thead>
            <tbody>{budgets.map(budget => <tr key={budget.id}>
              <th scope="row"><Link to={`/orcamentos/${budget.id}${search ? `?q=${encodeURIComponent(search)}` : ''}`} aria-label={`Ver orçamento ${budget.code}`}>{budget.code}</Link><span className={styles.rowDate}>{dateLabel(budget.createdOn)}</span></th>
              <td>{data.doctors.find(value => value.id === budget.doctorId)?.name ?? 'Não informado'}</td>
              <td>{budget.local ? <><span aria-hidden="true">—</span><span className={styles.visuallyHidden}>Situação não definida</span></> : <StatusLabel>{budget.statusLabel}</StatusLabel>}</td>
              <td className={uiStyles.numeric}><strong>{money(budgetTotal(budget.items))}</strong><span className={styles.scenarioLabel}>{budget.items.length} {budget.items.length === 1 ? 'item' : 'itens'}</span></td>
            </tr>)}</tbody>
          </table>
          <ul className={styles.mobileBudgets}>{budgets.map(budget => <li key={budget.id}>
            <div className={styles.mobileBudgetTop}><Link to={`/orcamentos/${budget.id}${search ? `?q=${encodeURIComponent(search)}` : ''}`} aria-label={`Ver orçamento ${budget.code}`}>{budget.code}</Link><strong>{money(budgetTotal(budget.items))}</strong></div>
            <dl><div><dt>Emissão</dt><dd>{dateLabel(budget.createdOn)}</dd></div><div><dt>Doutor</dt><dd>{data.doctors.find(value => value.id === budget.doctorId)?.name}</dd></div><div><dt>Situação</dt><dd>{budget.local ? <><span aria-hidden="true">—</span><span className={styles.visuallyHidden}>Situação não definida</span></> : <StatusLabel>{budget.statusLabel}</StatusLabel>}</dd></div></dl>
          </li>)}</ul>
        </> : <EmptyState title="Ainda não há orçamentos" detail={`Crie o primeiro orçamento de ${patient?.name ?? 'este paciente'}.`} action={<ActionLink to={newRoute}>Criar primeiro orçamento</ActionLink>} />}
      </section>
    </div>}
  </>;
}

interface DraftItem { id: string; procedure: string; quantity: string; unitPrice: string; observation: string; tooth: string; surface: string }
interface Draft { patientId: string; doctorId: string; createdOn: string; validUntil: string; observation: string; paymentNote: string; items: DraftItem[] }
type Errors = Record<string, string>;

function makeDraft(source: Budget | undefined, patientId: string): Draft {
  return source ? { patientId: source.patientId, doctorId: source.doctorId, createdOn: source.createdOn, validUntil: source.validUntil, observation: source.observation, paymentNote: source.paymentNote, items: source.items.map(item => ({ id: item.id, procedure: item.procedure, quantity: String(item.quantity), unitPrice: moneyInput(item.unitPriceCents), observation: item.observation, tooth: item.tooth ?? '', surface: item.surface ?? '' })) } : { patientId, doctorId: '', createdOn: today(), validUntil: '', observation: '', paymentNote: '', items: [] };
}
function itemValue(item: DraftItem) {
  const quantity = Number(item.quantity);
  const unitPriceCents = readMoney(item.unitPrice);
  return /^\d+$/.test(item.quantity) && Number.isSafeInteger(quantity) && quantity > 0 && unitPriceCents !== null && Number.isSafeInteger(quantity * unitPriceCents) ? { quantity, unitPriceCents } : null;
}
function dateIsValid(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function BudgetEditorPage() {
  const { id } = useParams();
  return <BudgetEditor key={id ?? 'new'} id={id} />;
}

function BudgetEditor({ id }: { id?: string }) {
  const { data, saveBudget } = useDemo();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const source = data.budgets.find(value => value.id === id);
  const resource = useResource(`budget_${id ?? 'new'}`);
  const readonly = !!source && !source.local;
  const requestedPatient = data.patients.find(value => value.id === searchParams.get('paciente'))?.id ?? data.patients[0]?.id ?? '';
  const [draft, setDraft] = useState(() => makeDraft(source, requestedPatient));
  const [baseline, setBaseline] = useState(() => JSON.stringify(makeDraft(source, requestedPatient)));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [target, setTarget] = useState('');
  const feedbackRef = useRef<HTMLDivElement>(null);
  const dirty = !readonly && JSON.stringify(draft) !== baseline;
  useUnsaved(dirty, saving);
  useEffect(() => { if (target && !dirty) navigate(target, { replace: true }); }, [target, dirty, navigate]);
  const patient = data.patients.find(value => value.id === draft.patientId);
  const validItems = draft.items.map(itemValue);
  const totalValid = validItems.every(value => value !== null) && Number.isSafeInteger(budgetTotal(validItems.filter(value => value !== null)));
  const total = totalValid ? budgetTotal(validItems.filter(value => value !== null)) : null;

  function changeField(key: Exclude<keyof Draft, 'items'>, value: string) {
    setDraft(current => ({ ...current, [key]: value }));
    setSavedMessage('');
    setErrors(current => { const next = { ...current }; delete next[`budget_${key}`]; return next; });
  }
  function changeItem(itemId: string, patch: Partial<DraftItem>, errorKey?: string) {
    setDraft(current => ({ ...current, items: current.items.map(item => item.id === itemId ? { ...item, ...patch } : item) }));
    setSavedMessage('');
    if (errorKey) setErrors(current => { const next = { ...current }; delete next[errorKey]; return next; });
  }
  function addItem(tooth = '') {
    const itemId = crypto.randomUUID();
    setDraft(current => ({ ...current, items: [...current.items, { id: itemId, procedure: '', quantity: '1', unitPrice: '', observation: '', tooth, surface: '' }] }));
    setSavedMessage('');
    setErrors(current => { const next = { ...current }; delete next.budget_items; return next; });
    requestAnimationFrame(() => document.getElementById(`item_${itemId}_procedure`)?.focus());
  }
  function removeItem(itemId: string) {
    setDraft(current => ({ ...current, items: current.items.filter(item => item.id !== itemId) }));
    setErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`item_${itemId}_`))));
    setSavedMessage('');
    requestAnimationFrame(() => document.getElementById('budget_items')?.focus());
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readonly || saving) return;
    const next: Errors = {};
    if (!data.patients.some(value => value.id === draft.patientId)) next.budget_patientId = 'Selecione o paciente.';
    if (!data.doctors.some(value => value.id === draft.doctorId)) next.budget_doctorId = 'Selecione o doutor.';
    if (!dateIsValid(draft.createdOn)) next.budget_createdOn = 'Informe uma data de emissão válida.';
    if (draft.validUntil && !dateIsValid(draft.validUntil)) next.budget_validUntil = 'Informe uma data válida ou deixe em branco.';
    if (!draft.items.length) next.budget_items = 'Inclua ao menos um procedimento.';
    draft.items.forEach(item => {
      if (!data.procedures.some(value => value.name === item.procedure)) next[`item_${item.id}_procedure`] = 'Selecione um procedimento.';
      if (item.tooth && !allTeeth.includes(item.tooth)) next[`item_${item.id}_tooth`] = 'Selecione um dente válido ou deixe o campo vazio.';
      if (!/^\d+$/.test(item.quantity) || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1) next[`item_${item.id}_quantity`] = 'Use uma quantidade inteira maior que zero.';
      if (readMoney(item.unitPrice) === null) next[`item_${item.id}_unitPrice`] = 'Use um valor a partir de zero, com até duas casas decimais. Exemplo: 180,00.';
      else if (!itemValue(item) && !next[`item_${item.id}_quantity`]) next[`item_${item.id}_unitPrice`] = 'O valor informado é muito alto. Revise o valor unitário.';
    });
    if (!totalValid && !Object.keys(next).length) next.budget_items = 'O total informado é muito alto. Revise os valores.';
    setErrors(next); setSaveError(''); setSavedMessage('');
    if (Object.keys(next).length) { requestAnimationFrame(() => document.getElementById(Object.keys(next)[0])?.focus()); return; }
    setSaving(true);
    try {
      const items: BudgetItem[] = draft.items.map(item => ({ id: item.id, procedure: item.procedure, observation: item.observation.trim(), quantity: Number(item.quantity), unitPriceCents: readMoney(item.unitPrice)!, tooth: item.tooth, surface: item.surface.trim() }));
      const input: BudgetInput = { patientId: draft.patientId, doctorId: draft.doctorId, createdOn: draft.createdOn, validUntil: draft.validUntil, observation: draft.observation.trim(), paymentNote: draft.paymentNote.trim(), items };
      const saved = await saveBudget(input, id);
      const updated = makeDraft(saved, saved.patientId);
      setDraft(updated); setBaseline(JSON.stringify(updated));
      setSavedMessage('Orçamento salvo.');
      if (!id) setTarget(`/orcamentos/${saved.id}?salvo=1${searchParams.get('q') ? `&q=${encodeURIComponent(searchParams.get('q')!)}` : ''}`);
    } catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido.'); requestAnimationFrame(() => feedbackRef.current?.focus()); }
    finally { setSaving(false); }
  }

  const savedOnArrival = searchParams.get('salvo') === '1' && !dirty;
  return <>
    <Link className={uiStyles.back} to={`/orcamentos?paciente=${draft.patientId}${searchParams.get('q') ? `&q=${encodeURIComponent(searchParams.get('q')!)}` : ''}`}>← Orçamentos do paciente</Link>
    <PageHeader title={source ? `Orçamento ${source.code}` : 'Novo orçamento'} action={source && !source.local && <StatusLabel>{source.statusLabel}</StatusLabel>} />
    {resource.busy ? <LoadingState /> : resource.error ? <Feedback tone="error" title="Não foi possível carregar"><p>{resource.error}</p>{dirty && <p>Seu preenchimento continua preservado.</p>}<Button variant="secondary" onClick={resource.retry}>Tentar novamente</Button></Feedback> : id && !source ? <EmptyState title="Orçamento não encontrado" detail="Este orçamento não está disponível." action={<ActionLink to="/orcamentos">Voltar aos orçamentos</ActionLink>} /> : <>
      {patient && <PatientContext patient={patient} />}
      {readonly && <p className={styles.readonlyNote}>Somente leitura</p>}
      {(savedMessage || savedOnArrival) && <div className={styles.topNote}><Feedback tone="success" title="Orçamento salvo." /></div>}
      {saveError && <div className={styles.topNote} ref={feedbackRef} tabIndex={-1}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      {Object.keys(errors).length > 0 && <div className={styles.topNote}><Feedback tone="error" title="Revise os campos indicados" /></div>}
      <form noValidate onSubmit={submit} className={styles.editorLayout}>
        <div className={styles.editorMain}>
          <section className={styles.paperSection} aria-labelledby="budget_information_heading"><div className={styles.sectionHeading}><h2 id="budget_information_heading">Dados do orçamento</h2></div>
            {readonly ? <dl className={uiStyles.definition}><div><dt>Doutor</dt><dd>{data.doctors.find(value => value.id === draft.doctorId)?.name}</dd></div><div><dt>Emissão</dt><dd>{dateLabel(draft.createdOn)}</dd></div><div><dt>Validade</dt><dd>{dateLabel(draft.validUntil)}</dd></div>{source?.approvedOn && <div><dt>Aprovação</dt><dd>{dateLabel(source.approvedOn)}</dd></div>}</dl> : <fieldset disabled={saving} className={styles.fields}>
              <legend className={styles.visuallyHidden}>Dados do orçamento</legend>
              <Field id="budget_patientId" label="Paciente" error={errors.budget_patientId}><select value={draft.patientId} onChange={event => changeField('patientId', event.target.value)}><option value="">Selecione um paciente</option>{data.patients.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></Field>
              <Field id="budget_doctorId" label="Doutor" error={errors.budget_doctorId}><select value={draft.doctorId} onChange={event => changeField('doctorId', event.target.value)}><option value="">Selecione um doutor</option>{data.doctors.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></Field>
              <Field id="budget_createdOn" label="Data de emissão" error={errors.budget_createdOn}><input type="date" value={draft.createdOn} onChange={event => changeField('createdOn', event.target.value)} /></Field>
              <Field id="budget_validUntil" label="Validade (opcional)" error={errors.budget_validUntil}><input type="date" value={draft.validUntil} onChange={event => changeField('validUntil', event.target.value)} /></Field>
            </fieldset>}
          </section>
          <section className={styles.paperSection} aria-labelledby="budget_teeth_heading"><div className={styles.sectionHeading}><h2 id="budget_teeth_heading">Odontograma</h2></div><Odontogram items={draft.items} readonly={readonly} disabled={saving} onAdd={addItem} /></section>
          <section className={styles.paperSection} aria-labelledby="budget_items_heading"><div className={styles.sectionHeading}><h2 id="budget_items_heading">Procedimentos</h2></div>
            {!draft.items.length && <p className={styles.noItems}>Nenhum procedimento incluído.</p>}
            <ol className={styles.items}>{draft.items.map((item, index) => <li key={item.id} className={styles.item}>
              <div className={styles.itemHeading}><h3>Item {String(index + 1).padStart(2, '0')}{readonly && <span>{item.procedure}</span>}</h3>{!readonly && <Button variant="quiet" disabled={saving} onClick={() => removeItem(item.id)} aria-label={`Remover item ${index + 1}${item.procedure ? `: ${item.procedure}` : ''}`}>Remover</Button>}</div>
              {readonly ? <><dl className={styles.itemDetails}>{item.tooth && <div><dt>Dente</dt><dd>{item.tooth}</dd></div>}{item.surface && <div><dt>Região/superfície</dt><dd>{item.surface}</dd></div>}<div><dt>Quantidade</dt><dd>{item.quantity}</dd></div><div><dt>Valor unitário (R$)</dt><dd>{money(readMoney(item.unitPrice) ?? 0)}</dd></div><div><dt>Subtotal</dt><dd>{money((itemValue(item)?.quantity ?? 0) * (itemValue(item)?.unitPriceCents ?? 0))}</dd></div></dl>{item.observation && <p className={styles.itemObservation}>{item.observation}</p>}</> : <fieldset disabled={saving} className={styles.itemFields}>
                <legend className={styles.visuallyHidden}>Preenchimento do item {index + 1}</legend>
                <div className={styles.procedureField}><Field id={`item_${item.id}_procedure`} label="Procedimento" error={errors[`item_${item.id}_procedure`]}><select value={item.procedure} onChange={event => { const procedure = data.procedures.find(value => value.name === event.target.value); changeItem(item.id, { procedure: event.target.value, unitPrice: procedure ? moneyInput(procedure.referencePriceCents) : '' }, `item_${item.id}_procedure`); setErrors(current => { const next = { ...current }; delete next[`item_${item.id}_unitPrice`]; return next; }); }}><option value="">Selecione um procedimento</option>{data.procedures.map(value => <option key={value.id} value={value.name}>{value.name}</option>)}</select></Field></div>
                <Field id={`item_${item.id}_quantity`} label="Quantidade" error={errors[`item_${item.id}_quantity`]}><input type="number" inputMode="numeric" min="1" step="1" value={item.quantity} onChange={event => changeItem(item.id, { quantity: event.target.value }, `item_${item.id}_quantity`)} /></Field>
                <Field id={`item_${item.id}_tooth`} label="Dente (opcional)" error={errors[`item_${item.id}_tooth`]}><select value={item.tooth} onChange={event => changeItem(item.id, { tooth: event.target.value }, `item_${item.id}_tooth`)}><option value="">Sem dente específico</option><optgroup label="Permanente">{permanentTeeth.map(tooth => <option key={tooth} value={tooth}>{tooth}</option>)}</optgroup><optgroup label="Infantil">{primaryTeeth.map(tooth => <option key={tooth} value={tooth}>{tooth}</option>)}</optgroup></select></Field>
                <Field id={`item_${item.id}_surface`} label="Região/superfície (opcional)"><input value={item.surface} onChange={event => changeItem(item.id, { surface: event.target.value })} /></Field>
                <Field id={`item_${item.id}_unitPrice`} label="Valor unitário (R$)" error={errors[`item_${item.id}_unitPrice`]}><input inputMode="decimal" placeholder="0,00" value={item.unitPrice} onChange={event => changeItem(item.id, { unitPrice: event.target.value }, `item_${item.id}_unitPrice`)} /></Field>
                <div className={styles.itemSubtotal}><span>Subtotal</span><strong>{itemValue(item) ? money(itemValue(item)!.quantity * itemValue(item)!.unitPriceCents) : '—'}</strong></div>
                <div className={styles.itemNoteField}><Field id={`item_${item.id}_observation`} label="Observação do item (opcional)"><input value={item.observation} onChange={event => changeItem(item.id, { observation: event.target.value })} /></Field></div>
              </fieldset>}
            </li>)}</ol>
            {!readonly && <div className={styles.addItem}><Button id="budget_items" variant="secondary" disabled={saving} aria-describedby={errors.budget_items ? 'budget_items_error' : undefined} onClick={() => addItem()}><span aria-hidden="true">+</span>Adicionar procedimento</Button>{errors.budget_items && <p className={uiStyles.fieldError} id="budget_items_error">{errors.budget_items}</p>}</div>}
          </section>
          {(!readonly || draft.observation || draft.paymentNote) && <section className={styles.paperSection} aria-labelledby="budget_notes_heading"><div className={styles.sectionHeading}><h2 id="budget_notes_heading">Anotações</h2></div>
            {readonly ? <dl className={uiStyles.definition}>{draft.observation && <div><dt>Observação</dt><dd>{draft.observation}</dd></div>}{draft.paymentNote && <div><dt>Condições informadas</dt><dd>{draft.paymentNote}</dd></div>}</dl> : <fieldset disabled={saving} className={styles.noteFields}><legend className={styles.visuallyHidden}>Anotações do orçamento</legend>
              <Field id="budget_observation" label="Observação do orçamento (opcional)"><textarea value={draft.observation} onChange={event => changeField('observation', event.target.value)} /></Field>
              <Field id="budget_paymentNote" label="Condições informadas (opcional)"><textarea value={draft.paymentNote} onChange={event => changeField('paymentNote', event.target.value)} /></Field>
            </fieldset>}
          </section>}
          {source && <section className={styles.paperSection} aria-labelledby="budget_history_heading"><div className={styles.sectionHeading}><h2 id="budget_history_heading">Histórico</h2></div><HistoryList entries={source.history} /></section>}
        </div>
        <aside className={styles.summary} aria-label="Resumo do orçamento"><h2>Total</h2><p className={styles.summaryTotal} aria-live="polite">{total === null ? 'Em preenchimento' : money(total)}</p><div className={styles.summaryLine}><span>Itens do orçamento</span><strong>{draft.items.length}</strong></div>
          {!readonly && <><Button type="submit" busy={saving} className={styles.saveButton}>{saving ? 'Salvando…' : 'Salvar orçamento'}</Button>{dirty && <p className={styles.saveHint}>Há alterações não salvas.</p>}</>}
        </aside>
      </form>
    </>}
  </>;
}
