// A API guarda o endereço num texto só (`address`, até 150 caracteres). O formulário separa rua, número e
// complemento para o CEP preencher a rua; estas funções puras montam o texto e o separam de volta na edição.

// Número: começa com algarismo (123, 12A, 1.200) ou "s/n".
const withNumber = /^(.+?),\s*(\d[\w./-]*|s\/?n)(?:\s+-\s+(.+))?$/i;

// Paciente: "Rua X, 123 - Apto 4". Bairro e CEP têm campos próprios na API.
export function composeAddress({ street = '', number = '', complement = '' }) {
    const base = [street.trim(), number.trim()].filter(Boolean).join(', ');
    return complement.trim() ? [base, complement.trim()].filter(Boolean).join(' - ') : base;
}

// Texto fora do padrão (cadastros antigos) fica inteiro na rua: nada se perde ao salvar de novo.
export function splitAddress(text) {
    const value = String(text ?? '').trim();
    const match = withNumber.exec(value);
    if (!match)
        return { street: value, number: '', complement: '' };
    return { street: match[1].trim(), number: match[2].trim(), complement: (match[3] ?? '').trim() };
}

// Clínica: a API não tem bairro, cidade nem CEP separados, então tudo entra no mesmo texto.
// "Rua X, 123 - Sala 2, Vila Mariana, São Paulo/SP, 01234-567"
export function composeClinicAddress({ street = '', number = '', complement = '', neighborhood = '', city = '', state = '', zipCode = '' }) {
    const place = city.trim() && state.trim() ? `${city.trim()}/${state.trim().toUpperCase()}` : city.trim() || state.trim().toUpperCase();
    return [composeAddress({ street, number, complement }), neighborhood.trim(), place, zipCode.trim()].filter(Boolean).join(', ');
}

// Lê de trás para frente: CEP, "Cidade/UF" e bairro só saem quando reconhecidos; o resto vai para rua/número/complemento.
export function splitClinicAddress(text) {
    const parts = String(text ?? '').split(',').map(part => part.trim()).filter(Boolean);
    const found = { neighborhood: '', city: '', state: '', zipCode: '' };
    if (parts.length > 1 && /^\d{5}-?\d{3}$/.test(parts.at(-1)))
        found.zipCode = parts.pop();
    const place = parts.length > 1 ? /^(.+)\/([A-Za-z]{2})$/.exec(parts.at(-1)) : null;
    if (place) {
        parts.pop();
        found.city = place[1].trim();
        found.state = place[2].toUpperCase();
        if (parts.length > 2)
            found.neighborhood = parts.pop();
    }
    return { ...splitAddress(parts.join(', ')), ...found };
}
