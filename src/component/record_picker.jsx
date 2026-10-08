import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, Field } from './ui.jsx';
import { useRecordPicker } from './use_record_picker.js';
import styles from './record_picker.module.css';

export function RecordPicker({ id, label, kind, records, value, onChange, error, disabled = false, allowClear = true, emptyLabel, query, onQueryChange, compact = false }) {
    const { open, setOpen, show, search, searchFor, selected, details, results, count, pages, currentPage, setPage, start } = useRecordPicker({ records, kind, value, query, onQueryChange });
    const dialog = useRef(null);
    const searchInput = useRef(null);
    const trigger = useRef(null);
    const resultList = useRef(null);
    const noun = kind === 'patient' ? 'paciente' : 'doutor';
    const plural = kind === 'patient' ? 'pacientes' : 'doutores';
    const title = `Buscar ${noun}`;
    useEffect(() => {
        const element = dialog.current;
        if (open && !disabled && !element.open) {
            element.showModal();
            searchInput.current?.focus();
        }
        if ((!open || disabled) && element.open) element.close();
    }, [open, disabled]);
    function choose(next) { onChange(next); setOpen(false); }
    function close() { setOpen(false); trigger.current?.focus(); }
    function focusResults(event) {
        if (event.key === 'Enter' || event.key === 'ArrowDown') {
            event.preventDefault();
            resultList.current?.querySelector('button')?.focus();
        }
    }
    function keepFocus(event) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter(control => control.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
    }
    return <>
      <Field id={id} label={label} error={error}>
        <button ref={trigger} type="button" value={value} disabled={disabled} className={`${styles.trigger} ${compact ? styles.compact : ''}`} onClick={show} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}_dialog`}>
          <span className={styles.identity}><strong>{selected?.name ?? emptyLabel ?? `Escolher ${noun}`}</strong>{selected && !compact && <small>{details}</small>}</span><span className={styles.action}>{selected ? 'Trocar' : 'Buscar'}</span>
        </button>
      </Field>
      {createPortal(<dialog ref={dialog} id={`${id}_dialog`} className={styles.dialog} aria-labelledby={`${id}_title`} onKeyDown={keepFocus} onCancel={() => setOpen(false)} onClose={close}>
        {open && <>
          <header className={styles.header}><div><p>Seleção de {noun}</p><h2 id={`${id}_title`}>{title}</h2></div><Button variant="secondary" onClick={() => setOpen(false)}>Fechar</Button></header>
          <div className={styles.search}><Field id={`${id}_search`} label={title} hint={kind === 'patient' ? 'Nome, código, CPF ou telefone. Selecione um resultado para confirmar.' : 'Nome, CRO ou especialidade. Selecione um resultado para confirmar.'}><input ref={searchInput} type="search" autoComplete="off" value={search} onChange={event => searchFor(event.target.value)} onKeyDown={focusResults}/></Field></div>
          <p role="status" className={styles.count}>{count ? `${start + 1}–${Math.min(start + results.length, count)} de ${count} ${count === 1 ? noun : plural}` : 'Nenhum resultado encontrado.'}</p>
          <div className={styles.results} ref={resultList}>
            {count ? <ul aria-label={`Resultados de ${noun}`}>{results.map(record => <li key={record.id}><button type="button" className={styles.result} data-record-id={record.id} aria-pressed={value === record.id} onClick={() => choose(record.id)}><span><strong>{record.name}</strong><small>{record.details}</small></span><span className={styles.resultAction}>{value === record.id ? 'Selecionado' : 'Selecionar'}</span></button></li>)}</ul> : <div className={styles.empty}><h3>{records.length ? `Nenhum ${noun} corresponde à busca` : `Nenhum ${noun} cadastrado`}</h3><p>{records.length ? 'Tente outro nome ou identificador.' : `Cadastre um ${noun} para disponibilizá-lo aqui.`}</p>{search && <Button variant="secondary" onClick={() => { searchFor(''); searchInput.current?.focus(); }}>Limpar busca</Button>}</div>}
          </div>
          <footer className={styles.footer}>{allowClear && <Button variant="quiet" onClick={() => choose('')}>{emptyLabel || 'Limpar seleção'}</Button>}<nav aria-label={`Páginas de ${noun}`} className={styles.pagination}><Button variant="secondary" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); resultList.current?.scrollTo(0, 0); }}>Anterior</Button><span>Página {currentPage + 1} de {pages}</span><Button variant="secondary" disabled={currentPage + 1 >= pages} onClick={() => { setPage(currentPage + 1); resultList.current?.scrollTo(0, 0); }}>Próxima</Button></nav></footer>
        </>}
      </dialog>, document.body)}
    </>;
}
