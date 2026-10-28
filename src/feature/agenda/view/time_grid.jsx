import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, StatusIconOf } from '../../../component/ui/index.js';
import { appointmentStatus } from '../../../component/appointment_status.js';
import { clock } from '../../../component/format.js';
import { canScheduleAt, layoutLanes, slotFromOffset } from '../model/agenda_model.js';
import styles from './time_grid.module.css';

const ghostMinutes = 30;

// Grade da agenda: eixo vertical com as horas, colunas com os dias (ou dentistas, na visão do dia)
// e cartões com altura proporcional à duração do procedimento. Clicar num espaço vazio agenda ali.
export function TimeGrid({ columns, from, to, hourHeight = 80, now, onSelect, onCreate, selectedId, showDentist = true, label }) {
    const body = useRef(null);
    const [ghost, setGhost] = useState(null);
    const hours = [];
    for (let minute = from; minute < to; minute += 60)
        hours.push(minute);
    const height = (to - from) / 60 * hourHeight;
    const hasToday = now && columns.some(column => column.isToday);
    const nowTop = hasToday && now.minutes >= from && now.minutes <= to ? (now.minutes - from) / 60 * hourHeight : null;
    const firstStart = Math.min(...columns.flatMap(column => column.items.map(item => item.start)), Infinity);
    const scrollTarget = nowTop !== null ? nowTop - hourHeight : Number.isFinite(firstStart) ? (firstStart - from) / 60 * hourHeight - hourHeight / 2 : hourHeight;
    const scrollKey = columns.map(column => column.key).join('|');
    useEffect(() => {
        if (body.current)
            body.current.scrollTop = Math.max(0, scrollTarget);
        // Rola somente quando o período muda, não a cada atualização dos dados.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollKey]);

    // Espaço vazio: o alvo do evento é a própria coluna (os cartões são botões por cima dela).
    function slotAt(event, column) {
        if (!onCreate || event.target !== event.currentTarget)
            return null;
        const minutes = slotFromOffset(event.nativeEvent.offsetY, hourHeight, from);
        return minutes < to && canScheduleAt(column, minutes, now?.minutes ?? 0) ? minutes : null;
    }
    function hover(event, column) {
        const minutes = slotAt(event, column);
        setGhost(minutes === null ? null : { key: column.key, minutes });
    }
    function create(event, column) {
        const minutes = slotAt(event, column);
        if (minutes !== null)
            onCreate({ date: column.date, minutes, dentistId: column.dentistId ?? null });
    }

    return <div className={styles.grid} style={{ '--columns': columns.length, '--hour': `${hourHeight}px` }} role="region" aria-label={label}>
        <div className={styles.head}>
            <span className={styles.corner}/>
            {columns.map(column => <div key={column.key} className={`${styles.colHead} ${column.isToday ? styles.today : ''} ${column.past ? styles.past : ''}`}>
                {column.avatar && <Avatar name={column.avatar} size="sm"/>}
                <span><b>{column.title}</b><small>{column.subtitle}</small></span>
            </div>)}
        </div>
        {onCreate && <p className="sr-only">Para agendar, use o botão Agendar consulta. Com o mouse, clique num horário livre da grade.</p>}
        <div className={styles.body} ref={body}>
            <div className={styles.canvas} style={{ height }}>
                <div className={styles.hours} aria-hidden="true">{hours.map(minute => <span key={minute} style={{ top: (minute - from) / 60 * hourHeight }}>{clock(minute)}</span>)}</div>
                {columns.map(column => <div key={column.key} data-date={column.date}
                    className={`${styles.column} ${column.isToday ? styles.todayColumn : ''} ${column.empty ? styles.closed : ''} ${ghost?.key === column.key ? styles.creating : ''}`}
                    onMouseMove={event => hover(event, column)} onMouseLeave={() => setGhost(null)} onClick={event => create(event, column)}>
                    {column.empty && <span className={styles.closedText}>Sem consultas</span>}
                    {ghost?.key === column.key && <span className={styles.ghost} aria-hidden="true"
                        style={{ top: (ghost.minutes - from) / 60 * hourHeight + 1.5, height: ghostMinutes / 60 * hourHeight - 3 }}>
                        <Plus/>{clock(ghost.minutes)} · Agendar
                    </span>}
                    {layoutLanes(column.items.filter(item => item.end > from && item.start < to)).map(item => <AppointmentBlock key={item.id} item={item} from={from} hourHeight={hourHeight} selected={item.id === selectedId} past={column.past} showDentist={showDentist} onSelect={onSelect}/>)}
                    {nowTop !== null && column.isToday && <span className={styles.nowToday} style={{ top: nowTop }} aria-hidden="true"/>}
                </div>)}
                {nowTop !== null && <>
                    <span className={styles.nowLine} style={{ top: nowTop }} aria-hidden="true" data-now-line="true"/>
                    <span className={styles.nowTime} style={{ top: nowTop }}>{clock(now.minutes)}</span>
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
    return <button type="button" className={`${styles.block} ${height < 34 ? styles.oneLine : ''} ${past ? styles.pastBlock : ''} ${selected ? styles.selected : ''}`}
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
