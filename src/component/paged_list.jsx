import { useRef } from 'react';
import { usePagination } from './use_pagination.js';
import styles from './paged_list.module.css';
import uiStyles from './ui.module.css';

export function PaginationControls({ pagination, label, disabled = false, compact = false, onPageChange }) {
    const { total, page, pages, start, end, goTo } = pagination;
    function change(next) { goTo(next); onPageChange?.(); }
    return <nav className={`${styles.pagination} ${compact ? styles.compact : ''}`} aria-label={`Paginação de ${label}`}>
        <p role="status"><span className={styles.prefix}>Mostrando </span>{total ? start + 1 : 0}–{end} de {total}<span className={styles.noun}> {total === 1 ? 'registro' : 'registros'}</span></p>
        {pages > 1 && <div className={styles.controls}>
            <button type="button" className={`${uiStyles.button} ${uiStyles.secondary}`} disabled={disabled || page === 0} onClick={() => change(page - 1)}>Anterior</button>
            <span className={styles.position}>Página {page + 1} de {pages}</span>
            <button type="button" className={`${uiStyles.button} ${uiStyles.secondary}`} disabled={disabled || page === pages - 1} onClick={() => change(page + 1)}>Próxima</button>
        </div>}
    </nav>;
}

export function PagedList({ records, label, pageSize = 6, pageKey, resetKey, compact = false, children }) {
    const pagination = usePagination(records.length, { pageSize, pageKey, resetKey });
    const content = useRef(null);
    return <div className={styles.list} data-page-list={label}>
        <div ref={content} tabIndex={-1} className={styles.content} aria-label={label} role="group">
            {children(records.slice(pagination.start, pagination.end))}
        </div>
        <PaginationControls pagination={pagination} label={label} compact={compact} onPageChange={() => requestAnimationFrame(() => content.current?.focus())}/>
    </div>;
}
