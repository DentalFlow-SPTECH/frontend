import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pageList } from '../pagination.js';
import styles from './pagination.module.css';

// Lista paginada: mostra a página atual e, abaixo, "Mostrando 21–40 de 134" com Anterior, números e Próxima.
// `pager` vem do ViewModel (usePagination). Ao trocar de página, volta ao topo da lista se ela saiu da tela.
export function Paginated({ pager, noun = 'itens', className = '', children }) {
    const box = useRef(null);
    function go(page) {
        pager.setPage(page);
        if (box.current && box.current.getBoundingClientRect().top < 0)
            box.current.scrollIntoView({ block: 'start' });
    }
    return <div ref={box} className={`${styles.box} ${className}`}>
        {children}
        {pager.pageCount > 1 && <nav className={styles.pagination} aria-label={`Páginas de ${noun}`}>
            <p className={styles.range}>Mostrando <b>{pager.from}–{pager.to}</b> de <b>{pager.total}</b> {noun}</p>
            <div className={styles.controls}>
                <button type="button" className={styles.step} onClick={() => go(pager.page - 1)} disabled={pager.page === 1}><ChevronLeft aria-hidden="true"/><span>Anterior</span></button>
                <ol className={styles.numbers}>
                    {pageList(pager.page, pager.pageCount).map((item, index) => <li key={`${item}-${index}`}>
                        {item === '…' ? <span className={styles.gap} aria-hidden="true">…</span>
                            : <button type="button" className={styles.number} aria-current={item === pager.page ? 'page' : undefined} aria-label={`Página ${item}`} onClick={() => go(item)}>{item}</button>}
                    </li>)}
                </ol>
                <span className={styles.compact}>Página {pager.page} de {pager.pageCount}</span>
                <button type="button" className={styles.step} onClick={() => go(pager.page + 1)} disabled={pager.page === pager.pageCount}><span>Próxima</span><ChevronRight aria-hidden="true"/></button>
            </div>
        </nav>}
    </div>;
}
