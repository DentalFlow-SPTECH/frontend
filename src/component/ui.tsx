import { cloneElement, useEffect, useRef, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { dateLabel } from '../demo/format';
import type { HistoryEntry } from '../demo/model';
import styles from './ui.module.css';

export function Button({ variant = 'primary', busy, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet'; busy?: boolean }) { return <button type="button" className={`${styles.button} ${styles[variant]} ${className}`} {...props} disabled={busy || props.disabled} aria-busy={busy || undefined}>{busy && <span className={styles.spinner} aria-hidden="true" />}{children}</button>; }
export function ActionLink({ variant = 'primary', className = '', ...props }: LinkProps & { variant?: 'primary' | 'secondary' | 'quiet' }) { return <Link {...props} className={`${styles.button} ${styles[variant]} ${className}`} />; }
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) { const heading = useRef<HTMLHeadingElement>(null); useEffect(() => { heading.current?.focus(); document.title = `${title} — Dental Flow`; }, [title]); return <header className={styles.pageHeader}><div>{eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}<h1 ref={heading} tabIndex={-1}>{title}</h1>{description && <p className={styles.description}>{description}</p>}</div>{action && <div className={styles.headerAction}>{action}</div>}</header>; }
export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactElement }) {
  const control = children as ReactElement<Record<string, unknown>>;
  const describedBy = [control.props['aria-describedby'], hint && `${id}_hint`, error && `${id}_error`].filter(Boolean).join(' ') || undefined;
  return <div className={styles.field}><label htmlFor={id}>{label}</label>{cloneElement(control, { id, name: control.props.name ?? id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}{hint && <p id={`${id}_hint`} className={styles.hint}>{hint}</p>}{error && <p id={`${id}_error`} className={styles.fieldError}>{error}</p>}</div>;
}
export function Feedback({ tone = 'info', title, children }: { tone?: 'info' | 'success' | 'warning' | 'error'; title?: string; children?: ReactNode }) { return <div className={`${styles.feedback} ${styles[tone]}`} role={tone === 'error' ? 'alert' : tone === 'success' ? 'status' : undefined}>{title && <strong>{title}</strong>}{children && <div>{children}</div>}</div>; }
export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className={styles.empty}><h2>{title}</h2><p>{detail}</p>{action}</div>; }
export function LoadingState() { return <div className={styles.loading} role="status" aria-busy="true"><p>Carregando registros…</p></div>; }
export function StatusLabel({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warning' | 'success' }) { return <span className={`${styles.status} ${styles[`status_${tone}`]}`}>{children}</span>; }
export function HistoryList({ entries }: { entries: HistoryEntry[] }) { if (!entries.length) return <p className={styles.description}>Nenhum registro no histórico.</p>; return <ol className={styles.history}>{[...entries].reverse().map(entry => <li key={entry.id}><div className={styles.historyDate}>{dateLabel(entry.date)}<span>{entry.actor.replace(' · demonstração', '')}</span></div><p>{entry.description.replace('Registro local atualizado na demonstração.', 'Orçamento atualizado.').replace('Registro local criado na demonstração.', 'Orçamento criado.')}</p></li>)}</ol>; }
export { styles as uiStyles };
