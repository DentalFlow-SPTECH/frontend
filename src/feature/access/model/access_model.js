export function emailError(value) {
    if (!value.trim())
        return 'Informe seu e-mail.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
        return 'Informe um e-mail válido, como nome@exemplo.com.';
    return undefined;
}
