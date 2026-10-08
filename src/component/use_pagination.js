import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

// Pagination changes the visible records, never the underlying collection.
export function usePagination(total, { pageSize = 10, pageKey, resetKey = '' } = {}) {
    const [params, setParams] = useSearchParams();
    const { pathname } = useLocation();
    const key = `${pathname}:${resetKey}`;
    const [local, setLocal] = useState({ key, page: 0 });
    const value = pageKey ? Number(params.get(pageKey) ?? 1) - 1 : local.key === key ? local.page : 0;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(pages - 1, Math.max(0, Number.isSafeInteger(value) ? value : 0));
    const start = page * pageSize;
    function goTo(nextPage) {
        const next = Math.max(0, nextPage);
        if (pageKey) {
            const updated = new URLSearchParams(params);
            if (next === 0) updated.delete(pageKey);
            else updated.set(pageKey, String(next + 1));
            setParams(updated);
        }
        else setLocal({ key, page: next });
    }
    return { total, pageSize, pages, page, start, end: Math.min(start + pageSize, total), goTo };
}
