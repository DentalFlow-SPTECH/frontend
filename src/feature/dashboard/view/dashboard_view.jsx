import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, ClipboardList, Users, Wallet } from 'lucide-react';
import { Alert, Avatar, ButtonLink, Card, Chips, ErrorState, IconButton, PageHeader, Skeleton, Stat } from '../../../component/ui/index.js';
import { brl, percent } from '../../../component/format.js';
import { alertTone } from '../model/dashboard_model.js';
import { useDashboardViewModel } from '../view_model/use_dashboard_view_model.js';
import { DailyChart, Donut } from './charts.jsx';
import styles from './dashboard.module.css';

export function DashboardPage() {
    const vm = useDashboardViewModel();
    const header = <PageHeader title={vm.title} subtitle={vm.subtitle} actions={<div className={styles.month}>
        <IconButton label="Mês anterior" icon={ChevronLeft} variant="secondary" onClick={vm.previous}/>
        <span className={styles.monthLabel} aria-live="polite">{vm.periodLabel}</span>
        <IconButton label="Próximo mês" icon={ChevronRight} variant="secondary" onClick={vm.next} disabled={!vm.canGoNext}/>
    </div>}/>;
    if (vm.error && !vm.dashboard)
        return <>{header}<ErrorState error={vm.error} onRetry={vm.reload}/></>;
    if (vm.loading || !vm.dashboard)
        return <>{header}<Skeleton rows={3} height={150}/></>;
    const { summary, kpis, appointmentFunnel: funnel, dailyEvolution } = vm.dashboard;
    return <>
        {header}
        <div className={styles.filters}><Chips label="Filtrar por dentista" options={vm.dentistOptions} value={vm.dentistId} onChange={vm.setDentist}/></div>
        <div className={styles.stack} aria-busy={vm.refreshing}>
            {!vm.hasData && <Alert tone="info" title="Ainda não há mapas do dia neste mês" action={<ButtonLink to="/mapa" size="sm" variant="secondary" icon={ClipboardList}>Abrir mapa do dia</ButtonLink>}>
                Os valores financeiros aparecem quando os mapas do dia são lançados. As consultas abaixo já vêm da agenda.
            </Alert>}
            {vm.alerts.map(alert => <Alert key={alert.code} tone={alertTone(alert.severity)} title={alert.title}>{alert.message}</Alert>)}
            <div className={styles.kpis}>
                <Stat icon={ArrowDownLeft} tone="success" label="Entradas" value={brl(summary.generalGross)} hint={`Ticket médio de ${brl(kpis.averageTicket)}`}/>
                <Stat icon={ArrowUpRight} tone="danger" label="Saídas" value={brl(summary.totalOutflows)} hint={`${percent(kpis.outflowRate)} das entradas`}/>
                <Stat icon={Wallet} highlight label="Saldo do mês" value={brl(summary.finalBalance)} hint={vm.hasData ? `Sobrou ${percent(kpis.netMargin)} do que entrou` : 'Sem lançamentos'}/>
                <Stat icon={Users} tone="info" label="Pacientes atendidos" value={summary.patientCount} hint={`Em ${kpis.operatingDays} ${kpis.operatingDays === 1 ? 'dia' : 'dias'} de atendimento`}/>
            </div>
            <div className={styles.grid}>
                <Card title="Entradas e saídas por dia" action={<span className={styles.legend}><span><i className={styles.legendBar}/>Entradas</span><span><i className={styles.legendLine}/>Saídas</span></span>}>
                    {dailyEvolution.length ? <DailyChart points={dailyEvolution}/> : <p className={styles.muted}>Sem lançamentos neste período.</p>}
                </Card>
                <Card title="Consultas do mês">
                    <div className={styles.funnel}>
                        <Donut parts={vm.funnel} total={funnel.total}/>
                        <ul className={styles.funnelList}>
                            {vm.funnel.map(part => <li key={part.key}><i className={styles[`seg_${part.key}`]}/>{part.label}<b>{part.value}</b></li>)}
                        </ul>
                    </div>
                    <p className={styles.rates}>Concluídas {percent(funnel.completionRate)} · Faltas {percent(funnel.noShowRate)} · Cancelamentos {percent(funnel.cancellationRate)}</p>
                </Card>
            </div>
            <div className={styles.grid}>
                {vm.breakdown.length > 0 && <Card title="Por dentista" action={<span className={styles.muted}>Entradas no mês</span>}>
                    <ul className={styles.breakdown}>
                        {vm.breakdown.map(item => {
                            const max = Math.max(...vm.breakdown.map(entry => Number(entry.generalGross)), 1);
                            return <li key={item.dentistId}>
                                <Avatar name={item.dentistName}/>
                                <span className={styles.breakdownName}><b>{item.dentistName}</b><span className={styles.bar}><i style={{ width: `${(Number(item.generalGross) / max) * 100}%` }}/></span></span>
                                <span className={styles.breakdownValue}><b>{brl(item.generalGross)}</b><small>saldo {brl(item.finalBalance)}</small></span>
                            </li>;
                        })}
                    </ul>
                </Card>}
                <Card title="Produção do mês">
                    <ul className={styles.production}>{vm.production.map(item => <li key={item.label}><b>{item.value}</b>{item.label}</li>)}</ul>
                </Card>
            </div>
        </div>
    </>;
}
