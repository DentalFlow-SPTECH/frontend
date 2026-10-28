// Sessão da API (HTTP Basic). Decisão de 28/10/2026: as credenciais ficam em sessionStorage para o F5 não
// desconectar; fechar a aba encerra a sessão, e 30 minutos sem uso também. Provisório até a API emitir JWT.
export const sessionKey = 'dental_flow_session';
export const idleLimit = 30 * 60 * 1000;
const idleNotice = 'Sua sessão terminou por inatividade. Entre novamente para continuar.';

const encode = credentials => btoa(String.fromCharCode(...new TextEncoder().encode(`${credentials.login}:${credentials.password}`)));
function decode(token) {
    const text = new TextDecoder().decode(Uint8Array.from(atob(token), char => char.charCodeAt(0)));
    const separator = text.indexOf(':');
    return { login: text.slice(0, separator), password: text.slice(separator + 1) };
}

// `storage` segue a interface do Web Storage; sem ele (ou se o navegador bloquear), a sessão fica só em memória.
export function createSession({ storage = null, now = () => Date.now() } = {}) {
    function read() {
        try {
            const raw = storage?.getItem(sessionKey);
            return raw ? JSON.parse(raw) : null;
        }
        catch {
            return null;
        }
    }
    function write(value) {
        try {
            if (value)
                storage?.setItem(sessionKey, JSON.stringify(value));
            else
                storage?.removeItem(sessionKey);
        }
        catch {
            // Armazenamento indisponível: a sessão continua só em memória.
        }
    }

    const saved = read();
    const valid = Boolean(saved?.token && saved?.user && now() - (saved.lastActivity ?? 0) < idleLimit);
    if (saved && !valid)
        write(null);
    let credentials = valid ? decode(saved.token) : null;
    let lastActivity = valid ? saved.lastActivity : 0;
    let state = { user: valid ? saved.user : null, notice: saved && !valid ? idleNotice : '', reason: '', restored: valid };
    const listeners = new Set();
    function publish(next) {
        state = { ...state, ...next };
        listeners.forEach(listener => listener());
    }
    const persist = () => write({ token: encode(credentials), user: state.user, lastActivity });

    return {
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getSnapshot: () => state,
        getCredentials: () => credentials,
        user: () => state.user,
        idleFor: () => (credentials ? now() - lastActivity : 0),
        start(nextCredentials, user) {
            credentials = nextCredentials;
            lastActivity = now();
            publish({ user, notice: '', reason: '', restored: false });
            persist();
        },
        // Atualiza os dados do usuário depois de revalidar uma sessão reaberta.
        refresh(user) {
            if (!credentials)
                return;
            publish({ user, restored: false });
            persist();
        },
        // Registra uso; grava no máximo a cada 15 s para não escrever a cada clique.
        touch() {
            if (!credentials)
                return;
            const time = now();
            if (time - lastActivity < 15000)
                return;
            lastActivity = time;
            persist();
        },
        end(notice = '', reason = 'expired') {
            credentials = null;
            lastActivity = 0;
            write(null);
            publish({ user: null, notice, reason, restored: false });
        },
        expireForInactivity() {
            this.end(idleNotice);
        },
    };
}
