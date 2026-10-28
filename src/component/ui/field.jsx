import { cloneElement, forwardRef, useId } from 'react';
import { CircleAlert } from 'lucide-react';
import styles from './field.module.css';

// Rótulo sempre visível; campos opcionais são marcados, porque são minoria nos formulários da API.
export function Field({ label, optional, hint, error, children, className = '' }) {
    const id = useId();
    const control = children;
    const describedBy = [hint && `${id}_hint`, error && `${id}_error`].filter(Boolean).join(' ') || undefined;
    return <div className={`${styles.field} ${className}`}>
        <label htmlFor={control.props.id ?? id}>{label}{optional && <span> (opcional)</span>}</label>
        {cloneElement(control, { id: control.props.id ?? id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
        {hint && !error && <p id={`${id}_hint`} className={styles.hint}>{hint}</p>}
        {error && <p id={`${id}_error`} className={styles.error}><CircleAlert aria-hidden="true"/>{error}</p>}
    </div>;
}

// `trailing` acomoda um botão dentro do campo (ex.: mostrar senha) sem desligar o rótulo do <input>.
export const Input = forwardRef(function Input({ className = '', icon: Icon, trailing, ...props }, ref) {
    const input = <input ref={ref} className={`${styles.control} ${className}`} {...props}/>;
    if (!Icon && !trailing)
        return input;
    return <span className={`${styles.affix} ${Icon ? styles.hasIcon : ''} ${trailing ? styles.hasTrailing : ''}`}>
        {Icon && <Icon aria-hidden="true" className={styles.leading}/>}{input}{trailing && <span className={styles.trailing}>{trailing}</span>}
    </span>;
});

export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
    return <select ref={ref} className={`${styles.control} ${styles.select} ${className}`} {...props}>{children}</select>;
});

export const Textarea = forwardRef(function Textarea({ className = '', ...props }, ref) {
    return <textarea ref={ref} className={`${styles.control} ${styles.textarea} ${className}`} {...props}/>;
});

export function Checkbox({ label, className = '', ...props }) {
    return <label className={`${styles.check} ${className}`}><input type="checkbox" {...props}/><span>{label}</span></label>;
}

export function FormGrid({ children, columns = 2 }) {
    return <div className={styles.grid} style={{ '--columns': columns }}>{children}</div>;
}

export const fieldStyles = styles;
