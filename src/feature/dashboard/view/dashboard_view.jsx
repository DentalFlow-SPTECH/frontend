import { Link } from 'react-router-dom';
import { ActionLink, Button, Feedback, Field, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../../component/ui.jsx';
import { money } from '../../../demo/format.js';
import styles from './dashboard.module.css';
import { useDashboardViewModel } from '../view_model/use_dashboard_view_model.js';
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
function Metric({ label, value, children, dark = false }) {
    return <div className={dark ? styles.metricDark : undefined}><dt>{label}</dt><dd><span>{value}</span><small>{children}</small></dd></div>;
}
function ClinicTable({ clinics, clinicId, periodLabel, agendaPath }) {
    const rows = [...clinics.rows, ...(clinics.unlinked ? [clinics.unlinked] : [])];
    return <section className={styles.panel} aria-labelledby="dashboard_clinics"><div className={styles.sectionHeading}><div><h2 id="dashboard_clinics">Por clínica</h2><p>Consultas da Agenda em {periodLabel}.</p></div><Link to={agendaPath}>Ver agenda</Link></div>
      <div className={styles.tableScroll}><table className={`${uiStyles.table} ${styles.compactTable}`}><caption className={uiStyles.srOnly}>Indicadores de atendimento por clínica em {periodLabel}</caption>
        <thead><tr><th scope="col">Clínica</th><th scope="col" className={uiStyles.numeric}>Consultas registradas</th><th scope="col" className={uiStyles.numeric}>Consultas finalizadas</th><th scope="col" className={uiStyles.numeric}>Sem finalização</th><th scope="col" className={uiStyles.numeric}>Pacientes atendidos</th><th scope="col" className={uiStyles.numeric}>Relatórios a conferir</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className={row.id === clinicId ? styles.selectedRow : undefined}><th scope="row">{row.id === 'sem' ? <><span className={uiStyles.pending}>Sem clínica</span> · <Link to="/administracao/vinculos">vincular</Link></> : row.name}</th><td className={uiStyles.numeric}>{row.registered}</td><td className={uiStyles.numeric}>{row.finalized}</td><td className={uiStyles.numeric}>{row.unfinished}</td><td className={uiStyles.numeric}>{row.patients}</td><td className={uiStyles.numeric}>{row.toReview}</td></tr>)}
          <tr className={styles.totalRow}><th scope="row">Todas as clínicas</th><td className={uiStyles.numeric}>{clinics.total.registered}</td><td className={uiStyles.numeric}>{clinics.total.finalized}</td><td className={uiStyles.numeric}>{clinics.total.unfinished}</td><td className={uiStyles.numeric}>{clinics.total.patients}</td><td className={uiStyles.numeric}>{clinics.total.toReview}</td></tr></tbody>
      </table></div>
      <p className={styles.note}>Pacientes: {plural(clinics.total.patients, 'pessoa distinta', 'pessoas distintas')}{clinics.repeatedPatients > 0 ? `; ${clinics.repeatedPatients} em mais de uma clínica (as linhas somam mais).` : '; cada uma conta uma vez.'}</p>
    </section>;
}
function Pending({ pending, paths, hasClinics }) {
    const items = [[pending.unfinished, 'Consultas sem finalização', 'Agenda', paths.agenda], [pending.toReview, 'Relatórios diários a conferir', 'Relatórios', paths.review], [pending.inCorrection, 'Relatórios em correção', 'Relatórios', paths.correction], [pending.waiting, 'Convênio aguardando retorno', 'Mensal', paths.waiting], ...(hasClinics ? [[pending.unlinked, 'Registros antigos sem clínica', 'Vincular', paths.links]] : []), [pending.lowStock, 'Materiais abaixo do mínimo', 'Estoque', paths.stock]];
    return <section className={styles.panel} aria-labelledby="dashboard_pending"><div className={styles.sectionHeading}><div><h2 id="dashboard_pending">Pendências</h2><p>Abra o módulo para resolver cada item.</p></div></div>
      <ul className={styles.pending}>{items.map(([count, label, target, to]) => <li key={label}><strong>{count}</strong><span>{label}</span><Link to={to} aria-label={`${label}: abrir ${target}`}>{target}<span aria-hidden="true">→</span></Link></li>)}</ul>
    </section>;
}
function MonthComparison({ months, maximum, cashPath }) {
    if (!maximum)
        return <div className={styles.empty}><p>Nenhuma entrada ou saída registrada nos últimos seis meses deste período.</p><ActionLink variant="secondary" to="/caixa/entrada">Registrar entrada</ActionLink></div>;
    return <figure className={styles.comparison}>
    <div className={styles.legend}><span><i className={styles.entryKey} aria-hidden="true"/> Entradas</span><span><i className={styles.exitKey} aria-hidden="true"/> Saídas</span></div>
    <div className={styles.bars} role="img" aria-label="Comparação das entradas e saídas registradas nos últimos seis meses. Os valores exatos estão na tabela abaixo.">
      {months.map(period => <div className={styles.month} key={period.key} aria-hidden="true"><div className={styles.barPair}><span className={styles.entryBar} style={{ height: `${period.entries / maximum * 100}%` }}/><span className={styles.exitBar} style={{ height: `${period.exits / maximum * 100}%` }}/></div><span>{period.shortLabel}</span></div>)}
    </div>
    <details className={styles.chartValues}><summary>Ver valores por mês</summary><div className={styles.tableScroll}><table><caption>Entradas e saídas registradas em cada mês. Selecione o mês para conferir as movimentações.</caption><thead><tr><th scope="col">Mês</th><th scope="col">Entradas</th><th scope="col">Saídas</th></tr></thead><tbody>{months.map(period => <tr key={period.key}><th scope="row"><Link to={`/caixa?de=${period.from}&ate=${period.until}`} aria-label={`Ver caixa de ${period.label}`}>{period.shortLabel}</Link></th><td>{money(period.entries)}</td><td>{money(period.exits)}</td></tr>)}</tbody></table></div></details>
    <p className={styles.note}><Link to={cashPath}>Ver caixa do mês</Link></p>
  </figure>;
}
export function DashboardPage() {
    const { resource, tab, tabs, clinicId, clinicOptions, period, periodRange, hasClinics, metrics, clinics, pending, production, totals, months, maximum, paths, changeClinic, showMonth, showToday } = useDashboardViewModel();
    const claims = production.totals;
    return <>
    <PageHeader title="Painel" description="A rotina da clínica em uma visão geral." action={<><ActionLink to={paths.newAppointment}>Agendar consulta</ActionLink><ActionLink variant="secondary" to="/orcamentos/novo">Novo orçamento</ActionLink></>}/>
    <div className={styles.contextBar}>
      {clinicOptions.length > 0 && <Field id="dashboard_clinic" label="Clínica"><select value={clinicId} onChange={event => changeClinic(event.target.value)}><option value="">Todas as clínicas</option>{clinicOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>}
      <div className={styles.period} role="group" aria-label="Período"><span className={styles.periodLabel}>Período</span><div><Button variant="secondary" aria-label="Mês anterior" onClick={() => showMonth(-1)}>←</Button><strong id="dashboard_period" aria-live="polite">{period.label}</strong><Button variant="secondary" aria-label="Próximo mês" onClick={() => showMonth(1)}>→</Button><Button variant="quiet" onClick={showToday}>Mês atual</Button></div></div>
      <p>{periodRange}{hasClinics && pending.unlinked > 0 && <><br/><span className={uiStyles.pending}>{plural(pending.unlinked, 'registro antigo', 'registros antigos')} sem clínica</span> · <Link to={paths.links}>vincular</Link></>}</p>
    </div>
    <nav className={uiStyles.tabs} aria-label="Seções do painel">{tabs.map(value => <Link key={value.key} to={value.to} aria-current={value.current ? 'page' : undefined}>{value.label}</Link>)}</nav>
    {resource.busy ? <LoadingState /> : resource.error ? <div className={styles.readError}><Feedback tone="error" title="Não foi possível carregar o painel">{resource.error}</Feedback><Button variant="secondary" onClick={resource.retry}>Tentar novamente</Button></div> : tab === 'geral' ? <>
      <dl className={styles.metrics} aria-label={`Indicadores de ${period.label}`}>
        <Metric dark label="Consultas registradas" value={metrics.registered}>Agenda · inclui {plural(metrics.cancelled, 'cancelada', 'canceladas')} e {plural(metrics.missed, 'falta', 'faltas')}. Não é ocupação.</Metric>
        <Metric label="Consultas finalizadas" value={metrics.finalized}>Com procedimentos realizados registrados na finalização.</Metric>
        <Metric label="Pacientes atendidos" value={metrics.patients}>Pessoas distintas com consulta finalizada; cada uma conta uma vez.</Metric>
        <Metric label="Consultas sem finalização" value={metrics.unfinished}>Datas passadas ainda Agendadas, Confirmadas ou Em atendimento.</Metric>
      </dl>
      <div className={styles.contentGrid}>
        {hasClinics ? <ClinicTable clinics={clinics} clinicId={clinicId} periodLabel={period.label} agendaPath={paths.agenda}/> : <section className={styles.panel} aria-labelledby="dashboard_clinics"><div className={styles.sectionHeading}><div><h2 id="dashboard_clinics">Por clínica</h2><p>Nenhuma clínica cadastrada.</p></div></div><div className={styles.empty}><p>Cadastre as clínicas para acompanhar cada unidade e filtrar a Agenda, os relatórios e este Painel.</p><ActionLink variant="secondary" to="/administracao/clinicas/nova">Cadastrar clínica</ActionLink><ActionLink variant="quiet" to={paths.agenda}>Ver agenda</ActionLink></div></section>}
        <Pending pending={pending} paths={paths} hasClinics={hasClinics}/>
      </div>
    </> : tab === 'producao' ? <>
      <dl className={styles.metrics} aria-label={`Produção de ${period.label}`}>
        <Metric dark label="Procedimentos realizados" value={production.items}>Itens da finalização de {plural(production.appointments, 'consulta', 'consultas')}. Agendado ou orçado não entra.</Metric>
        <Metric label="Forma de atendimento" value={<span className={styles.split}>{production.particular}<small>particular</small> {production.plan}<small>convênio</small></span>}>{plural(production.uninformed, 'item', 'itens')} sem forma informada (campo opcional).</Metric>
        <Metric label="Relatórios diários validados" value={<>{production.validated}<small className={styles.of}>de {production.expected}</small></>}>Esperados: dias com consulta finalizada, por doutor e clínica.</Metric>
        <Metric label="Relatórios pendentes" value={production.expected - production.validated}>{production.toReview} a conferir · {production.inCorrection} em correção · {production.notSent} não enviados.</Metric>
      </dl>
      <div className={styles.contentGrid}>
        <section className={styles.panel} aria-labelledby="dashboard_doctors"><div className={styles.sectionHeading}><div><h2 id="dashboard_doctors">Produção por doutor</h2><p>{period.label} · quantidades, sem valores, repasses ou comissões.</p></div><Link to={paths.reports}>Relatórios diários</Link></div>
          {production.doctors.length ? <><div className={styles.tableScroll}><table className={`${uiStyles.table} ${styles.compactTable}`}><caption className={uiStyles.srOnly}>Procedimentos realizados por doutor em {period.label}</caption>
            <thead><tr><th scope="col">Doutor</th><th scope="col" className={uiStyles.numeric}>Consultas finalizadas</th><th scope="col" className={uiStyles.numeric}>Procedimentos realizados</th><th scope="col" className={uiStyles.numeric}>Particular</th><th scope="col" className={uiStyles.numeric}>Convênio</th><th scope="col" className={uiStyles.numeric}>Relatórios pendentes</th></tr></thead>
            <tbody>{production.doctors.slice(0, 5).map(doctor => <tr key={doctor.id}><th scope="row" className={styles.clip} title={doctor.name}><Link to={`/doutores/${doctor.id}`}>{doctor.name}</Link></th><td className={uiStyles.numeric}>{doctor.appointments}</td><td className={uiStyles.numeric}>{doctor.items}</td><td className={uiStyles.numeric}>{doctor.particular}</td><td className={uiStyles.numeric}>{doctor.plan}</td><td className={uiStyles.numeric}>{doctor.pending ? <StatusLabel tone="warning">{doctor.pending}</StatusLabel> : 0}</td></tr>)}</tbody>
          </table></div>{production.doctors.length > 5 && <p className={styles.note}><Link to={paths.monthly}>Ver os {production.doctors.length} doutores no relatório mensal</Link></p>}</> : <div className={styles.empty}><p>Nenhum procedimento realizado registrado neste período. A produção aparece quando as consultas são finalizadas.</p><ActionLink variant="secondary" to={paths.agenda}>Ver agenda</ActionLink></div>}
        </section>
        <section className={styles.panel} aria-labelledby="dashboard_procedures"><div className={styles.sectionHeading}><div><h2 id="dashboard_procedures">Procedimentos mais realizados</h2><p>Quantidade de itens no período.</p></div></div>
          {production.procedures.length ? <ol className={styles.ranking}>{production.procedures.slice(0, 6).map(procedure => <li key={procedure.name}><span>{procedure.name}</span><i aria-hidden="true"><b style={{ width: `${procedure.total / production.procedures[0].total * 100}%` }}/></i><strong>{procedure.total}</strong></li>)}</ol> : <p className={styles.note}>Sem itens no período.</p>}
          <p className={styles.note}><Link to={paths.monthly}>Abrir relatório mensal</Link></p>
        </section>
      </div>
    </> : <>
      <dl className={`${styles.metrics} ${styles.three}`} aria-label={`Caixa de ${period.label}`}>
        <Metric label="Entradas registradas no Caixa" value={money(totals.entries)}>Movimentações manuais de {periodRange}.</Metric>
        <Metric label="Saídas registradas no Caixa" value={money(totals.exits)}>Movimentações manuais de {periodRange}.</Metric>
        <Metric dark label="Saldo das movimentações" value={money(totals.entries - totals.exits)}>Entradas menos saídas registradas. Não é saldo bancário nem lucro.</Metric>
      </dl>
      <div className={`${styles.contentGrid} ${styles.even}`}>
        <section className={styles.panel} aria-labelledby="dashboard_cash"><div className={styles.sectionHeading}><div><h2 id="dashboard_cash">Entradas e saídas por mês</h2><p>Últimos seis meses até {period.label} · origem: Caixa.</p></div></div><MonthComparison months={months} maximum={maximum} cashPath={paths.cash}/></section>
        <section className={styles.panel} aria-labelledby="dashboard_claims"><div className={styles.sectionHeading}><div><h2 id="dashboard_claims">Convênios em conferência</h2><p>Procedimentos executados em {period.label} · origem: Relatório mensal.</p></div></div>
          <ul className={styles.claims}>
            <li><span><strong>Valor apresentado</strong><small>{claims.presentedCount} de {plural(claims.plan, 'item', 'itens')} de convênio. {plural(claims.unknownCount, 'item', 'itens')} sem valor informado.</small></span><b>{claims.presentedCount ? money(claims.presentedCents) : 'Não informado'}</b></li>
            <li><span><strong>Aguardando retorno</strong><small>{plural(claims.waitingCount, 'item apresentado', 'itens apresentados')}, sem retorno do convênio.</small></span><b>{claims.waitingCount ? money(claims.waitingCents) : '—'}</b></li>
            <li><span><strong>Valor glosado</strong><small>{plural(claims.glosaCount, 'item', 'itens')}: {claims.glosaTotal} totais e {claims.glosaPartial} parciais.</small></span><b>{claims.glosaCount ? money(claims.glosaCents) : '—'}</b></li>
            <li><span><strong>Mantido após o retorno</strong><small>{plural(claims.keptCount, 'item', 'itens')}. Valor aprovado não é recebimento.</small></span><b>{claims.keptCount ? money(claims.keptCents) : '—'}</b></li>
          </ul>
          <p className={styles.note}><Link to={paths.monthly}>Abrir relatório mensal e glosas</Link></p>
        </section>
      </div>
      <p className={styles.note}>{hasClinics ? 'Com uma clínica selecionada, o Caixa mostra apenas as movimentações vinculadas a ela; as anteriores aparecem em “Sem clínica”. ' : ''}Orçamentos não entram como receita.</p>
    </>}
  </>;
}
