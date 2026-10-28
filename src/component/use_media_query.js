import { useSyncExternalStore } from 'react';

export function useMediaQuery(query) {
    return useSyncExternalStore(
        callback => {
            const list = window.matchMedia(query);
            list.addEventListener('change', callback);
            return () => list.removeEventListener('change', callback);
        },
        () => window.matchMedia(query).matches,
        () => false,
    );
}

// Relógio que avança a cada minuto, para a linha "agora" e o "próximo paciente".
const nowListeners = new Set();
let nowTimer = null;
let nowValue = Date.now();
function subscribeNow(callback) {
    nowListeners.add(callback);
    if (!nowTimer) {
        nowValue = Date.now();
        nowTimer = setInterval(() => { nowValue = Date.now(); nowListeners.forEach(listener => listener()); }, 30000);
    }
    return () => {
        nowListeners.delete(callback);
        if (!nowListeners.size) {
            clearInterval(nowTimer);
            nowTimer = null;
        }
    };
}
export function useNow() {
    const value = useSyncExternalStore(subscribeNow, () => nowValue, () => nowValue);
    return new Date(value);
}
