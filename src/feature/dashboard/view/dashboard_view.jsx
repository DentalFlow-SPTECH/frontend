import { Link } from 'react-router-dom';
import { ActionLink, Button, Feedback, Field, LoadingState, PageHeader, StatusLabel } from '../../../component/ui.jsx';
import { budgetTotal, dateLabel, money } from '../../../demo/format.js';
import styles from './dashboard.module.css';
import { useMonthComparisonViewModel, useDashboardViewModel } from '../view_model/use_dashboard_view_model.js';
function WeekAppointmentsChart({ dates, counts }) {
    const maximum = Math.max(...counts, 1);
    const weekLabel = `${dateLabel(dates[0])} a ${dateLabel(dates[6])}`;
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
    return <figure className={styles.weekComparison} aria-labelledby="dashboard_week_comparison">
    <figcaption><h3 id="dashboard_week_comparison">Consultas registradas por dia</h3><p>Semana de {weekLabel}. Selecione um dia para abrir a Agenda.</p></figcaption>
    <ol className={styles.weekBars} aria-label={`Consultas registradas na semana de ${weekLabel}`}>
      {dates.map((day, index) => {
            const count = counts[index];
            const label = weekday.format(new Date(`${day}T12:00:00Z`)).replace('.', '');
            return <li key={day}><Link to={`/agenda?date=${day}`} aria-label={`Abrir agenda de ${dateLabel(day)}: ${count} ${count === 1 ? 'consulta registrada' : 'consultas registradas'}`}><span className={styles.weekBar} aria-hidden="true"><span style={{ height: `${count / maximum * 100}%` }}/></span><strong>{count}</strong><span>{label}</span><time dateTime={day}>{dateLabel(day).slice(0, 5)}</time></Link></li>;
        })}
    </ol>
    <p className={styles.chartHint}>A contagem inclui todos os registros de consulta; a situação de cada atendimento aparece na Agenda.</p>
  </figure>;
}
function MonthComparison({ movements, date }) {
    const { periods, maximum } = useMonthComparisonViewModel({ movements, date });
    if (!maximum)
        return <div className={styles.cashEmpty}><p>Nenhuma entrada ou saída registrada nos últimos seis meses deste período.</p><ActionLink variant="secondary" to={`/caixa/entrada`}>Registrar entrada</ActionLink></div>;
    return <figure className={styles.comparison}>
    <figcaption><h3>Entradas e saídas por mês</h3><p>Últimos seis meses até {periods[5].label}.</p></figcaption>
    <div className={styles.legend}><span><i className={styles.entryKey} aria-hidden="true"/> Entradas</span><span><i className={styles.exitKey} aria-hidden="true"/> Saídas</span></div>
    <div className={styles.bars} role="img" aria-label="Comparação das entradas e saídas registradas nos últimos seis meses. Os valores exatos estão na tabela abaixo.">
      {periods.map(period => <div className={styles.month} key={period.key} aria-hidden="true"><div className={styles.barPair}><span className={styles.entryBar} style={{ height: `${period.entries / maximum * 100}%` }}/><span className={styles.exitBar} style={{ height: `${period.exits / maximum * 100}%` }}/></div><span>{period.shortLabel}</span></div>)}
    </div>
    <details className={styles.chartValues}><summary>Ver valores por mês</summary><div className={styles.tableScroll}><table><caption>Entradas e saídas registradas em cada mês. Selecione o mês para conferir as movimentações.</caption><thead><tr><th scope="col">Mês</th><th scope="col">Entradas</th><th scope="col">Saídas</th></tr></thead><tbody>{periods.map(period => <tr key={period.key}><th scope="row"><Link to={`/caixa?de=${period.from}&ate=${period.until}`} aria-label={`Ver caixa de ${period.label}`}>{period.shortLabel}</Link></th><td>{money(period.entries)}</td><td>{money(period.exits)}</td></tr>)}</tbody></table></div></details>
  </figure>;
}
export function DashboardPage() {
    const { data, resource, changeDate, showToday, date, period, dayAppointments, weekDates, weekCounts, hasWeekAppointments, lowProducts, recentBudgets, totals, cashPath, agendaPath, newAppointmentPath, metrics } = useDashboardViewModel();
    return <>
    <PageHeader title="Painel" description="A rotina da clínica em uma visão geral." action={<><ActionLink to={newAppointmentPath}>Agendar consulta</ActionLink><ActionLink variant="secondary" to="/orcamentos/novo">Novo orçamento</ActionLink></>}/>
    <div className={styles.dateToolbar}><Field id="dashboard_date" label="Dia de referência"><input type="date" value={date} onChange={event => changeDate(event.target.value)}/></Field><Button variant="secondary" onClick={showToday}>Hoje</Button><p>Atendimentos do dia e movimentações do mês de referência.</p></div>
    {resource.busy ? <LoadingState /> : resource.error ? <div className={styles.readError}><Feedback tone="error" title="Não foi possível carregar o painel">{resource.error}</Feedback><Button variant="secondary" onClick={resource.retry}>Tentar novamente</Button></div> : <>
      <dl className={styles.metrics} aria-label="Resumo da clínica">{metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd><span>{metric.value}</span><Link to={metric.to}>{metric.hint}<span aria-hidden="true"> →</span></Link></dd></div>)}</dl>
      <div className={styles.contentGrid}><div className={styles.column}>
        <section className={styles.panel} aria-labelledby="dashboard_appointments"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Atendimentos</p><h2 id="dashboard_appointments">Consultas de {dateLabel(date)}</h2></div><ActionLink variant="quiet" to={agendaPath}>Ver agenda</ActionLink></div>
          {dayAppointments.length ? <><ul className={styles.appointments} aria-label="Consultas do dia">{dayAppointments.slice(0, 6).map(appointment => <li key={appointment.id}><time dateTime={`${appointment.date}T${appointment.time}`}>{appointment.time}<span>{appointment.duration} min</span></time><div><Link to={`/agenda/${appointment.id}?date=${date}`}>{data.patients.find(patient => patient.id === appointment.patientId)?.name ?? 'Paciente não disponível'}</Link><p>{appointment.procedure}</p><p>{data.doctors.find(doctor => doctor.id === appointment.doctorId)?.name ?? 'Doutor não disponível'}</p></div><StatusLabel tone={appointment.status === 'Concluída' ? 'success' : appointment.status === 'Faltou' ? 'warning' : 'neutral'}>{appointment.status || 'Situação não definida'}</StatusLabel></li>)}</ul><p className={styles.countHint}>{dayAppointments.length > 6 ? `Mostrando 6 de ${dayAppointments.length} consultas. Abra a agenda para ver todas.` : 'A lista inclui consultas canceladas e faltas, com a situação de cada atendimento.'}</p></> : <div className={styles.empty}><h3>Nenhuma consulta para este dia</h3><p>Escolha outra data ou cadastre um atendimento.</p><ActionLink variant="secondary" to={newAppointmentPath}>Agendar consulta</ActionLink></div>}
          {hasWeekAppointments && <WeekAppointmentsChart dates={weekDates} counts={weekCounts}/>}
        </section>
        <section className={styles.panel} aria-labelledby="dashboard_cash"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Movimentações registradas</p><h2 id="dashboard_cash">Caixa de {period.label}</h2></div><ActionLink variant="quiet" to={cashPath}>Ver caixa do mês</ActionLink></div>
          <dl className={styles.cashTotals} aria-label={`Totais do caixa de ${period.label}`}><div><dt>Entradas</dt><dd>{money(totals.entries)}</dd></div><div><dt>Saídas</dt><dd>{money(totals.exits)}</dd></div><div><dt>Saldo das movimentações</dt><dd>{money(totals.entries - totals.exits)}</dd></div></dl>
          <p className={styles.countHint}>Saldo das movimentações registradas no mês: entradas menos saídas.</p>
          <MonthComparison movements={data.cashMovements} date={date}/>
        </section>
      </div><div className={styles.column}>
        <section className={styles.panel} aria-labelledby="dashboard_stock"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Materiais</p><h2 id="dashboard_stock">Atenção ao estoque</h2></div></div>
          {lowProducts.length ? <><ul className={styles.stock}>{lowProducts.slice(0, 4).map(product => <li key={product.id}><div className={styles.stockHeading}><Link to={`/estoque/${product.id}?abaixo=1`}>{product.name}</Link><StatusLabel tone="warning">{product.quantity === 0 ? 'Sem saldo' : 'Abaixo do mínimo'}</StatusLabel></div><p>Saldo: <strong>{product.quantity} {product.unit}</strong><span>Mínimo: {product.minimum} {product.unit}</span></p></li>)}</ul>{lowProducts.length > 4 && <p className={styles.countHint}>Mostrando 4 de {lowProducts.length} materiais abaixo do mínimo.</p>}<ActionLink variant="secondary" to="/estoque?abaixo=1">Conferir materiais</ActionLink></> : <div className={styles.empty}><h3>{data.products.length ? 'Nenhum material abaixo do mínimo' : 'Ainda não há materiais cadastrados'}</h3><p>{data.products.length ? 'Confira quantidades e movimentações no estoque.' : 'Cadastre os materiais utilizados pela clínica.'}</p><ActionLink variant="secondary" to={data.products.length ? '/estoque' : '/estoque/novo'}>{data.products.length ? 'Ver estoque' : 'Cadastrar material'}</ActionLink></div>}
        </section>
        <section className={styles.panel} aria-labelledby="dashboard_budgets"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Planejamento</p><h2 id="dashboard_budgets">Orçamentos recentes</h2></div></div>
          {recentBudgets.length ? <><ul className={styles.budgets}>{recentBudgets.map(budget => <li key={budget.id}><div><Link to={`/orcamentos/${budget.id}`}>{budget.code}</Link><time dateTime={budget.createdOn}>{dateLabel(budget.createdOn)}</time></div><div className={styles.budgetSummary}><p>{data.patients.find(patient => patient.id === budget.patientId)?.name ?? 'Paciente não disponível'}</p><strong>{money(budgetTotal(budget.items))}</strong></div></li>)}</ul><ActionLink variant="secondary" to="/orcamentos">Ver todos os orçamentos</ActionLink></> : <div className={styles.empty}><h3>Ainda não há orçamentos</h3><p>Cadastre um orçamento com os procedimentos planejados.</p><ActionLink variant="secondary" to="/orcamentos/novo">Criar orçamento</ActionLink></div>}
        </section>
      </div></div>
    </>}
  </>;
}
