import { useId, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { normalizeText } from '../format.js';
import { Avatar } from './display.jsx';
import fieldStyles from './field.module.css';
import styles from './combobox.module.css';

// Campo de busca com lista (padrão ARIA combobox), no lugar de <select> quando as opções vêm de um cadastro
// que cresce (procedimentos, dentistas): digita-se parte do nome e escolhe-se com clique, toque ou setas + Enter.
// Recebe do Field o id, aria-invalid e aria-describedby, que vão para o <input> para o rótulo continuar ligado.
// Opção: { value, label, detail?, avatar? }. `value` vazio ('') representa "nenhum".
export function Combobox({ id, options, value, onChange, placeholder = 'Digite para buscar', emptyText = 'Nenhum resultado', limit = 8, ...props }) {
    const listId = useId();
    const input = useRef(null);
    const [text, setText] = useState(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const selected = options.find(option => String(option.value) === String(value ?? '')) ?? null;
    const term = normalizeText(text ?? '');
    const found = options.filter(option => !term || normalizeText(`${option.label} ${option.detail ?? ''}`).includes(term));
    const matches = found.slice(0, limit);
    const expanded = open && matches.length > 0;
    const optionId = index => `${listId}-${index}`;

    function choose(option) {
        onChange(String(option.value));
        setText(null);
        setOpen(false);
    }
    function move(step) {
        if (!open) {
            setOpen(true);
            return;
        }
        const next = Math.min(Math.max(active + step, 0), matches.length - 1);
        setActive(next);
        requestAnimationFrame(() => document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' }));
    }
    function onKeyDown(event) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            move(event.key === 'ArrowDown' ? 1 : -1);
        }
        else if (event.key === 'Enter' && open && matches[active]) {
            event.preventDefault();
            choose(matches[active]);
        }
        else if (event.key === 'Escape' && open) {
            event.preventDefault();
            setText(null);
            setOpen(false);
        }
    }
    function clear() {
        onChange('');
        setText('');
        setActive(0);
        setOpen(true);
        input.current?.focus();
    }

    return <div className={styles.combobox}>
        <span className={`${fieldStyles.affix} ${fieldStyles.hasIcon} ${selected ? fieldStyles.hasTrailing : ''}`}>
            <Search aria-hidden="true" className={fieldStyles.leading}/>
            <input ref={input} id={id} type="text" role="combobox" className={fieldStyles.control} autoComplete="off" placeholder={placeholder}
                aria-expanded={expanded} aria-controls={expanded ? listId : undefined} aria-autocomplete="list" aria-activedescendant={expanded && matches[active] ? optionId(active) : undefined}
                value={text ?? selected?.label ?? ''}
                onFocus={event => { event.target.select(); setActive(0); setOpen(true); }}
                onBlur={() => { setText(null); setOpen(false); }}
                onChange={event => {
                    setText(event.target.value);
                    setActive(0);
                    setOpen(true);
                    if (!event.target.value && selected)
                        onChange('');
                }}
                onKeyDown={onKeyDown} {...props}/>
            {selected && <span className={fieldStyles.trailing}><button type="button" onClick={clear} aria-label={`Limpar ${selected.label}`}><X aria-hidden="true"/></button></span>}
        </span>
        {open && <div className={styles.popup} onMouseDown={event => event.preventDefault()}>
            {expanded && <ul id={listId} role="listbox" aria-label="Sugestões" className={styles.list}>
                {matches.map((option, index) => <li key={option.value} id={optionId(index)} role="option" aria-selected={index === active} className={styles.option}
                    onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>
                    {option.avatar && <Avatar name={option.avatar} size="xs"/>}
                    <span className={styles.label}>{option.label}</span>
                    {option.detail && <span className={styles.detail}>{option.detail}</span>}
                    {selected && String(option.value) === String(selected.value) && <Check aria-hidden="true" className={styles.check}/>}
                </li>)}
            </ul>}
            {!matches.length && <p className={styles.empty} role="status">{emptyText}</p>}
            {found.length > matches.length && <p className={styles.more}>Mostrando {matches.length} de {found.length}. Continue digitando para achar os outros.</p>}
        </div>}
    </div>;
}
