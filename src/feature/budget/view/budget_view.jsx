import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../../component/ui.jsx';
import { budgetTotal, dateLabel, money } from '../../../demo/format.js';
import styles from './budget.module.css';
import { Odontogram } from './odontogram.jsx';
import { permanentTeeth, primaryTeeth } from '../model/teeth.js';
import { useBudgetListViewModel, useBudgetEditorViewModel } from '../view_model/use_budget_view_model.js';
function PatientContext({ patient }) {
    return <div className={styles.patientContext}>
    <div><span className={styles.smallLabel}>Paciente · {patient.code}</span><h2>{patient.name}</h2>{(patient.birthDate || patient.mobile || patient.phone) && <p>{[patient.birthDate && `Nascimento: ${dateLabel(patient.birthDate)}`, patient.mobile || patient.phone].filter(Boolean).join(' · ')}</p>}</div>
    <Link to={`/pacientes/${patient.id}`} className={styles.contextLink}>Ver paciente</Link>
  </div>;
}
export function BudgetListPage() {
    const { data, resource, search, patient, matches, budgets, newRoute, searchPatient, selectPatient } = useBudgetListViewModel();
    return <>
    <PageHeader title="Orçamentos" description="Escolha o paciente para consultar ou criar seu orçamento." action={patient && <ActionLink to={newRoute}>Novo orçamento</ActionLink>}/>
    {resource.busy ? <LoadingState /> : resource.error ? <Feedback tone="error" title="Não foi possível carregar"><p>{resource.error}</p><Button variant="secondary" onClick={resource.retry}>Tentar novamente</Button></Feedback> : !data.patients.length ? <EmptyState title="Cadastre um paciente para começar" detail="O orçamento precisa estar vinculado a um paciente. Depois do cadastro, escolha Criar orçamento." action={<ActionLink to="/pacientes/novo">Cadastrar paciente</ActionLink>}/> : <div className={styles.workspace}>
      <div className={styles.mobilePatientPicker}><Field id="budget_mobile_patient_search" label="Buscar paciente"><input type="search" placeholder="Nome ou código" value={search} onChange={event => searchPatient(event.target.value)}/></Field><Field id="budget_patient_picker" label="Paciente" hint={search && !matches.length ? 'Nenhum paciente encontrado. Limpe a busca para escolher outro.' : undefined}><select value={patient?.id ?? ''} onChange={event => selectPatient(event.target.value)}>{patient && !matches.some(value => value.id === patient.id) && <option value={patient.id}>{patient.name} — selecionado</option>}{matches.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></Field>{search && <Button variant="quiet" onClick={() => searchPatient('')}>Limpar busca</Button>}</div>
      <aside className={styles.patientPicker} aria-label="Seleção de paciente">
        <Field id="budget_patient_search" label="Buscar paciente"><input type="search" placeholder="Nome ou código" value={search} onChange={event => searchPatient(event.target.value)}/></Field>
        {matches.length ? <ul className={styles.patientList}>{matches.map(value => <li key={value.id}><button type="button" aria-pressed={patient?.id === value.id} className={`${styles.patientOption} ${patient?.id === value.id ? styles.patientSelected : ''}`} onClick={() => selectPatient(value.id)}><span>{value.name}</span><small>{value.code}</small></button></li>)}</ul> : <div className={styles.searchEmpty}><p>Nenhum paciente encontrado.</p><Button variant="quiet" onClick={() => searchPatient('')}>Limpar busca</Button></div>}
        <Link className={styles.allPatients} to="/pacientes">Consultar pacientes</Link>
      </aside>
      <section className={styles.records} aria-label="Orçamentos do paciente selecionado">
        {patient && <PatientContext patient={patient}/>}
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
        </> : <EmptyState title="Ainda não há orçamentos" detail={`Crie o primeiro orçamento de ${patient?.name ?? 'este paciente'}.`} action={<ActionLink to={newRoute}>Criar primeiro orçamento</ActionLink>}/>}
      </section>
    </div>}
  </>;
}
export function BudgetEditorPage() {
    const { id } = useParams();
    return <BudgetEditor key={id ?? 'new'} id={id}/>;
}
function BudgetEditor({ id }) {
    const { data, searchParams, source, resource, readonly, draft, errors, changeProcedure, itemAmounts, saving, saveError, savedMessage, dirty, patient, total, changeField, changeItem, addItem, removeItem, submit, savedOnArrival } = useBudgetEditorViewModel({ id });
    async function handleSubmit(event) { event.preventDefault(); const target = await submit(); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    useEffect(() => { if (saveError)
        requestAnimationFrame(() => feedbackRef.current?.focus()); }, [saveError]);
    function handleAddItem(...args) { const target = addItem(...args); if (target)
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    function handleRemoveItem(...args) { const target = removeItem(...args); if (target)
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    const feedbackRef = useRef(null);
    return <>
    <Link className={uiStyles.back} to={`/orcamentos?paciente=${draft.patientId}${searchParams.get('q') ? `&q=${encodeURIComponent(searchParams.get('q'))}` : ''}`}>← Orçamentos do paciente</Link>
    <PageHeader title={source ? `Orçamento ${source.code}` : 'Novo orçamento'} action={source && !source.local && <StatusLabel>{source.statusLabel}</StatusLabel>}/>
    {resource.busy ? <LoadingState /> : resource.error ? <Feedback tone="error" title="Não foi possível carregar"><p>{resource.error}</p>{dirty && <p>Seu preenchimento continua preservado.</p>}<Button variant="secondary" onClick={resource.retry}>Tentar novamente</Button></Feedback> : id && !source ? <EmptyState title="Orçamento não encontrado" detail="Este orçamento não está disponível." action={<ActionLink to="/orcamentos">Voltar aos orçamentos</ActionLink>}/> : <>
      {patient && <PatientContext patient={patient}/>}
      {readonly && <p className={styles.readonlyNote}>Somente leitura</p>}
      {(savedMessage || savedOnArrival) && <div className={styles.topNote}><Feedback tone="success" title="Orçamento salvo."/></div>}
      {saveError && <div className={styles.topNote} ref={feedbackRef} tabIndex={-1}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      {Object.keys(errors).length > 0 && <div className={styles.topNote}><Feedback tone="error" title="Revise os campos indicados"/></div>}
      <form noValidate onSubmit={handleSubmit} className={styles.editorLayout}>
        <div className={styles.editorMain}>
          <section className={styles.paperSection} aria-labelledby="budget_information_heading"><div className={styles.sectionHeading}><h2 id="budget_information_heading">Dados do orçamento</h2></div>
            {readonly ? <dl className={uiStyles.definition}><div><dt>Doutor</dt><dd>{data.doctors.find(value => value.id === draft.doctorId)?.name}</dd></div><div><dt>Emissão</dt><dd>{dateLabel(draft.createdOn)}</dd></div><div><dt>Validade</dt><dd>{dateLabel(draft.validUntil)}</dd></div>{source?.approvedOn && <div><dt>Aprovação</dt><dd>{dateLabel(source.approvedOn)}</dd></div>}</dl> : <fieldset disabled={saving} className={styles.fields}>
              <legend className={styles.visuallyHidden}>Dados do orçamento</legend>
              <Field id="budget_patientId" label="Paciente" error={errors.budget_patientId}><select value={draft.patientId} onChange={event => changeField('patientId', event.target.value)}><option value="">Selecione um paciente</option>{data.patients.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></Field>
              <Field id="budget_doctorId" label="Doutor" error={errors.budget_doctorId}><select value={draft.doctorId} onChange={event => changeField('doctorId', event.target.value)}><option value="">Selecione um doutor</option>{data.doctors.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></Field>
              <Field id="budget_createdOn" label="Data de emissão" error={errors.budget_createdOn}><input type="date" value={draft.createdOn} onChange={event => changeField('createdOn', event.target.value)}/></Field>
              <Field id="budget_validUntil" label="Validade (opcional)" error={errors.budget_validUntil}><input type="date" value={draft.validUntil} onChange={event => changeField('validUntil', event.target.value)}/></Field>
            </fieldset>}
          </section>
          <section className={styles.paperSection} aria-labelledby="budget_teeth_heading"><div className={styles.sectionHeading}><h2 id="budget_teeth_heading">Odontograma</h2></div><Odontogram items={draft.items} readonly={readonly} disabled={saving} onAdd={handleAddItem}/></section>
          <section className={styles.paperSection} aria-labelledby="budget_items_heading"><div className={styles.sectionHeading}><h2 id="budget_items_heading">Procedimentos</h2></div>
            {!draft.items.length && <p className={styles.noItems}>Nenhum procedimento incluído.</p>}
            <ol className={styles.items}>{draft.items.map((item, index) => <li key={item.id} className={styles.item}>
              <div className={styles.itemHeading}><h3>Item {String(index + 1).padStart(2, '0')}{readonly && <span>{item.procedure}</span>}</h3>{!readonly && <Button variant="quiet" disabled={saving} onClick={() => handleRemoveItem(item.id)} aria-label={`Remover item ${index + 1}${item.procedure ? `: ${item.procedure}` : ''}`}>Remover</Button>}</div>
              {readonly ? <><dl className={styles.itemDetails}>{item.tooth && <div><dt>Dente</dt><dd>{item.tooth}</dd></div>}{item.surface && <div><dt>Região/superfície</dt><dd>{item.surface}</dd></div>}<div><dt>Quantidade</dt><dd>{item.quantity}</dd></div><div><dt>Valor unitário (R$)</dt><dd>{money(itemAmounts[item.id].unitPriceCents)}</dd></div><div><dt>Subtotal</dt><dd>{money(itemAmounts[item.id].subtotal ?? 0)}</dd></div></dl>{item.observation && <p className={styles.itemObservation}>{item.observation}</p>}</> : <fieldset disabled={saving} className={styles.itemFields}>
                <legend className={styles.visuallyHidden}>Preenchimento do item {index + 1}</legend>
                <div className={styles.procedureField}><Field id={`item_${item.id}_procedure`} label="Procedimento" error={errors[`item_${item.id}_procedure`]}><select value={item.procedure} onChange={event => changeProcedure(item.id, event.target.value)}><option value="">Selecione um procedimento</option>{data.procedures.map(value => <option key={value.id} value={value.name}>{value.name}</option>)}</select></Field></div>
                <Field id={`item_${item.id}_quantity`} label="Quantidade" error={errors[`item_${item.id}_quantity`]}><input type="number" inputMode="numeric" min="1" step="1" value={item.quantity} onChange={event => changeItem(item.id, { quantity: event.target.value }, `item_${item.id}_quantity`)}/></Field>
                <Field id={`item_${item.id}_tooth`} label="Dente (opcional)" error={errors[`item_${item.id}_tooth`]}><select value={item.tooth} onChange={event => changeItem(item.id, { tooth: event.target.value }, `item_${item.id}_tooth`)}><option value="">Sem dente específico</option><optgroup label="Permanente">{permanentTeeth.map(tooth => <option key={tooth} value={tooth}>{tooth}</option>)}</optgroup><optgroup label="Infantil">{primaryTeeth.map(tooth => <option key={tooth} value={tooth}>{tooth}</option>)}</optgroup></select></Field>
                <Field id={`item_${item.id}_surface`} label="Região/superfície (opcional)"><input value={item.surface} onChange={event => changeItem(item.id, { surface: event.target.value })}/></Field>
                <Field id={`item_${item.id}_unitPrice`} label="Valor unitário (R$)" error={errors[`item_${item.id}_unitPrice`]}><input inputMode="decimal" placeholder="0,00" value={item.unitPrice} onChange={event => changeItem(item.id, { unitPrice: event.target.value }, `item_${item.id}_unitPrice`)}/></Field>
                <div className={styles.itemSubtotal}><span>Subtotal</span><strong>{itemAmounts[item.id].subtotal !== null ? money(itemAmounts[item.id].subtotal) : '—'}</strong></div>
                <div className={styles.itemNoteField}><Field id={`item_${item.id}_observation`} label="Observação do item (opcional)"><input value={item.observation} onChange={event => changeItem(item.id, { observation: event.target.value })}/></Field></div>
              </fieldset>}
            </li>)}</ol>
            {!readonly && <div className={styles.addItem}><Button id="budget_items" variant="secondary" disabled={saving} aria-describedby={errors.budget_items ? 'budget_items_error' : undefined} onClick={() => handleAddItem()}><span aria-hidden="true">+</span>Adicionar procedimento</Button>{errors.budget_items && <p className={uiStyles.fieldError} id="budget_items_error">{errors.budget_items}</p>}</div>}
          </section>
          {(!readonly || draft.observation || draft.paymentNote) && <section className={styles.paperSection} aria-labelledby="budget_notes_heading"><div className={styles.sectionHeading}><h2 id="budget_notes_heading">Anotações</h2></div>
            {readonly ? <dl className={uiStyles.definition}>{draft.observation && <div><dt>Observação</dt><dd>{draft.observation}</dd></div>}{draft.paymentNote && <div><dt>Condições informadas</dt><dd>{draft.paymentNote}</dd></div>}</dl> : <fieldset disabled={saving} className={styles.noteFields}><legend className={styles.visuallyHidden}>Anotações do orçamento</legend>
              <Field id="budget_observation" label="Observação do orçamento (opcional)"><textarea value={draft.observation} onChange={event => changeField('observation', event.target.value)}/></Field>
              <Field id="budget_paymentNote" label="Condições informadas (opcional)"><textarea value={draft.paymentNote} onChange={event => changeField('paymentNote', event.target.value)}/></Field>
            </fieldset>}
          </section>}
          {source && <section className={styles.paperSection} aria-labelledby="budget_history_heading"><div className={styles.sectionHeading}><h2 id="budget_history_heading">Histórico</h2></div><HistoryList entries={source.history}/></section>}
        </div>
        <aside className={styles.summary} aria-label="Resumo do orçamento"><h2>Total</h2><p className={styles.summaryTotal} aria-live="polite">{total === null ? 'Em preenchimento' : money(total)}</p><div className={styles.summaryLine}><span>Itens do orçamento</span><strong>{draft.items.length}</strong></div>
          {!readonly && <><Button type="submit" busy={saving} className={styles.saveButton}>{saving ? 'Salvando…' : 'Salvar orçamento'}</Button>{dirty && <p className={styles.saveHint}>Há alterações não salvas.</p>}</>}
        </aside>
      </form>
    </>}
  </>;
}
