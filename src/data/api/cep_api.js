// Busca de endereço pelo CEP no ViaCEP (serviço público, sem chave). Só os 8 números do CEP saem do sistema.
// Usa fetch direto, e não o cliente da API do Dental Flow, para nunca mandar as credenciais (Basic Auth) a terceiros.
const endpoint = cep => `https://viacep.com.br/ws/${cep}/json/`;

export function createCepApi({ fetch = (...args) => globalThis.fetch(...args), timeout = 5000 } = {}) {
    return {
        // Devolve o endereço, `null` para CEP inexistente, ou lança erro (rede, tempo esgotado, serviço fora do ar).
        async lookup(cep) {
            const value = String(cep ?? '').replace(/\D/g, '');
            if (value.length !== 8)
                return null;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(endpoint(value), { credentials: 'omit', signal: controller.signal });
                if (response.status === 400)
                    return null;
                if (!response.ok)
                    throw new Error(`O ViaCEP respondeu ${response.status}.`);
                const data = await response.json();
                if (!data || data.erro)
                    return null;
                return { zipCode: data.cep ?? '', street: data.logradouro ?? '', neighborhood: data.bairro ?? '', city: data.localidade ?? '', state: data.uf ?? '' };
            }
            finally {
                clearTimeout(timer);
            }
        },
    };
}
