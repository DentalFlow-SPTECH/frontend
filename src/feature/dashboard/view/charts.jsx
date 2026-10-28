import { brl, dayOfMonth } from '../../../component/format.js';
import styles from './dashboard.module.css';

// Colunas = entradas do dia; linha = saídas. A tabela oculta repete os números para leitura assistiva.
export function DailyChart({ points }) {
    const width = 900;
    const height = 240;
    const pad = { top: 14, right: 10, bottom: 28, left: 54 };
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;
    const top = Math.max(1, ...points.flatMap(point => [Number(point.generalGross), Number(point.totalOutflows)]));
    const step = 10 ** Math.floor(Math.log10(top));
    const max = Math.ceil(top / step) * step;
    const y = value => pad.top + innerHeight - (Number(value) / max) * innerHeight;
    const slot = innerWidth / Math.max(points.length, 1);
    const bar = Math.min(18, slot * .56);
    const line = points.map((point, index) => `${pad.left + slot * index + slot / 2},${y(point.totalOutflows)}`).join(' ');
    const ticks = [0, max / 3, (max / 3) * 2, max];
    const short = value => (value >= 1000 ? `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(Math.round(value)));
    return <figure className={styles.chart}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Entradas e saídas por dia do mês">
            {ticks.map(tick => <g key={tick}>
                <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className={styles.gridLine}/>
                <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" className={styles.axis}>{short(tick)}</text>
            </g>)}
            {points.map((point, index) => {
                const x = pad.left + slot * index + (slot - bar) / 2;
                return <g key={point.date}>
                    <rect x={x} y={y(point.generalGross)} width={bar} height={Math.max(0, pad.top + innerHeight - y(point.generalGross))} rx="4" className={styles.chartBar}/>
                    {(index % Math.ceil(points.length / 8) === 0 || index === points.length - 1) && <text x={x + bar / 2} y={height - 8} textAnchor="middle" className={styles.axis}>{dayOfMonth(point.date)}</text>}
                </g>;
            })}
            {points.length > 1 && <polyline points={line} className={styles.line}/>}
            {points.length === 1 && <circle cx={pad.left + slot / 2} cy={y(points[0].totalOutflows)} r="4" className={styles.dot}/>}
        </svg>
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
