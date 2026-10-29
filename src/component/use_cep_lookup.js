import { useRef, useState } from 'react';
import { digits } from './format.js';

const hints = {
    idle: 'Digite o CEP e preenchemos o resto.',
    loading: 'Buscando o endereço…',
    not_found: 'CEP não encontrado. Confira os números ou preencha o endereço à mão.',
    error: 'Não foi possível buscar o CEP agora. Preencha o endereço à mão.',
};

// Busca o endereço quando o CEP fica completo (8 números) e entrega o resultado para o formulário preencher.
// Só busca de novo se o CEP mudar. CEP inexistente ou falha não bloqueia: os campos continuam editáveis.
// `next` diz qual campo recebe o foco depois (cidades de CEP único não têm rua) e `version` muda a cada acerto.
export function useCepLookup(find) {
    const [state, setState] = useState({ status: 'idle', place: '', next: 'number', version: 0 });
    const last = useRef('');
    const request = useRef(0);

    async function lookup(cep, apply) {
        const value = digits(cep);
        if (value.length !== 8) {
            last.current = '';
            request.current += 1;
            setState(current => (current.status === 'idle' ? current : { ...current, status: 'idle', place: '' }));
            return;
        }
        if (value === last.current)
            return;
        last.current = value;
        const id = ++request.current;
        setState(current => ({ ...current, status: 'loading', place: '' }));
        try {
            const address = await find(value);
            if (id !== request.current)
                return;
            if (!address) {
                setState(current => ({ ...current, status: 'not_found' }));
                return;
            }
            apply(address);
            setState(current => ({
                status: 'found', place: [address.city, address.state].filter(Boolean).join('/'),
                next: address.street ? 'number' : 'street', version: current.version + 1,
            }));
        }
        catch {
            if (id === request.current) {
                last.current = '';
                setState(current => ({ ...current, status: 'error' }));
            }
        }
    }

    const hint = state.status === 'found' ? `${state.place}${state.next === 'street' ? ' · CEP único da cidade: preencha a rua.' : ''}` : hints[state.status];
    return { ...state, hint, lookup };
}
