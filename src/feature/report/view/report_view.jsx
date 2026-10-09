import { PagedList } from '../../../component/paged_list.jsx';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../../component/ui.jsx';
import { RecordPicker } from '../../../component/record_picker.jsx';
import { dateLabel, money } from '../../../demo/format.js';
import { claimResults } from '../model/report_model.js';
import styles from './report.module.css';
import { useClaimFormViewModel, useDailyReportViewModel, useMonthlyReportViewModel, useReportReviewViewModel } from '../view_model/use_report_view_model.js';
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
function ReadError({ message, retry }) { return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>; }
function ReportTabs({ tabs }) { return <nav className={uiStyles.tabs} aria-label="Relatórios">{tabs.map(tab => <Link key={tab.key} to={tab.to} aria-current={tab.current ? 'page' : undefined}>{tab.label}</Link>)}</nav>; }
// As visões de doutor e dona são locais: organizam o trabalho, mas não substituem a autorização do servidor.
function LocalView({ role }) { return <p className={styles.localView}>Visão local: <strong>{role}</strong> · sem controle de acesso</p>; }
function Attendance({ row }) { return row.attendance ? <>{row.attendance}{row.insurance ? ` · ${row.insurance}` : ''}</> : <span className={uiStyles.pending}>Não informada</span>; }
export function DailyReportPage() {
    const { data, resource, date, doctorId, doctor, report, status, tone, editable, rows, summary, late, note, saving, saveError, success, dirty, clinicTabs, showClinics, tabs, agendaPath, changeDate, changeDoctor, changeClinic, changeNote, save } = useDailyReportViewModel();
    const feedback = useRef(null);
    useEffect(() => {
        if (saveError || success)
            feedback.current?.focus();
    }, [saveError, success]);
    return <>
    <PageHeader title="Relatório do dia" description="Revise os procedimentos realizados e envie o relatório de cada clínica." action={<LocalView role="Doutor"/>}/>
    <ReportTabs tabs={tabs}/>
    <div className={styles.filters}>
      <Field id="report_date" label="Data"><input type="date" value={date} onChange={event => changeDate(event.target.value)}/></Field>
      <RecordPicker id="report_doctor" label="Doutor" kind="doctor" records={data.doctors} value={doctorId} compact allowClear={false} emptyLabel="Escolher doutor" onChange={changeDoctor}/>
      {doctorId && showClinics && <div className={styles.clinicChoice}><span id="report_clinic_label">Clínica do relatório</span><div className={styles.segments} role="group" aria-labelledby="report_clinic_label">{clinicTabs.map(clinic => <Button key={clinic.id || 'sem'} variant={clinic.current ? 'primary' : 'secondary'} aria-pressed={clinic.current} onClick={() => changeClinic(clinic.id)}>{clinic.label} <small>{clinic.count}</small></Button>)}</div></div>}
      {doctorId && <div className={styles.reportStatus}><StatusLabel tone={tone}>{status}</StatusLabel>{report?.sentAt && !editable && <small>Enviado em {dateLabel(report.sentAt)}</small>}</div>}
    </div>
    {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : !doctorId ? <EmptyState title="Escolha o doutor do relatório" detail="O relatório é preparado por doutor, data e clínica, a partir das consultas finalizadas."/> : <>
      {(saveError || success) && <div ref={feedback} tabIndex={-1} className={styles.feedback}><Feedback tone={saveError ? 'error' : 'success'} title={saveError ? 'Não foi possível salvar' : undefined}>{saveError || success}</Feedback></div>}
      {status === 'Em correção' && report.reason && <div className={styles.feedback}><Feedback tone="warning" title="Relatório devolvido para correção">{report.reason}</Feedback></div>}
      <ul className={styles.summary} aria-label={`Resumo de ${dateLabel(date)}`}>
        <li><strong>{summary.scheduled}</strong> {summary.scheduled === 1 ? 'consulta na agenda' : 'consultas na agenda'}</li><li><strong>{summary.finalized}</strong> {summary.finalized === 1 ? 'finalizada' : 'finalizadas'}</li><li><strong>{summary.missed}</strong> {summary.missed === 1 ? 'falta' : 'faltas'}</li>
        {summary.unfinished > 0 && <li className={styles.warn}><strong>{summary.unfinished}</strong> sem finalização · <Link to={agendaPath}>finalizar na agenda</Link></li>}
        {late > 0 && <li className={styles.warn}><strong>{late}</strong> {late === 1 ? 'finalizada depois do envio' : 'finalizadas depois do envio'}</li>}
        <li><strong>{rows.length}</strong> {rows.length === 1 ? 'procedimento realizado' : 'procedimentos realizados'}</li>
      </ul>
      {rows.length ? <PagedList records={rows} label="Procedimentos realizados no dia" resetKey={`${date}${doctorId}`}>{page => <div className={`${uiStyles.records} ${styles.dailyColumns}`}>
        <div className={uiStyles.recordHead} aria-hidden="true"><span>Horário · paciente</span><span>Procedimento realizado</span><span className={uiStyles.recordNumber}>Qtd.</span><span>Dente · região</span><span>Atendimento</span><span>Observação</span><span/></div>
        <ul className={uiStyles.recordList}>{page.map(row => <li key={row.id}>
          <div className={styles.rowTitle}><span>{row.time}</span><strong>{row.patient}</strong></div>
          <dl><div><dt>Procedimento realizado</dt><dd>{row.procedure}</dd></div><div className={uiStyles.recordNumber}><dt>Quantidade</dt><dd>{row.quantity}</dd></div><div><dt>Dente · região</dt><dd>{row.place || <span className={uiStyles.recordMuted}>—</span>}</dd></div><div><dt>Atendimento</dt><dd><Attendance row={row}/></dd></div><div><dt>Observação</dt><dd>{row.note || <span className={uiStyles.recordMuted}>—</span>}</dd></div></dl>
          <div className={uiStyles.recordActions}>{editable ? <Link to={`/agenda/${row.appointmentId}/finalizar`} aria-label={`Corrigir ${row.procedure} de ${row.patient}`}>Corrigir</Link> : <Link to={`/agenda/${row.appointmentId}`} aria-label={`Ver consulta de ${row.patient}`}>Consulta</Link>}</div>
        </li>)}</ul></div>}</PagedList> : <p className={styles.emptyNote}>Nenhum procedimento realizado para {doctor?.name} nesta data{showClinics ? ' e clínica' : ''}. Os itens aparecem aqui quando as consultas são finalizadas.</p>}
      <div className={styles.sendBar}>
        <Field id="report_note" label="Observações do dia (opcional)"><input value={note} disabled={!editable || Boolean(saving)} onChange={event => changeNote(event.target.value)}/></Field>
        {editable && <><Button variant="secondary" busy={saving === 'draft'} disabled={Boolean(saving) || (!dirty && Boolean(report))} onClick={() => save(false)}>{saving === 'draft' ? 'Salvando…' : 'Salvar rascunho'}</Button><Button busy={saving === 'send'} disabled={Boolean(saving) || !rows.length} onClick={() => save(true)}>{saving === 'send' ? 'Enviando…' : 'Enviar relatório'}</Button></>}
      </div>
      <p className={styles.note}>{editable ? 'Consultas sem finalização ficam fora do envio e continuam como pendência. Depois de enviado, o relatório só muda se for devolvido para correção.' : status === 'Validado' ? 'Relatório validado: os procedimentos e as observações não podem mais ser alterados.' : 'Relatório enviado: aguardando a conferência. A correção depende da devolução.'}</p>
      {report && <section className={uiStyles.section} aria-labelledby="report_history"><h2 id="report_history">Histórico do relatório</h2><HistoryList entries={report.history}/></section>}
    </>}
  </>;
}
export function ReportReviewPage() {
    const { data, resource, date, doctorId, clinicId, status, statuses, clinics, filtered, rows, toReview, selected, reason, reasonError, saving, saveError, success, tabs, filter, clearFilters, changeReason, review } = useReportReviewViewModel();
    const feedback = useRef(null);
    useEffect(() => {
        if (saveError || success)
            feedback.current?.focus();
    }, [saveError, success]);
    async function handle(decision) { const target = await review(decision); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    return <>
    <PageHeader title="Conferência diária" description="Confira os relatórios enviados pelos doutores e devolva para correção quando necessário." action={<LocalView role="Dona"/>}/>
    <ReportTabs tabs={tabs}/>
    <div className={styles.filters}>
      <Field id="review_date" label="Data"><input type="date" value={date} onChange={event => filter('data', event.target.value)}/></Field>
      {clinics.length > 0 && <Field id="review_clinic" label="Clínica"><select value={clinicId} onChange={event => filter('clinica', event.target.value)}><option value="">Todas as clínicas</option>{clinics.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}<option value="sem">Sem clínica</option></select></Field>}
      <RecordPicker id="review_doctor" label="Doutor" kind="doctor" records={data.doctors} value={doctorId} compact emptyLabel="Todos os doutores" onChange={value => filter('doutor', value)}/>
      <Field id="review_status" label="Situação"><select value={status} onChange={event => filter('situacao', event.target.value)}><option value="">Todas</option>{statuses.map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
      {filtered && <Button variant="quiet" onClick={clearFilters}>Limpar filtros</Button>}
      {!resource.busy && !resource.error && <p role="status" className={styles.count}>{plural(rows.length, 'relatório', 'relatórios')} · {toReview} a conferir</p>}
    </div>
    {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : !rows.length ? <EmptyState title={filtered ? 'Nenhum relatório encontrado' : 'Ainda não há relatórios'} detail={filtered ? 'Ajuste os filtros para consultar outros relatórios.' : 'Os relatórios aparecem quando há consultas finalizadas.'} action={filtered ? <Button variant="secondary" onClick={clearFilters}>Limpar filtros</Button> : undefined}/> : <div className={styles.review}>
      <PagedList records={rows} label="Relatórios diários" pageKey="pagina" compact>{page => <div className={`${uiStyles.records} ${styles.reviewColumns}`}>
        <div className={uiStyles.recordHead} aria-hidden="true"><span>Doutor · clínica</span><span>Situação</span></div>
        <ul className={uiStyles.recordList}>{page.map(row => <li key={row.id} className={row.current ? styles.current : undefined}>
          <div><h2><Link to={row.to} aria-current={row.current ? 'true' : undefined}>{row.doctor}</Link></h2><small title={`${dateLabel(row.date)}${row.clinic ? ` · ${row.clinic}` : ''}`}>{dateLabel(row.date)}{row.clinic ? ` · ${row.clinic}` : ''} · {plural(row.items, 'item', 'itens')}</small></div>
          <div><StatusLabel tone={row.tone}>{row.status}</StatusLabel></div>
        </li>)}</ul></div>}</PagedList>
      <section className={styles.detail} aria-labelledby="review_selected">
        <div className={styles.detailHeading}><div><h2 id="review_selected">{selected.doctor}{selected.clinic ? ` · ${selected.clinic}` : ''}</h2><p>{dateLabel(selected.date)} · {plural(selected.summary.finalized, 'consulta finalizada', 'consultas finalizadas')}, {plural(selected.summary.missed, 'falta', 'faltas')}, {selected.summary.unfinished} sem finalização</p></div><StatusLabel tone={selected.tone}>{selected.status}</StatusLabel></div>
        {(saveError || success) && <div ref={feedback} tabIndex={-1} className={styles.feedback}><Feedback tone={saveError ? 'error' : 'success'} title={saveError ? 'Não foi possível concluir' : undefined}>{saveError || success}</Feedback></div>}
        {selected.rows.length ? <PagedList records={selected.rows} label="Procedimentos do relatório" pageSize={4} resetKey={selected.date + selected.doctor + selected.clinic} compact>{page => <div className={`${uiStyles.records} ${styles.detailColumns}`}>
          <div className={uiStyles.recordHead} aria-hidden="true"><span>Horário · paciente</span><span>Procedimento realizado</span><span className={uiStyles.recordNumber}>Qtd.</span><span>Atendimento</span></div>
          <ul className={uiStyles.recordList}>{page.map(row => <li key={row.id}><div className={styles.rowTitle}><span>{row.time}</span><strong>{row.patient}</strong></div><dl><div><dt>Procedimento realizado</dt><dd>{row.procedure}{row.place && <small>{row.place}</small>}</dd></div><div className={uiStyles.recordNumber}><dt>Quantidade</dt><dd>{row.quantity}</dd></div><div><dt>Atendimento</dt><dd>{row.attendance === 'Convênio' ? row.insurance || 'Convênio' : row.attendance || <span className={uiStyles.pending}>Não informada</span>}</dd></div></dl></li>)}</ul></div>}</PagedList> : <p className={styles.emptyNote}>Este relatório ainda não tem procedimentos realizados.</p>}
        {selected.report?.note && <p className={styles.note}><strong>Observações do doutor:</strong> {selected.report.note}</p>}
        {selected.report?.reason && selected.status === 'Em correção' && <p className={styles.note}><strong>Motivo da devolução:</strong> {selected.report.reason}</p>}
        {selected.reviewable ? <div className={styles.decision}>
          <Field id="review_reason" label="Motivo da correção (obrigatório apenas para devolver)" error={reasonError}><input value={reason} disabled={Boolean(saving)} onChange={event => changeReason(event.target.value)}/></Field>
          <div><Button variant="secondary" busy={saving === 'devolver'} disabled={Boolean(saving)} onClick={() => handle('devolver')}>{saving === 'devolver' ? 'Devolvendo…' : 'Devolver para correção'}</Button><Button busy={saving === 'validar'} disabled={Boolean(saving)} onClick={() => handle('validar')}>{saving === 'validar' ? 'Validando…' : 'Validar relatório'}</Button></div>
        </div> : <p className={styles.note}>{selected.status === 'Validado' ? 'Relatório validado. A validação não bloqueia cobrança nem pagamento; apenas encerra a conferência.' : selected.status === 'Em correção' ? 'Aguardando o reenvio pelo doutor.' : 'Ainda não enviado pelo doutor. A conferência fica disponível após o envio.'}</p>}
      </section>
    </div>}
  </>;
}
function download(name, text) {
    const url = URL.createObjectURL(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
}
const value = (cents, unknown = 'Não informado') => Number.isSafeInteger(cents) ? money(cents) : <span className={uiStyles.pending}>{unknown}</span>;
export function MonthlyReportPage() {
    const { data, resource, month, monthLabel, basis, doctorId, clinicId, attendance, attendances, insurance, insurances, status, statuses, clinics, showClinic, rows, totals, selected, listPath, tabs, filtered, csv, fileName, filter, clearFilters } = useMonthlyReportViewModel();
    return <>
    <PageHeader title="Relatório mensal e glosas" description="Cada linha é um procedimento efetivamente realizado. Os totais acompanham os filtros." action={<><Button variant="secondary" onClick={() => window.print()}>Imprimir</Button><Button variant="secondary" disabled={!rows.length} onClick={() => download(fileName, csv())}>Exportar CSV</Button></>}/>
    <ReportTabs tabs={tabs}/>
    <div className={`${styles.filters} ${styles.monthly}`}>
      <Field id="monthly_month" label="Mês"><input type="month" value={month} onChange={event => filter('mes', event.target.value)}/></Field>
      <Field id="monthly_basis" label="Considerar"><select value={basis} onChange={event => filter('base', event.target.value === 'retorno' ? 'retorno' : '')}><option value="execucao">Data da execução</option><option value="retorno">Data do retorno</option></select></Field>
      {clinics.length > 0 && <Field id="monthly_clinic" label="Clínica"><select value={clinicId} onChange={event => filter('clinica', event.target.value)}><option value="">Todas</option>{clinics.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}<option value="sem">Sem clínica</option></select></Field>}
      <RecordPicker id="monthly_doctor" label="Doutor" kind="doctor" records={data.doctors} value={doctorId} compact emptyLabel="Todos" onChange={next => filter('doutor', next)}/>
      <Field id="monthly_attendance" label="Atendimento"><select value={attendance} onChange={event => filter('atendimento', event.target.value)}><option value="">Todos</option>{attendances.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      <Field id="monthly_insurance" label="Convênio"><select value={insurance} onChange={event => filter('convenio', event.target.value)}><option value="">Todos</option>{insurances.map(name => <option key={name} value={name}>{name}</option>)}</select></Field>
      <Field id="monthly_status" label="Situação"><select value={status} onChange={event => filter('situacao', event.target.value)}><option value="">Todas</option>{statuses.map(name => <option key={name} value={name}>{name}</option>)}</select></Field>
    </div>
    {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : <>
      <p className={styles.printTitle}>Relatório mensal · {monthLabel} · {basis === 'retorno' ? 'por data do retorno do convênio' : 'por data da execução'}</p>
      <dl className={styles.totals} aria-label={`Totais de ${monthLabel} conforme os filtros`}>
        <div className={styles.dark}><dt>Procedimentos realizados</dt><dd><span>{totals.items}<small>{totals.items === 1 ? 'item' : 'itens'}</small></span><small>{plural(totals.units, 'unidade', 'unidades')} · {totals.plan} de convênio</small></dd></div>
        <div><dt>Valor apresentado</dt><dd><span>{totals.presentedCount ? money(totals.presentedCents) : <span className={styles.unknown}>Não informado</span>}</span><small>{plural(totals.presentedCount, 'item com valor informado', 'itens com valor informado')}</small></dd></div>
        <div><dt>Sem valor informado</dt><dd><span>{totals.unknownCount}<small>{totals.unknownCount === 1 ? 'item' : 'itens'}</small></span><small>Não entram como zero</small></dd></div>
        <div><dt>Aguardando retorno</dt><dd><span>{totals.waitingCount ? money(totals.waitingCents) : '—'}</span><small>{plural(totals.waitingCount, 'item apresentado', 'itens apresentados')}</small></dd></div>
        <div><dt>Valor glosado</dt><dd><span>{totals.glosaCount ? money(totals.glosaCents) : '—'}</span><small>{plural(totals.glosaCount, 'item', 'itens')} · {totals.glosaTotal} totais e {totals.glosaPartial} parciais</small></dd></div>
      </dl>
      {rows.length ? <div className={styles.screenOnly}><PagedList records={rows} label="Procedimentos realizados no mês" pageKey="pagina">{page => <div className={`${uiStyles.records} ${showClinic ? styles.monthlyColumns : styles.monthlyColumnsPlain}`}>
        <div className={uiStyles.recordHead} aria-hidden="true"><span>Execução</span><span>Procedimento realizado</span><span>Paciente</span><span>Doutor{showClinic ? ' · clínica' : ''}</span><span>Convênio · guia</span><span className={uiStyles.recordNumber}>Apresentado</span><span className={uiStyles.recordNumber}>Glosado</span><span>Situação</span></div>
        <ul className={uiStyles.recordList}>{page.map(row => <li key={row.id} className={row.current ? styles.current : undefined}>
          <div className={styles.execution}><span>{dateLabel(row.date)}</span><small>{row.time}</small></div>
          <div><h2 title={row.procedure}>{row.attendance === 'Convênio' ? <Link to={row.to} aria-label={`Conferir ${row.procedure} de ${row.patient}, ${dateLabel(row.date)}`}>{row.procedure}</Link> : row.procedure}</h2><small>{plural(row.quantity, 'unidade', 'unidades')}{row.place ? ` · ${row.place}` : ''}</small></div>
          <dl>
            <div><dt>Paciente</dt><dd title={row.patient}><Link to={`/agenda/${row.appointmentId}`} aria-label={`Ver consulta de ${row.patient}`}>{row.patient}</Link></dd></div>
            <div><dt>Doutor{showClinic ? ' · clínica' : ''}</dt><dd title={row.doctor}>{row.doctor}{showClinic && <small className={row.linked ? undefined : uiStyles.pending}>{row.clinic}</small>}</dd></div>
            <div><dt>Convênio · guia</dt><dd>{row.attendance === 'Convênio' ? <>{row.insurance || <span className={uiStyles.pending}>Convênio não informado</span>}<small className={row.claim?.guide ? undefined : uiStyles.pending}>{row.claim?.guide ? `Guia ${row.claim.guide}` : 'Guia não informada'}</small></> : <span className={uiStyles.recordMuted}>{row.attendance || 'Forma não informada'}</span>}</dd></div>
            <div className={uiStyles.recordNumber}><dt>Valor apresentado</dt><dd>{row.attendance === 'Convênio' ? value(row.claim?.presentedCents) : <span className={uiStyles.recordMuted}>—</span>}</dd></div>
            <div className={uiStyles.recordNumber}><dt>Valor glosado</dt><dd>{Number.isSafeInteger(row.claim?.glosaCents) ? money(row.claim.glosaCents) : <span className={uiStyles.recordMuted}>—</span>}</dd></div>
          </dl>
          <div><StatusLabel tone={row.tone}>{row.status}</StatusLabel></div>
        </li>)}</ul></div>}</PagedList></div> : <EmptyState title="Nenhum procedimento realizado encontrado" detail={filtered ? 'Ajuste os filtros para consultar outros registros do mês.' : `Não há procedimentos realizados em ${monthLabel}. Eles aparecem quando as consultas são finalizadas.`} action={filtered ? <Button variant="secondary" onClick={clearFilters}>Limpar filtros</Button> : <ActionLink variant="secondary" to="/agenda">Ver agenda</ActionLink>}/>}
      {rows.length > 0 && <table className={styles.printTable}><caption>Procedimentos realizados conforme os filtros: {plural(rows.length, 'item', 'itens')}</caption>
        <thead><tr><th>Execução</th><th>Procedimento</th><th>Qtd.</th><th>Paciente</th><th>Doutor</th>{showClinic && <th>Clínica</th>}<th>Atendimento</th><th>Guia</th><th>Apresentado</th><th>Glosado</th><th>Situação</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}><td>{dateLabel(row.date)} {row.time}</td><td>{row.procedure}{row.place ? ` · ${row.place}` : ''}</td><td>{row.quantity}</td><td>{row.patient}</td><td>{row.doctor}</td>{showClinic && <td>{row.clinic}</td>}<td>{row.attendance ? `${row.attendance}${row.insurance ? ` · ${row.insurance}` : ''}` : 'Não informada'}</td><td>{row.claim?.guide || (row.attendance === 'Convênio' ? 'Não informada' : '—')}</td><td>{Number.isSafeInteger(row.claim?.presentedCents) ? money(row.claim.presentedCents) : row.attendance === 'Convênio' ? 'Não informado' : '—'}</td><td>{Number.isSafeInteger(row.claim?.glosaCents) ? money(row.claim.glosaCents) : '—'}</td><td>{row.status}</td></tr>)}</tbody>
      </table>}
      <p className={styles.note}>Valor apresentado e valor mantido não são recebimento. Glosa, conferência e situação clínica da consulta são registros independentes.</p>
    </>}
    {selected && <ClaimPanel key={selected.id} item={selected} closeTo={listPath}/>}
  </>;
}
function ClaimPanel({ item, closeTo }) {
    const { fields, errors, saving, saveError, success, kept, returnMonth, change, submit } = useClaimFormViewModel({ item });
    const navigate = useNavigate();
    const dialog = useRef(null);
    const feedback = useRef(null);
    useEffect(() => {
        const element = dialog.current;
        if (!element.open)
            element.showModal();
        return () => { if (element.open) element.close(); };
    }, []);
    useEffect(() => {
        if (saveError || success)
            feedback.current?.focus();
    }, [saveError, success]);
    async function handleSubmit(event) { event.preventDefault(); const target = await submit(); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    function close(event) { event?.preventDefault(); navigate(closeTo); }
    const eligible = item.attendance === 'Convênio';
    const waiting = fields.result === 'Aguardando';
    return createPortal(<dialog ref={dialog} className={styles.drawer} aria-labelledby="claim_title" onCancel={close}>
      <header className={styles.drawerHeader}><div><p>Conferência do item · executado em {dateLabel(item.date)} às {item.time}</p><h2 id="claim_title">{item.procedure}</h2></div><Button variant="secondary" onClick={() => close()}>Fechar</Button></header>
      <form className={styles.drawerBody} onSubmit={handleSubmit} noValidate>
        <dl className={styles.facts}><div><dt>Paciente</dt><dd>{item.patient}</dd></div><div><dt>Doutor</dt><dd>{item.doctor}</dd></div>{item.clinic && <div><dt>Clínica</dt><dd>{item.clinic}</dd></div>}<div><dt>Convênio</dt><dd>{item.insurance || 'Não informado'}</dd></div><div><dt>Quantidade</dt><dd>{item.quantity}{item.place ? ` · ${item.place}` : ''}</dd></div><div><dt>Situação da consulta</dt><dd>Concluída</dd></div></dl>
        {(saveError || success) && <div ref={feedback} tabIndex={-1}><Feedback tone={saveError ? 'error' : 'success'} title={saveError ? 'Não foi possível salvar' : undefined}>{saveError || success}</Feedback></div>}
        {eligible ? <fieldset className={styles.claimFields} disabled={saving}><legend className={uiStyles.srOnly}>Conferência de convênio</legend>
          <Field id="claim_guide" label="Referência da guia ou cobrança"><input value={fields.guide} onChange={event => change('guide', event.target.value)}/></Field>
          <Field id="claim_presented" label="Valor apresentado (R$)" error={errors.presented} hint={errors.presented ? undefined : 'Deixe vazio enquanto não souber o valor.'}><input inputMode="decimal" placeholder="0,00" value={fields.presented} onChange={event => change('presented', event.target.value)}/></Field>
          <fieldset className={styles.result}><legend>Resultado do retorno</legend><div>{claimResults.map(result => <label key={result}><input type="radio" name="claim_result" value={result} checked={fields.result === result} onChange={() => change('result', result)}/><span>{result}</span></label>)}</div></fieldset>
          {!waiting && <Field id="claim_returnOn" label="Data do retorno do convênio" error={errors.returnOn}><input type="date" value={fields.returnOn} onChange={event => change('returnOn', event.target.value)}/></Field>}
          {!waiting && <div className={styles.readonly}><span>Mês do retorno</span><strong>{returnMonth || 'Informe a data'}</strong></div>}
          {fields.result === 'Glosa parcial' && <Field id="claim_glosa" label="Valor glosado (R$)" error={errors.glosa}><input inputMode="decimal" placeholder="0,00" value={fields.glosa} onChange={event => change('glosa', event.target.value)}/></Field>}
          {!waiting && <div className={styles.readonly}><span>Mantido após a glosa (não é recebimento)</span><strong>{kept || 'A calcular'}</strong></div>}
          {(fields.result === 'Glosa parcial' || fields.result === 'Glosa total') && <div className={styles.wide}><Field id="claim_reason" label="Motivo da glosa (opcional)"><input value={fields.reason} onChange={event => change('reason', event.target.value)}/></Field></div>}
        </fieldset> : <Feedback tone="info">A conferência de convênio vale apenas para procedimentos realizados por convênio. Este item está como {item.attendance || 'forma não informada'}.</Feedback>}
        <section aria-labelledby="claim_history"><h3 id="claim_history">Histórico do item</h3><HistoryList entries={item.history}/></section>
        <footer className={styles.drawerFooter}>{eligible && <Button type="submit" busy={saving}>{saving ? 'Salvando…' : 'Salvar conferência'}</Button>}<Button variant="secondary" onClick={() => close()}>Fechar</Button><Link to={`/agenda/${item.appointmentId}`}>Ver consulta</Link></footer>
      </form>
    </dialog>, document.body);
}
