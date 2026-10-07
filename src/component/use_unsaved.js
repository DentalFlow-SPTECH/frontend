import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
export function useUnsaved(dirty, pending = false) {
    const blocker = useBlocker(dirty || pending);
    useEffect(() => {
        if (blocker.state === 'blocked') {
            if (pending) {
                window.alert('Uma operação está sendo salva. Aguarde a conclusão antes de sair desta página.');
                blocker.reset();
            }
            else if (window.confirm('Há alterações não salvas. Deseja sair e descartar essas alterações?'))
                blocker.proceed();
            else
                blocker.reset();
        }
    }, [blocker, pending]);
    useEffect(() => {
        if (!dirty && !pending)
            return;
        const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty, pending]);
}
