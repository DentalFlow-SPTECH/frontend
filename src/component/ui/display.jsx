import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCheck, CircleAlert, Clock, Info, LoaderCircle, OctagonAlert, RotateCw, Stethoscope, TriangleAlert, UserX, X } from 'lucide-react';
import { appointmentStatus } from '../appointment_status.js';
import { initials } from '../format.js';
import styles from './display.module.css';

const tones = [['#FCE3D6', '#8E3A19'], ['#DDF0E6', '#1D6B45'], ['#E3E8FB', '#3446A3'], ['#F7E3EF', '#8E2F6B'], ['#FFEFC4', '#6E4B00'], ['#DDEDF6', '#245D7E']];
function toneOf(name) {
    let hash = 0;
    for (const char of String(name ?? ''))
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return tones[hash % tones.length];
}

export function Avatar({ name, size = 'md', className = '' }) {
    const [background, color] = toneOf(name);
    return <span className={`${styles.avatar} ${styles[`avatar_${size}`]} ${className}`} style={{ background, color }} aria-hidden="true">{initials(name)}</span>;
}

const statusIcons = { AGENDADO: Clock, CONFIRMADO: Check, EM_ATENDIMENTO: Stethoscope, CONCLUIDO: CheckCheck, CANCELADO: X, FALTOU: UserX };
export const StatusIconOf = status => statusIcons[status] ?? Clock;

export function StatusPill({ status, compact = false }) {
    const meta = appointmentStatus[status] ?? { label: status, key: 'faltou' };
    const Icon = StatusIconOf(status);
    if (compact)
        return <span className={styles.statusDot} data-status={meta.key} title={meta.label}><Icon aria-hidden="true"/><span className="sr-only">{meta.label}</span></span>;
    return <span className={styles.status} data-status={meta.key}><Icon aria-hidden="true"/>{meta.label}</span>;
}

export function Badge({ tone = 'neutral', children, icon: Icon }) {
    return <span className={`${styles.badge} ${styles[`badge_${tone}`]}`}>{Icon && <Icon aria-hidden="true"/>}{children}</span>;
}

const alertIcons = { info: Info, success: CheckCheck, warning: TriangleAlert, danger: OctagonAlert };
export function Alert({ tone = 'info', title, children, action }) {
    const Icon = alertIcons[tone];
    return <div className={`${styles.alert} ${styles[`alert_${tone}`]}`} role={tone === 'danger' ? 'alert' : 'status'}>
        <span className={styles.alertIcon}><Icon aria-hidden="true"/></span>
        <div className={styles.alertBody}>{title && <strong>{title}</strong>}{children && <div>{children}</div>}</div>
        {action && <div className={styles.alertAction}>{action}</div>}
    </div>;
}

export function EmptyState({ icon: Icon = Info, title, children, action }) {
    return <div className={styles.empty}>
        <span className={styles.emptyIcon}><Icon aria-hidden="true"/></span>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
        {action}
    </div>;
}

export function ErrorState({ error, onRetry }) {
    return <div className={styles.empty} role="alert">
        <span className={`${styles.emptyIcon} ${styles.emptyDanger}`}><CircleAlert aria-hidden="true"/></span>
        <h2>Não foi possível carregar</h2>
        <p>{error?.message ?? 'Tente de novo em instantes.'}</p>
        {onRetry && <button type="button" className={styles.retry} onClick={onRetry}><RotateCw aria-hidden="true"/>Tentar de novo</button>}
    </div>;
}

export function Skeleton({ rows = 4, height = 64 }) {
    return <div className={styles.skeleton} role="status" aria-label="Carregando">
        {Array.from({ length: rows }, (_, index) => <span key={index} style={{ height }}/>)}
    </div>;
}

export function Spinner({ label = 'Carregando' }) {
    return <span className={styles.spinner} role="status"><LoaderCircle aria-hidden="true"/><span className="sr-only">{label}</span></span>;
}

// Coluna da tela: `form` e `wide` limitam a largura e centralizam cabeçalho e conteúdo juntos.
export function Page({ width = 'full', children }) {
    return <div className={styles.page} data-width={width}>{children}</div>;
}

// Cabeçalho de página: o h1 recebe foco a cada navegação, para a leitura assistiva anunciar a tela.
export function PageHeader({ title, subtitle, back, actions, children }) {
    const heading = useRef(null);
    useEffect(() => {
        heading.current?.focus({ preventScroll: true });
        document.title = `${title} — Dental Flow`;
    }, [title]);
    return <header className={styles.pageHeader}>
        <div className={styles.pageTitle}>
            {back && <Link to={back.to} className={styles.back}><ArrowLeft aria-hidden="true"/>{back.label}</Link>}
            <h1 ref={heading} tabIndex={-1} data-autofocus>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className={styles.pageActions}>{actions}</div>}
        {children}
    </header>;
}

// Rótulos das colunas de uma lista em grade. `className` traz o mesmo grid das linhas.
// É só visual: as células levam o rótulo em texto oculto para os leitores de tela.
export function ListHeader({ columns, className = '' }) {
    return <div className={`${styles.listHeader} ${className}`} aria-hidden="true">
        {columns.map((column, index) => {
            const { label, end } = typeof column === 'string' ? { label: column } : column;
            return <span key={index} className={end ? styles.listHeaderEnd : undefined}>{label}</span>;
        })}
    </div>;
}

export function Card({ title, action, children, className = '', padded = true, as: Tag = 'section' }) {
    return <Tag className={`${styles.card} ${padded ? styles.cardPadded : ''} ${className}`}>
        {(title || action) && <div className={styles.cardHead}>{title && <h2>{title}</h2>}{action}</div>}
        {children}
    </Tag>;
}

// Filtros em chips, como Instagram e iFood. `value` vazio representa "Todos".
export function Chips({ label, options, value, onChange, wrap = false }) {
    return <div className={`${styles.chips} ${wrap ? styles.chipsWrap : ''}`} role="group" aria-label={label}>
        {options.map(option => <button key={option.value ?? 'all'} type="button" className={styles.chip} aria-pressed={String(option.value ?? '') === String(value ?? '')} onClick={() => onChange(option.value)}>
            {option.avatar && <Avatar name={option.avatar} size="xs"/>}
            {option.label}{option.count !== undefined && <span className={styles.chipCount}>{option.count}</span>}
        </button>)}
    </div>;
}

export function Segmented({ label, options, value, onChange, full = false }) {
    return <div className={`${styles.segmented} ${full ? styles.segmentedFull : ''}`} role="group" aria-label={label}>
        {options.map(option => <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>{option.label}</button>)}
    </div>;
}

// Etapas já alcançadas (inclusive a atual) ficam concluídas; a seguinte aparece como próximo passo.
export function StepTrack({ steps, current, caption }) {
    const index = steps.findIndex(step => step.value === current);
    return <div className={styles.stepBox}>
        {caption && <p className={styles.stepCaption}>{caption}</p>}
        <ol className={styles.steps} aria-label="Etapas da consulta">
            {steps.map((step, position) => {
                const state = position <= index ? 'done' : position === index + 1 ? 'next' : 'pending';
                return <li key={step.value} data-state={state} aria-current={position === index ? 'step' : undefined}>
                    <span className={styles.stepDot}>{state === 'done' && <Check aria-hidden="true"/>}</span>{step.label}
                    {state === 'next' && <span className="sr-only"> (próximo passo)</span>}
                </li>;
            })}
        </ol>
    </div>;
}

export function Stat({ icon: Icon, label, value, hint, tone = 'neutral', highlight = false }) {
    return <div className={`${styles.stat} ${highlight ? styles.statHighlight : ''}`}>
        {Icon && <span className={`${styles.statIcon} ${styles[`badge_${tone}`]}`}><Icon aria-hidden="true"/></span>}
        <span className={styles.statLabel}>{label}</span>
        <strong className={styles.statValue}>{value}</strong>
        {hint && <span className={styles.statHint}>{hint}</span>}
    </div>;
}

export function DefinitionList({ items }) {
    return <dl className={styles.definitions}>
        {items.filter(Boolean).map(({ icon: Icon, label, value }) => <div key={label}>
            <dt className={styles.defIcon}>{Icon && <Icon aria-hidden="true"/>}</dt>
            <dd><small>{label}</small>{value || <span className={styles.missing}>Não informado</span>}</dd>
        </div>)}
    </dl>;
}

export const displayStyles = styles;
