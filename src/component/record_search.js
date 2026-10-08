import { normalize, dateLabel } from '../demo/format.js';

export const recordPageSize = 8;

export function recordDetails(record, kind) {
    return (kind === 'patient'
        ? [record.code, record.birthDate && `Nascimento: ${dateLabel(record.birthDate)}`, record.mobile || record.phone]
        : [record.cro && `CRO: ${record.cro}`, record.specialty, record.phone || record.email]
    ).filter(Boolean).join(' · ') || 'Sem dados adicionais no cadastro';
}

export function findRecords(records, query, kind) {
    const term = normalize(query);
    const digits = query.replace(/\D/g, '');
    const numeric = /^[\d\s().+\-]+$/.test(query) && digits.length > 0;
    return records.filter(record => {
        const fields = kind === 'patient'
            ? [record.name, record.code, record.cpf, record.phone, record.mobile]
            : [record.name, record.cro, record.specialty, record.id];
        return normalize(fields.filter(Boolean).join(' ')).includes(term)
            || (numeric && fields.some(field => String(field ?? '').replace(/\D/g, '').includes(digits)));
    });
}
