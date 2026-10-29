import { useState } from 'react';
import { brl, dateLong, dayOfMonth, moneyShort, weekdayShort } from '../../../component/format.js';
import { useMediaQuery } from '../../../component/use_media_query.js';
import { niceScale } from '../model/dashboard_model.js';
import styles from './dashboard.module.css';

// Duas barras por dia com mapa lançado: verde = entrou, coral = saiu. Cada dia tem o seu rótulo, e passar o
// mouse, tocar ou focar (Tab) um dia mostra entradas, saídas e saldo. No celular o gráfico rola dentro do card.
// A tabela oculta repete os números para leitura assistiva.
export function DailyChart({ points }) {
    const phone = useMediaQuery('(max-width: 599px)');
    const [active, setActive] = useState(null);
    const pad = { top: 12, right: 8, bottom: 46, left: 70 };
    const height = 270;
    const width = Math.max(phone ? 340 : 900, pad.left + pad.right + points.length * (phone ? 36 : 40));
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;
    const scale = niceScale(Math.max(...points.flatMap(point => [Number(point.generalGross), Number(point.totalOutflows)])));
    const y = value => pad.top + innerHeight - (Math.max(0, Number(value)) / scale.max) * innerHeight;
    const slot = innerWidth / Math.max(points.length, 1);
    const bar = Math.min(16, (slot * .62) / 2);
    const center = index => pad.left + slot * index + slot / 2;
    const base = pad.top + innerHeight;
    const point = active !== null ? points[active] : null;
    const edge = active === null ? 0 : center(active) / width;
    return <figure className={styles.chart}>
        <div className={styles.chartScroll}>
            <div className={styles.plot} style={phone ? { width } : undefined}>
                <svg viewBox={`0 0 ${width} ${height}`} style={phone ? { width, maxWidth: 'none' } : undefined} role="group" aria-label="Entradas e saídas por dia do mês">
                    {scale.ticks.map(tick => <g key={tick} aria-hidden="true">
                        <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className={tick ? styles.gridLine : styles.baseLine}/>
                        <text x={pad.left - 10} y={y(tick) + 4} textAnchor="end" className={styles.axis}>{moneyShort(tick)}</text>
                    </g>)}
                    {points.map((item, index) => {
                        const label = `${dateLong(item.date)}: entradas ${brl(item.generalGross)}, saídas ${brl(item.totalOutflows)}, saldo ${brl(item.finalBalance)}`;
                        return <g key={item.date} tabIndex={0} role="img" aria-label={label} className={styles.day} data-active={active === index || undefined}
                            onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onClick={() => setActive(index)}
                            onFocus={() => setActive(index)} onBlur={() => setActive(null)}>
                            <rect x={pad.left + slot * index} y={pad.top} width={slot} height={innerHeight + pad.bottom} className={styles.hit}/>
                            <rect x={center(index) - bar - 1.5} y={y(item.generalGross)} width={bar} height={base - y(item.generalGross)} rx="3" className={styles.barIn}/>
                            <rect x={center(index) + 1.5} y={y(item.totalOutflows)} width={bar} height={base - y(item.totalOutflows)} rx="3" className={styles.barOut}/>
                            <text x={center(index)} y={height - 26} textAnchor="middle" className={styles.dayNumber}>{dayOfMonth(item.date)}</text>
                            <text x={center(index)} y={height - 10} textAnchor="middle" className={styles.axis}>{weekdayShort(item.date)}</text>
                        </g>;
                    })}
                </svg>
                {point && <div className={styles.tip} aria-hidden="true" data-edge={edge < .18 ? 'start' : edge > .82 ? 'end' : undefined} style={{ left: `${edge * 100}%` }}>
                    <b>{dateLong(point.date)}</b>
                    <span><i className={styles.keyIn}/>Entradas<strong>{brl(point.generalGross)}</strong></span>
                    <span><i className={styles.keyOut}/>Saídas<strong>{brl(point.totalOutflows)}</strong></span>
                    <span className={styles.tipBalance}>Saldo do dia<strong>{brl(point.finalBalance)}</strong></span>
                </div>}
            </div>
        </div>
        <figcaption className={styles.caption}>Cada par de barras é um dia com mapa lançado. Passe o mouse ou toque num dia para ver os valores.</figcaption>
        <table className="sr-only">
            <caption>Entradas e saídas por dia</caption>
            <thead><tr><th>Dia</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
            <tbody>{points.map(point => <tr key={point.date}><td>{dayOfMonth(point.date)}</td><td>{brl(point.generalGross)}</td><td>{brl(point.totalOutflows)}</td><td>{brl(point.finalBalance)}</td></tr>)}</tbody>
        </table>
    </figure>;
}

export function Donut({ parts, total }) {
    const size = 170;
    const stroke = 24;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const sum = parts.reduce((acc, part) => acc + part.value, 0) || 1;
    let offset = 0;
    return <div className={styles.donut}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke}/>
            {parts.filter(part => part.value > 0).map(part => {
                const length = Math.max(0, (part.value / sum) * circumference - 3);
                const element = <circle key={part.key} cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className={styles[`seg_${part.key}`]}
                    strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`}/>;
                offset += (part.value / sum) * circumference;
                return element;
            })}
        </svg>
        <span className={styles.donutCenter}><b>{total}</b><small>consultas</small></span>
    </div>;
}
