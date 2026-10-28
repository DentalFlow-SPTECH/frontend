import { useCallback, useEffect, useRef, useState } from 'react';

// Carrega dados assíncronos por chave e descarta respostas antigas que cheguem fora de ordem.
// Por padrão, trocar a chave esconde os dados da chave anterior (outra tela, outro registro).
// `keepPrevious` mantém os dados na tela até a nova resposta chegar, sem piscar — use somente
// quando o formato é o mesmo entre chaves (ex.: semanas da agenda, meses do painel).
export function useQuery(key, load, { keepPrevious = false } = {}) {
    const loader = useRef(load);
    loader.current = load;
    const [state, setState] = useState({ status: 'loading', data: undefined, error: null, dataKey: null });
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let active = true;
        setState(current => ({ ...current, status: 'loading', error: null }));
        Promise.resolve().then(() => loader.current()).then(
            data => { if (active) setState({ status: 'ready', data, error: null, dataKey: key }); },
            error => { if (active) setState(current => ({ ...current, status: 'error', error })); },
        );
        return () => { active = false; };
    }, [key, revision]);
    const reload = useCallback(() => setRevision(value => value + 1), []);
    const setData = useCallback(update => setState(current => ({ ...current, data: typeof update === 'function' ? update(current.data) : update })), []);
    const data = keepPrevious || state.dataKey === key ? state.data : undefined;
    const loading = state.status === 'loading' || state.dataKey !== key && state.status !== 'error';
    return { status: state.status, error: state.error, data, loading, firstLoad: loading && data === undefined, reload, setData };
}
