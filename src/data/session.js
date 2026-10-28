// Sessão somente em memória, como o guia recomenda: atualizar ou fechar a página pede login de novo.
export function createSession() {
    let credentials = null;
    let state = { user: null, notice: '', reason: '' };
    const listeners = new Set();
    function publish(next) {
        state = { ...state, ...next };
        listeners.forEach(listener => listener());
    }
    return {
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getSnapshot: () => state,
        getCredentials: () => credentials,
        user: () => state.user,
        start(nextCredentials, user) {
            credentials = nextCredentials;
            publish({ user, notice: '', reason: '' });
        },
        end(notice = '', reason = 'expired') {
            credentials = null;
            publish({ user: null, notice, reason });
        },
    };
}
