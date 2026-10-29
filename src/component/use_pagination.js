import { useSearchParams } from 'react-router-dom';
import { paginate } from './pagination.js';

// Página atual na URL (?pagina=2): ao voltar de uma ficha, a lista abre na mesma página.
// Trocar de página substitui o endereço, para o "Voltar" do navegador sair da lista e não andar entre páginas.
export function usePagination(items, size, name = 'pagina') {
    const [params, setParams] = useSearchParams();
    const result = paginate(items, params.get(name), size);
    function setPage(page) {
        setParams(current => {
            const next = new URLSearchParams(current);
            if (page > 1)
                next.set(name, String(page));
            else
                next.delete(name);
            return next;
        }, { replace: true });
    }
    return { ...result, setPage };
}
