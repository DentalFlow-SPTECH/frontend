import { useState } from 'react';
import { findRecords, recordPageSize, recordDetails } from './record_search.js';

export function useRecordPicker({ records, kind, value, query, onQueryChange }) {
    const [open, setOpen] = useState(false);
    const [localQuery, setLocalQuery] = useState('');
    const [page, setPage] = useState(0);
    const search = query ?? localQuery;
    const matches = findRecords(records, search, kind);
    const pages = Math.max(1, Math.ceil(matches.length / recordPageSize));
    const currentPage = Math.min(page, pages - 1);
    const start = currentPage * recordPageSize;
    const results = matches.slice(start, start + recordPageSize).map(record => ({ ...record, details: recordDetails(record, kind) }));
    const selected = records.find(record => record.id === value);
    function show() { setLocalQuery(''); setPage(0); setOpen(true); }
    function searchFor(next) {
        if (onQueryChange) onQueryChange(next);
        else setLocalQuery(next);
        setPage(0);
    }
    return { open, setOpen, show, search, searchFor, selected, details: selected ? recordDetails(selected, kind) : '', results, count: matches.length, pages, currentPage, setPage, start };
}
