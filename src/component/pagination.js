// Paginação feita na tela: a API devolve as listas inteiras (ver README, "Limites conhecidos").
// Funções puras, sem React, para valerem em qualquer lista e nos testes.
export function paginate(items, page, size) {
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / size));
    const current = Math.min(Math.max(1, Math.trunc(Number(page)) || 1), pageCount);
    const start = (current - 1) * size;
    return { items: items.slice(start, start + size), page: current, pageCount, total, from: total ? start + 1 : 0, to: Math.min(start + size, total) };
}

// Números mostrados: a primeira, a última e as vizinhas da atual; '…' marca os saltos (um salto de uma página só mostra o número).
export function pageList(current, count) {
    const pages = [...new Set([1, current - 1, current, current + 1, count])].filter(page => page >= 1 && page <= count).sort((a, b) => a - b);
    const list = [];
    for (const page of pages) {
        const previous = list.at(-1);
        if (previous !== undefined && page - previous === 2)
            list.push(previous + 1);
        else if (previous !== undefined && page - previous > 2)
            list.push('…');
        list.push(page);
    }
    return list;
}
