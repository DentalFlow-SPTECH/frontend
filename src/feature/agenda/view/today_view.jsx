import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Clock, Plus } from 'lucide-react';
import { Avatar, ButtonLink, Chips, EmptyState, ErrorState, PageHeader, Panel, Skeleton, StatusPill } from '../../../component/ui/index.js';
import { dayOfMonth, weekdayShort } from '../../../component/format.js';
import { useTodayViewModel } from '../view_model/use_today_view_model.js';
import { AppointmentDetail } from './appointment_detail.jsx';
import { NextBanner } from './agenda_view.jsx';
import styles from './agenda.module.css';

export function TodayPage() {
    const vm = useTodayViewModel();
    const empty = !vm.loading && !vm.groups.length;
    let nowShown = false;
    return <>
        <PageHeader title={vm.title} subtitle={vm.subtitle} actions={<ButtonLink to={vm.newLink} icon={Plus} className={styles.newDesktop}>Agendar consulta</ButtonLink>}/>
        <nav className={styles.days} aria-label="Dias da semana">
            {vm.week.map(day => <Link key={day} to={day === vm.today ? '/hoje' : `/agenda?ver=dia&data=${day}`} className={styles.day} aria-current={day === vm.today ? 'date' : undefined}>
                <small>{weekdayShort(day)}</small><b>{dayOfMonth(day)}</b>
            </Link>)}
        </nav>
        <div className={styles.filters}><Chips label="Filtrar por dentista" options={vm.dentistOptions} value={vm.dentistId} onChange={vm.setDentist}/></div>
        {vm.next && !vm.wide && <NextBanner item={vm.next} label={vm.nextLabel} busy={vm.actions.busy} onStart={() => vm.actions.change(vm.next, 'EM_ATENDIMENTO')} onOpen={() => vm.select(vm.next)}/>}
        {vm.pending > 0 && <p className={styles.nudge}><Clock aria-hidden="true"/>{vm.pending === 1 ? '1 paciente ainda não confirmou' : `${vm.pending} pacientes ainda não confirmaram`}</p>}
        <div className={styles.todayLayout}>
            <div>
                {vm.error && !vm.groups.length ? <ErrorState error={vm.error} onRetry={vm.reload}/>
                    : vm.loading ? <Skeleton rows={6}/>
                    : empty ? <EmptyState icon={CalendarCheck} title="Nenhuma consulta hoje" action={<ButtonLink to={vm.newLink} icon={Plus}>Agendar consulta</ButtonLink>}>Quando houver consultas para hoje, elas aparecem aqui em ordem de horário.</EmptyState>
                    : <div className={styles.list}>
                        {vm.groups.map(group => <Fragment key={group.title}>
                            <h2 className={styles.group}>{group.title} · {group.items.length}</h2>
                            <ul className={styles.rows}>
                                {group.items.map(item => {
                                    const showNow = !nowShown && item.start > vm.nowMinutes;
                                    if (showNow)
                                        nowShown = true;
                                    return <Fragment key={item.id}>
                                        {showNow && <li className={styles.nowMark} aria-hidden="true"><i/>Agora</li>}
                                        <li>
                                            <button type="button" className={`${styles.row} ${item.status === 'CONCLUIDO' ? styles.rowPast : ''} ${item.status === 'CANCELADO' ? styles.rowCancel : ''}`}
                                                aria-pressed={vm.wide && vm.selected?.id === item.id} onClick={() => vm.select(item)}>
                                                <span className={styles.rowTime}><b>{item.time}</b><small>{item.duration} min</small></span>
                                                <Avatar name={item.patientName}/>
                                                <span className={styles.rowWho}><b>{item.patientName}</b><small>{item.procedureName} · {item.dentistShort}</small></span>
                                                <StatusPill status={item.status} compact={!vm.wide}/>
                                            </button>
                                        </li>
                                    </Fragment>;
                                })}
                            </ul>
                        </Fragment>)}
                    </div>}
            </div>
            <aside className={styles.side} aria-label="Consulta selecionada">
                {vm.selected ? <AppointmentDetail item={vm.selected} today={vm.today} actions={vm.actions}/> : <p className={styles.sideEmpty}>Escolha uma consulta para ver os detalhes.</p>}
            </aside>
        </div>
        <ButtonLink to={vm.newLink} icon={Plus} className={styles.fab}>Agendar</ButtonLink>
        {!vm.wide && <Panel open={vm.sheetOpen && Boolean(vm.selected)} onOpenChange={open => { if (!open) vm.closeSheet(); }} title="Consulta">
            {vm.selected && <AppointmentDetail item={vm.selected} today={vm.today} actions={vm.actions}/>}
        </Panel>}
    </>;
}
