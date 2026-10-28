import * as Toast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCheck, CircleAlert, X } from 'lucide-react';
import styles from './toast.module.css';

const ToastContext = createContext(() => {});

// Aviso curto no rodapé, como Gmail e WhatsApp, com ação opcional (por exemplo, "Desfazer").
export function ToastProvider({ children }) {
    const [items, setItems] = useState([]);
    const notify = useCallback(({ title, description, tone = 'success', action }) => {
        setItems(list => [...list.slice(-2), { id: Date.now() + Math.random(), title, description, tone, action }]);
    }, []);
    return <ToastContext.Provider value={notify}>
        <Toast.Provider swipeDirection="down" duration={5000} label="Aviso">
            {children}
            {items.map(item => <Toast.Root key={item.id} data-toast className={`${styles.toast} ${styles[item.tone]}`} onOpenChange={open => { if (!open) setItems(list => list.filter(entry => entry.id !== item.id)); }}>
                <span className={styles.icon}>{item.tone === 'danger' ? <CircleAlert aria-hidden="true"/> : <CheckCheck aria-hidden="true"/>}</span>
                <div className={styles.text}>
                    <Toast.Title className={styles.title}>{item.title}</Toast.Title>
                    {item.description && <Toast.Description className={styles.description}>{item.description}</Toast.Description>}
                </div>
                {item.action && <Toast.Action altText={item.action.label} className={styles.action} onClick={item.action.onClick}>{item.action.label}</Toast.Action>}
                <Toast.Close className={styles.close} aria-label="Fechar aviso"><X aria-hidden="true"/></Toast.Close>
            </Toast.Root>)}
            <Toast.Viewport className={styles.viewport}/>
        </Toast.Provider>
    </ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
