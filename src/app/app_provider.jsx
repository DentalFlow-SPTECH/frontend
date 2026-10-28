import { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { createHttpClient } from '../data/api/http_client.js';
import { createApi } from '../data/api/api.js';
import { createSession } from '../data/session.js';
import { createRepositories } from '../data/repositories.js';

const AppContext = createContext(null);

// `adapter` permite trocar o transporte do axios nos testes; em uso normal fica indefinido.
export function AppProvider({ children, adapter }) {
    const [services] = useState(() => {
        const session = createSession();
        const http = createHttpClient({
            getCredentials: session.getCredentials,
            onUnauthorized: () => session.end('Sua sessão terminou. Entre novamente para continuar.'),
            adapter,
        });
        return { session, repositories: createRepositories(createApi(http), session) };
    });
    const auth = useSyncExternalStore(services.session.subscribe, services.session.getSnapshot);
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
