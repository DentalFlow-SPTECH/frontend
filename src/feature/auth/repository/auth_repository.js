import { idleLimit } from '../../../data/session.js';

// Login por GET /auth/me com HTTP Basic. Não existe rota de logout: sair apaga as credenciais guardadas.
export function createAuthRepository({ api, session, lookups }) {
    return {
        async signIn(login, password) {
            const credentials = { login: login.trim().toLowerCase(), password };
            const user = await api.me(credentials);
            lookups.invalidate();
            session.start(credentials, user);
            return user;
        },
        signOut() {
            lookups.invalidate();
            session.end('', 'signed_out');
        },
        // Sessão reaberta depois do F5: confirma na API que o acesso continua válido.
        async revalidate() {
            const credentials = session.getCredentials();
            if (!credentials || !session.getSnapshot().restored)
                return;
            try {
                session.refresh(await api.me(credentials));
            }
            catch (error) {
                if (error.status === 401)
                    session.end('Sua sessão terminou. Entre novamente para continuar.');
            }
        },
        // Uso da tela: renova a sessão ou, se passou do limite sem uso, encerra.
        activity() {
            if (session.idleFor() > idleLimit) {
                lookups.invalidate();
                session.expireForInactivity();
                return false;
            }
            session.touch();
            return true;
        },
        checkIdle() {
            if (session.user() && session.idleFor() > idleLimit) {
                lookups.invalidate();
                session.expireForInactivity();
            }
        },
    };
}
