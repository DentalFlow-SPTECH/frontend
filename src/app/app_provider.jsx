import { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { createClinicSession } from '../data/clinic_session.js';
import { createRepositories } from '../data/repositories.js';
const ClinicContext = createContext(null);
export function AppProvider({ children }) {
    const [services] = useState(() => {
        // Access browser storage inside adapter calls so unavailable storage follows recovery handling.
        const storage = {
            getItem: key => localStorage.getItem(key),
            setItem: (key, value) => localStorage.setItem(key, value),
        };
        const session = createClinicSession({ storage });
        const repositories = createRepositories(session);
        return { session, repositories };
    });
    const { session, repositories } = services;
    const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
    const value = {
        ...snapshot, repositories,
        load: session.load, reset: session.reset, setScenario: session.setScenario,
    };
    return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
}
export function useClinicData() {
    const value = useContext(ClinicContext);
    if (!value)
        throw new Error('AppProvider não disponível');
    return value;
}
export function useClinicRepository(module) {
    return useClinicData().repositories[module];
}
