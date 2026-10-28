import { useCallback, useEffect, useRef, useState } from 'react';

// Carrega dados assíncronos por chave. Ao trocar a chave, mantém os dados anteriores na tela até a
// nova resposta chegar (sem piscar), e descarta respostas antigas que cheguem fora de ordem.
export function useQuery(key, load) {
    const loader = useRef(load);
    loader.current = load;
    const [state, setState] = useState({ status: 'loading', data: undefined, error: null });
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let active = true;
        setState(current => ({ ...current, status: 'loading', error: null }));
        Promise.resolve().then(() => loader.current()).then(
            data => { if (active) setState({ status: 'ready', data, error: null }); },
            error => { if (active) setState(current => ({ status: 'error', data: current.data, error })); },
        );
        return () => { active = false; };
    }, [key, revision]);
    const reload = useCallback(() => setRevision(value => value + 1), []);
    const setData = useCallback(update => setState(current => ({ ...current, data: typeof update === 'function' ? update(current.data) : update })), []);
    return { ...state, loading: state.status === 'loading', firstLoad: state.status === 'loading' && state.data === undefined, reload, setData };
}
