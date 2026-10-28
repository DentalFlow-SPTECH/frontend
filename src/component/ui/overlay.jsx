import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { X } from 'lucide-react';
import { Button } from './button.jsx';
import styles from './overlay.module.css';

// Painel lateral no computador e folha inferior no celular (padrão Uber/Google Maps), sobre Radix Dialog.
// Não modal: o aviso com "Desfazer" e a grade da agenda continuam clicáveis com o painel aberto.
const keepOpen = event => {
    if (event.target instanceof Element && event.target.closest('[data-toast]'))
        event.preventDefault();
};
export function Panel({ open, onOpenChange, title, description, children, footer }) {
    return <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
        <Dialog.Portal>
            <div className={styles.backdrop} aria-hidden="true" onClick={() => onOpenChange(false)}/>
            <Dialog.Content className={styles.panel} onInteractOutside={keepOpen}>
                <span className={styles.handle} aria-hidden="true"/>
                <div className={styles.panelHead}>
                    <Dialog.Title className={styles.panelTitle}>{title}</Dialog.Title>
                    <Dialog.Close className={styles.close} aria-label="Fechar"><X aria-hidden="true"/></Dialog.Close>
                </div>
                {description ? <Dialog.Description className="sr-only">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
                <div className={styles.panelBody}>{children}</div>
                {footer && <div className={styles.panelFoot}>{footer}</div>}
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, tone = 'danger', busy, onConfirm, children }) {
    return <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
            <Dialog.Overlay className={styles.overlay}/>
            <Dialog.Content className={styles.dialog}>
                <Dialog.Title className={styles.dialogTitle}>{title}</Dialog.Title>
                <Dialog.Description className={styles.dialogText}>{description}</Dialog.Description>
                {children}
                <div className={styles.dialogActions}>
                    <Dialog.Close asChild><Button variant="secondary">Voltar</Button></Dialog.Close>
                    <Button variant={tone === 'danger' ? 'dark' : 'primary'} busy={busy} onClick={onConfirm}>{confirmLabel}</Button>
                </div>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>;
}

export function DropdownMenu({ trigger, items, align = 'end' }) {
    return <Menu.Root>
        <Menu.Trigger asChild>{trigger}</Menu.Trigger>
        <Menu.Portal>
            <Menu.Content className={styles.menu} align={align} sideOffset={8}>
                {items.map(item => item.separator
                    ? <Menu.Separator key={item.key} className={styles.separator}/>
                    : item.header
                        ? <Menu.Label key={item.key} className={styles.menuLabel}>{item.header}</Menu.Label>
                        : <Menu.Item key={item.key} className={`${styles.menuItem} ${item.danger ? styles.menuDanger : ''}`} onSelect={item.onSelect}>{item.icon && <item.icon aria-hidden="true"/>}{item.label}</Menu.Item>)}
            </Menu.Content>
        </Menu.Portal>
    </Menu.Root>;
}
