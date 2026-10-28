import { CalendarPlus, ChevronLeft, ChevronRight, MessageCircle, Plus, Stethoscope } from 'lucide-react';
import { Button, ButtonLink, Chips, ErrorState, ExternalButton, IconButton, PageHeader, Panel, Segmented, Skeleton } from '../../../component/ui/index.js';
import { whatsappLink } from '../../../component/format.js';
import { reminderText } from '../model/agenda_model.js';
import { useAgendaViewModel } from '../view_model/use_agenda_view_model.js';
import { AppointmentDetail } from './appointment_detail.jsx';
import { TimeGrid } from './time_grid.jsx';
import styles from './agenda.module.css';

export function AgendaPage() {
    const vm = useAgendaViewModel();
    return <>
        <PageHeader title="Agenda" subtitle={`${vm.title}${vm.view === 'mes' ? '' : ` · ${vm.total} ${vm.total === 1 ? 'consulta' : 'consultas'}`}`}
            actions={<>
                <div className={styles.nav}>
                    <IconButton label="Período anterior" icon={ChevronLeft} variant="secondary" onClick={() => vm.shift(-1)}/>
                    <Button variant="secondary" onClick={vm.goToday}>Hoje</Button>
                    <IconButton label="Próximo período" icon={ChevronRight} variant="secondary" onClick={() => vm.shift(1)}/>
                </div>
                <Segmented label="Visão da agenda" options={vm.viewOptions} value={vm.view} onChange={vm.setView}/>
                <ButtonLink to={vm.newLink} icon={Plus} className={styles.newDesktop}>Agendar consulta</ButtonLink>
            </>}/>
        <div className={styles.filters}>
            <Chips label="Filtrar por dentista" options={vm.dentistOptions} value={vm.dentistId} onChange={vm.setDentist}/>
            <Legend/>
        </div>
        {vm.next && <NextBanner compact={!vm.wide} item={vm.next} label={vm.nextLabel} busy={vm.actions.busy} onStart={() => vm.actions.change(vm.next, 'EM_ATENDIMENTO')} onOpen={() => vm.select(vm.next)}/>}
        {vm.error && !vm.columns.some(column => column.items.length) ? <ErrorState error={vm.error} onRetry={vm.reload}/>
            : vm.firstLoad ? <Skeleton rows={1} height={480}/>
            : vm.view === 'mes' ? <MonthView vm={vm}/>
            : <TimeGrid label={`Agenda: ${vm.title}`} columns={vm.columns} from={vm.hours.from} to={vm.hours.to} hourHeight={vm.wide ? 80 : 68} now={vm.now}
                onSelect={vm.select} onCreate={vm.createAt} selectedId={vm.selected?.id} showDentist={!vm.dentistId && !vm.byDentist}/>}
        <ButtonLink to={vm.newLink} icon={Plus} className={styles.fab}>Agendar</ButtonLink>
        <Panel open={Boolean(vm.selected)} onOpenChange={open => { if (!open) vm.select(null); }} title="Consulta">
            {vm.selected && <AppointmentDetail item={vm.selected} today={vm.today} actions={vm.actions}/>}
        </Panel>
    </>;
}

function Legend() {
    return <ul className={styles.legend} aria-label="Legenda das situações">
        {[['agendado', 'Agendado'], ['confirmado', 'Confirmado'], ['atendimento', 'Em atendimento'], ['concluido', 'Concluído'], ['cancelado', 'Cancelado'], ['faltou', 'Faltou']]
            .map(([key, label]) => <li key={key}><i data-status={key}/>{label}</li>)}
    </ul>;
}

// Cartão "Próximo" (inspirado no Uber): quem é o próximo paciente e o atalho para começar.
export function NextBanner({ item, label, busy, onStart, onOpen, compact = false }) {
    const whatsapp = whatsappLink(item.patient?.phone, reminderText(item));
    return <section className={`${styles.next} ${compact ? styles.nextCompact : ''}`} aria-label="Próximo paciente">
        <span className={styles.nextLabel}><i/>Próximo · {label}</span>
        <button type="button" className={styles.nextMain} onClick={onOpen}>
            <span className={styles.nextClock}>{item.time}</span>
            <span><b>{item.patientName}</b><small>{item.procedureName} · {item.dentistShort} · {item.duration} min</small></span>
        </button>
        {!compact && <div className={styles.nextActions}>
            {item.status === 'CONFIRMADO' && <Button className={styles.nextPrimary} icon={Stethoscope} busy={busy === 'EM_ATENDIMENTO'} onClick={onStart}>Iniciar atendimento</Button>}
            {whatsapp && <ExternalButton href={whatsapp} className={styles.nextSecondary} icon={MessageCircle}>WhatsApp</ExternalButton>}
        </div>}
    </section>;
}

function MonthView({ vm }) {
    const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return <div className={styles.month} aria-busy={vm.monthLoading}>
        <div className={styles.monthHead}>{weekdays.map(day => <span key={day}>{day}</span>)}</div>
        <div className={styles.monthGrid}>
            {vm.monthCells.map(cell => <button key={cell.date} type="button" className={`${styles.monthCell} ${cell.currentMonth ? '' : styles.otherMonth} ${cell.isToday ? styles.monthToday : ''}`}
                onClick={() => vm.openDay(cell.date)} aria-label={`${cell.date.slice(8)}: ${cell.count ?? 'carregando'} consultas`}>
                <b>{Number(cell.date.slice(8))}</b>
                {cell.count > 0 && <span className={styles.monthCount}><CalendarPlus aria-hidden="true"/>{cell.count}<small> {cell.count === 1 ? 'consulta' : 'consultas'}</small></span>}
            </button>)}
        </div>
    </div>;
}
