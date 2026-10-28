// Login por GET /auth/me com HTTP Basic. Não existe rota de logout: sair apaga as credenciais da memória.
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
    };
}
