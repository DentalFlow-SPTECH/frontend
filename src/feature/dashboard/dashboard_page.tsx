import { Link, useSearchParams } from 'react-router-dom';
import { ActionLink, Button, Feedback, Field, LoadingState, PageHeader, StatusLabel } from '../../component/ui';
import { useResource } from '../../component/use_resource';
import { isDate } from '../../demo/clinic';
import { budgetTotal, dateLabel, money, today } from '../../demo/format';
import type { CashMovement } from '../../demo/model';
import { useDemo } from '../../demo/store';
import styles from './dashboard.module.css';

function monthWindow(date: string, offset = 0) {
  const start = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() + offset);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  return { key: start.toISOString().slice(0, 7), from: start.toISOString().slice(0, 10), until: end.toISOString().slice(0, 10), label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start), shortLabel: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(start) };
}
function shiftDate(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
function weekWindow(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const mondayOffset = value.getUTCDay() === 0 ? -6 : 1 - value.getUTCDay();
  const start = shiftDate(date, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
}
function cashTotals(movements: CashMovement[]) {
  return movements.reduce((total, movement) => ({ entries: total.entries + (movement.type === 'Entrada' ? movement.amountCents : 0), exits: total.exits + (movement.type === 'Saída' ? movement.amountCents : 0) }), { entries: 0, exits: 0 });
}
function WeekAppointmentsChart({ dates, counts }: { dates: string[]; counts: number[] }) {
  const maximum = Math.max(...counts, 1);
  const weekLabel = `${dateLabel(dates[0])} a ${dateLabel(dates[6])}`;
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
  return <figure className={styles.weekComparison} aria-labelledby="dashboard_week_comparison">
    <figcaption><h3 id="dashboard_week_comparison">Consultas registradas por dia</h3><p>Semana de {weekLabel}. Selecione um dia para abrir a Agenda.</p></figcaption>
    <ol className={styles.weekBars} aria-label={`Consultas registradas na semana de ${weekLabel}`}>
      {dates.map((day, index) => {
        const count = counts[index];
        const label = weekday.format(new Date(`${day}T12:00:00Z`)).replace('.', '');
        return <li key={day}><Link to={`/agenda?date=${day}`} aria-label={`Abrir agenda de ${dateLabel(day)}: ${count} ${count === 1 ? 'consulta registrada' : 'consultas registradas'}`}><span className={styles.weekBar} aria-hidden="true"><span style={{ height: `${count / maximum * 100}%` }} /></span><strong>{count}</strong><span>{label}</span><time dateTime={day}>{dateLabel(day).slice(0, 5)}</time></Link></li>;
      })}
    </ol>
    <p className={styles.chartHint}>A contagem inclui todos os registros de consulta; a situação de cada atendimento aparece na Agenda.</p>
  </figure>;
}
function MonthComparison({ movements, date }: { movements: CashMovement[]; date: string }) {
  const periods = Array.from({ length: 6 }, (_, index) => {
    const period = monthWindow(date, index - 5);
    return { ...period, ...cashTotals(movements.filter(movement => movement.date >= period.from && movement.date <= period.until)) };
  });
  const maximum = Math.max(...periods.flatMap(period => [period.entries, period.exits]));
  if (!maximum) return <div className={styles.cashEmpty}><p>Nenhuma entrada ou saída registrada nos últimos seis meses deste período.</p><ActionLink variant="secondary" to={`/caixa/entrada`}>Registrar entrada</ActionLink></div>;
  return <figure className={styles.comparison}>
    <figcaption><h3>Entradas e saídas por mês</h3><p>Últimos seis meses até {periods[5].label}.</p></figcaption>
    <div className={styles.legend}><span><i className={styles.entryKey} aria-hidden="true" /> Entradas</span><span><i className={styles.exitKey} aria-hidden="true" /> Saídas</span></div>
    <div className={styles.bars} role="img" aria-label="Comparação das entradas e saídas registradas nos últimos seis meses. Os valores exatos estão na tabela abaixo.">
      {periods.map(period => <div className={styles.month} key={period.key} aria-hidden="true"><div className={styles.barPair}><span className={styles.entryBar} style={{ height: `${period.entries / maximum * 100}%` }} /><span className={styles.exitBar} style={{ height: `${period.exits / maximum * 100}%` }} /></div><span>{period.shortLabel}</span></div>)}
    </div>
    <details className={styles.chartValues}><summary>Ver valores por mês</summary><div className={styles.tableScroll}><table><caption>Entradas e saídas registradas em cada mês. Selecione o mês para conferir as movimentações.</caption><thead><tr><th scope="col">Mês</th><th scope="col">Entradas</th><th scope="col">Saídas</th></tr></thead><tbody>{periods.map(period => <tr key={period.key}><th scope="row"><Link to={`/caixa?de=${period.from}&ate=${period.until}`} aria-label={`Ver caixa de ${period.label}`}>{period.shortLabel}</Link></th><td>{money(period.entries)}</td><td>{money(period.exits)}</td></tr>)}</tbody></table></div></details>
  </figure>;
}

export function DashboardPage() {
  const { data } = useDemo();
  const resource = useResource('dashboard');
  const [params, setParams] = useSearchParams();
  const date = isDate(params.get('date') ?? '') ? params.get('date')! : today();
  const period = monthWindow(date);
  const dayAppointments = data.appointments.filter(appointment => appointment.date === date).sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
  const weekDates = weekWindow(date);
  const weekCounts = weekDates.map(day => data.appointments.filter(appointment => appointment.date === day).length);
  const hasWeekAppointments = weekCounts.some(count => count > 0);
  const lowProducts = data.products.filter(product => product.quantity < product.minimum).sort((a, b) => Number(a.quantity !== 0) - Number(b.quantity !== 0) || a.name.localeCompare(b.name, 'pt-BR'));
  const recentBudgets = [...data.budgets].sort((a, b) => b.createdOn.localeCompare(a.createdOn) || b.code.localeCompare(a.code)).slice(0, 5);
  const monthlyCash = data.cashMovements.filter(movement => movement.date >= period.from && movement.date <= period.until);
  const totals = cashTotals(monthlyCash);
  const cashPath = `/caixa?de=${period.from}&ate=${period.until}`;
  const agendaPath = `/agenda?date=${date}`;
  const newAppointmentPath = `/agenda/nova?date=${date}`;
  const metrics = [
    { label: 'Consultas do dia', value: dayAppointments.length, hint: dateLabel(date), to: agendaPath },
    { label: 'Pacientes cadastrados', value: data.patients.length, hint: 'Ver cadastros', to: '/pacientes' },
    { label: 'Orçamentos cadastrados', value: data.budgets.length, hint: 'Ver orçamentos', to: '/orcamentos' },
    { label: 'Materiais abaixo do mínimo', value: lowProducts.length, hint: 'Conferir estoque', to: '/estoque?abaixo=1' },
  ];
  return <>
    <PageHeader title="Painel" description="A rotina da clínica em uma visão geral." action={<><ActionLink to={newAppointmentPath}>Agendar consulta</ActionLink><ActionLink variant="secondary" to="/orcamentos/novo">Novo orçamento</ActionLink></>} />
    <div className={styles.dateToolbar}><Field id="dashboard_date" label="Dia de referência"><input type="date" value={date} onChange={event => { if (isDate(event.target.value)) setParams({ date: event.target.value }); }} /></Field><Button variant="secondary" onClick={() => setParams({ date: today() })}>Hoje</Button><p>Atendimentos do dia e movimentações do mês de referência.</p></div>
    {resource.busy ? <LoadingState /> : resource.error ? <div className={styles.readError}><Feedback tone="error" title="Não foi possível carregar o painel">{resource.error}</Feedback><Button variant="secondary" onClick={resource.retry}>Tentar novamente</Button></div> : <>
      <dl className={styles.metrics} aria-label="Resumo da clínica">{metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd><span>{metric.value}</span><Link to={metric.to}>{metric.hint}<span aria-hidden="true"> →</span></Link></dd></div>)}</dl>
      <div className={styles.contentGrid}><div className={styles.column}>
        <section className={styles.panel} aria-labelledby="dashboard_appointments"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Atendimentos</p><h2 id="dashboard_appointments">Consultas de {dateLabel(date)}</h2></div><ActionLink variant="quiet" to={agendaPath}>Ver agenda</ActionLink></div>
          {dayAppointments.length ? <><ul className={styles.appointments} aria-label="Consultas do dia">{dayAppointments.slice(0, 6).map(appointment => <li key={appointment.id}><time dateTime={`${appointment.date}T${appointment.time}`}>{appointment.time}<span>{appointment.duration} min</span></time><div><Link to={`/agenda/${appointment.id}?date=${date}`}>{data.patients.find(patient => patient.id === appointment.patientId)?.name ?? 'Paciente não disponível'}</Link><p>{appointment.procedure}</p><p>{data.doctors.find(doctor => doctor.id === appointment.doctorId)?.name ?? 'Doutor não disponível'}</p></div><StatusLabel tone={appointment.status === 'Concluída' ? 'success' : appointment.status === 'Faltou' ? 'warning' : 'neutral'}>{appointment.status || 'Situação não definida'}</StatusLabel></li>)}</ul><p className={styles.countHint}>{dayAppointments.length > 6 ? `Mostrando 6 de ${dayAppointments.length} consultas. Abra a agenda para ver todas.` : 'A lista inclui consultas canceladas e faltas, com a situação de cada atendimento.'}</p></> : <div className={styles.empty}><h3>Nenhuma consulta para este dia</h3><p>Escolha outra data ou cadastre um atendimento.</p><ActionLink variant="secondary" to={newAppointmentPath}>Agendar consulta</ActionLink></div>}
          {hasWeekAppointments && <WeekAppointmentsChart dates={weekDates} counts={weekCounts} />}
        </section>
        <section className={styles.panel} aria-labelledby="dashboard_cash"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Movimentações registradas</p><h2 id="dashboard_cash">Caixa de {period.label}</h2></div><ActionLink variant="quiet" to={cashPath}>Ver caixa do mês</ActionLink></div>
          <dl className={styles.cashTotals} aria-label={`Totais do caixa de ${period.label}`}><div><dt>Entradas</dt><dd>{money(totals.entries)}</dd></div><div><dt>Saídas</dt><dd>{money(totals.exits)}</dd></div><div><dt>Saldo das movimentações</dt><dd>{money(totals.entries - totals.exits)}</dd></div></dl>
          <p className={styles.countHint}>Saldo das movimentações registradas no mês: entradas menos saídas.</p>
          <MonthComparison movements={data.cashMovements} date={date} />
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
