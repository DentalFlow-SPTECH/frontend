import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import styles from './button.module.css';

// API no padrão do shadcn/ui: variant e size. Variants: primary, secondary, ghost, soft, danger, whatsapp, dark.
const classes = ({ variant = 'primary', size = 'md', block, className = '' }) =>
    [styles.button, styles[variant], styles[size], block ? styles.block : '', className].filter(Boolean).join(' ');

export const Button = forwardRef(function Button({ variant, size, block, busy = false, icon: Icon, className, children, type = 'button', ...props }, ref) {
    return <button ref={ref} type={type} className={classes({ variant, size, block, className })} {...props} disabled={busy || props.disabled} aria-busy={busy || undefined}>
        {busy ? <LoaderCircle className={styles.spin} aria-hidden="true"/> : Icon && <Icon aria-hidden="true"/>}
        {children}
    </button>;
});

export function ButtonLink({ variant, size, block, icon: Icon, className, children, ...props }) {
    return <Link className={classes({ variant, size, block, className })} {...props}>{Icon && <Icon aria-hidden="true"/>}{children}</Link>;
}

export function ExternalButton({ variant, size, block, icon: Icon, className, children, ...props }) {
    return <a className={classes({ variant, size, block, className })} target="_blank" rel="noreferrer" {...props}>{Icon && <Icon aria-hidden="true"/>}{children}</a>;
}

export const IconButton = forwardRef(function IconButton({ label, icon: Icon, variant = 'ghost', className = '', type = 'button', ...props }, ref) {
    return <button ref={ref} type={type} className={`${styles.iconButton} ${styles[variant]} ${className}`} aria-label={label} title={label} {...props}><Icon aria-hidden="true"/></button>;
});

export function IconLink({ label, icon: Icon, variant = 'ghost', className = '', ...props }) {
    return <Link className={`${styles.iconButton} ${styles[variant]} ${className}`} aria-label={label} title={label} {...props}><Icon aria-hidden="true"/></Link>;
}
