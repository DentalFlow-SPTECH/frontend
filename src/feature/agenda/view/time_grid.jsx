import { useEffect, useRef } from 'react';
import { Avatar, StatusIconOf } from '../../../component/ui/index.js';
import { appointmentStatus } from '../../../component/appointment_status.js';
import { clock } from '../../../component/format.js';
import { layoutLanes } from '../model/agenda_model.js';
import styles from './time_grid.module.css';

// Grade da agenda: eixo vertical com as horas, colunas com os dias (ou dentistas, na visão do dia)
// e cartões com altura proporcional à duração do procedimento.
export function TimeGrid({ columns, from, to, hourHeight = 80, now, onSelect, selectedId, showDentist = true, label }) {
    const body = useRef(null);
    const hours = [];
    for (let minute = from; minute < to; minute += 60)
        hours.push(minute);
    const height = (to - from) / 60 * hourHeight;
    const nowColumn = now ? columns.findIndex(column => column.isToday) : -1;
    const nowTop = now && nowColumn >= 0 && now.minutes >= from && now.minutes <= to ? (now.minutes - from) / 60 * hourHeight : null;
    const firstStart = Math.min(...columns.flatMap(column => column.items.map(item => item.start)), Infinity);
    const scrollTarget = nowTop !== null ? nowTop - hourHeight : Number.isFinite(firstStart) ? (firstStart - from) / 60 * hourHeight - hourHeight / 2 : hourHeight;
    const scrollKey = columns.map(column => column.key).join('|');
    useEffect(() => {
        if (body.current)
            body.current.scrollTop = Math.max(0, scrollTarget);
        // Rola somente quando o período muda, não a cada atualização dos dados.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollKey]);
    return <div className={styles.grid} style={{ '--columns': columns.length, '--hour': `${hourHeight}px` }} role="region" aria-label={label}>
        <div className={styles.head}>
            <span className={styles.corner}/>
            {columns.map(column => <div key={column.key} className={`${styles.colHead} ${column.isToday ? styles.today : ''} ${column.past ? styles.past : ''}`}>
                {column.avatar && <Avatar name={column.avatar} size="sm"/>}
                <span><b>{column.title}</b><small>{column.subtitle}</small></span>
            </div>)}
        </div>
        <div className={styles.body} ref={body}>
            <div className={styles.canvas} style={{ height }}>
                <div className={styles.hours} aria-hidden="true">{hours.map(minute => <span key={minute} style={{ top: (minute - from) / 60 * hourHeight }}>{clock(minute)}</span>)}</div>
                {columns.map(column => <div key={column.key} className={`${styles.column} ${column.isToday ? styles.todayColumn : ''} ${column.empty ? styles.closed : ''}`}>
                    {column.empty && <span className={styles.closedText}>Sem consultas</span>}
                    {layoutLanes(column.items.filter(item => item.end > from && item.start < to)).map(item => <AppointmentBlock key={item.id} item={item} from={from} hourHeight={hourHeight} selected={item.id === selectedId} past={column.past} showDentist={showDentist} onSelect={onSelect}/>)}
                </div>)}
                {nowTop !== null && <>
                    <span className={styles.nowTime} style={{ top: nowTop }}>{clock(now.minutes)}</span>
                    <span className={styles.nowLine} style={{ top: nowTop, left: `calc(var(--axis) + (100% - var(--axis)) / ${columns.length} * ${nowColumn})`, width: `calc((100% - var(--axis)) / ${columns.length})` }}/>
                </>}
            </div>
        </div>
    </div>;
}

function AppointmentBlock({ item, from, hourHeight, selected, past, showDentist, onSelect }) {
    const meta = appointmentStatus[item.status] ?? appointmentStatus.AGENDADO;
    const Icon = StatusIconOf(item.status);
    const top = (item.start - from) / 60 * hourHeight + 1.5;
    const height = Math.max(item.duration / 60 * hourHeight - 3, 26);
    const narrow = item.lanes >= 3;
    const tall = height >= 64;
    const name = narrow ? item.patientName.split(' ')[0] : item.patientName;
    return <button type="button" className={`${styles.block} ${height < 34 ? styles.oneLine : ''} ${past ? styles.pastBlock : ''} ${item.status === 'CANCELADO' ? styles.cancelled : ''} ${selected ? styles.selected : ''}`}
        data-status={meta.key}
        style={{ top, height, left: `calc(${item.lane / item.lanes * 100}% + 3px)`, width: `calc(${100 / item.lanes}% - 6px)` }}
        onClick={() => onSelect(item)}
        aria-label={`${item.time} às ${item.endTime}, ${item.patientName}, ${item.procedureName}, ${item.dentistName}, ${meta.label}`}>
        <span className={styles.time}>{item.time}{!narrow && item.lanes < 2 && `–${item.endTime}`}{!narrow && <Icon aria-hidden="true"/>}</span>
        <span className={styles.name}>{name}</span>
        {tall && !narrow && <span className={styles.detail}>{item.procedureName}</span>}
        {tall && showDentist && !narrow && height >= 84 && <span className={styles.who}><Avatar name={item.dentistName} size="xs"/>{item.dentistShort}</span>}
    </button>;
}
