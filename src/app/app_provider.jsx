import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { createHttpClient } from '../data/api/http_client.js';
import { createApi } from '../data/api/api.js';
import { createSession } from '../data/session.js';
import { createRepositories } from '../data/repositories.js';

const AppContext = createContext(null);

// O navegador pode bloquear o sessionStorage (modo privado, política da empresa): nesse caso, só memória.
function browserSessionStorage() {
    try {
        return window.sessionStorage;
    }
    catch {
        return null;
    }
}

// `adapter` permite trocar o transporte do axios nos testes; em uso normal fica indefinido.
export function AppProvider({ children, adapter }) {
    const [services] = useState(() => {
        const session = createSession({ storage: browserSessionStorage() });
        const http = createHttpClient({
            getCredentials: session.getCredentials,
            onUnauthorized: () => session.end('Sua sessão terminou. Entre novamente para continuar.'),
            adapter,
        });
        return { session, repositories: createRepositories(createApi(http), session) };
    });
    const auth = useSyncExternalStore(services.session.subscribe, services.session.getSnapshot);
    useEffect(() => { services.repositories.auth.revalidate(); }, [services]);
    return <AppContext.Provider value={{ auth, repositories: services.repositories }}>{children}</AppContext.Provider>;
}

function useApp() {
    const value = useContext(AppContext);
    if (!value)
        throw new Error('AppProvider não disponível');
    return value;
}
export const useAuth = () => useApp().auth;
export const useRepository = name => useApp().repositories[name];
