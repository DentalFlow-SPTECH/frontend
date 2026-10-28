export const isDentist = user => user?.accessLevel === 'DENTISTA';
export const roleLabel = accessLevel => (accessLevel === 'DENTISTA' ? 'Dentista' : 'Recepção');

export function validateLogin({ login, password }) {
    const errors = {};
    if (!login.trim())
        errors.login = 'Informe o seu usuário.';
    if (!password)
        errors.password = 'Informe a sua senha.';
    return errors;
}

export function greeting(date = new Date()) {
    const hour = date.getHours();
    return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}
