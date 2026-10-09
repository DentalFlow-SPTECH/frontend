import { normalize, dateLabel, money } from '../demo/format.js';

export const recordPageSize = 6;

// Cada tipo de cadastro informa seus textos, os campos pesquisados e os detalhes exibidos; o seletor não conhece os módulos.
const kinds = {
    patient: {
        noun: 'paciente', plural: 'pacientes', hint: 'Nome, código, CPF ou telefone. Selecione um resultado para confirmar.',
        fields: record => [record.name, record.code, record.cpf, record.phone, record.mobile],
        details: record => [record.code, record.birthDate && `Nascimento: ${dateLabel(record.birthDate)}`, record.mobile || record.phone],
    },
    doctor: {
        noun: 'doutor', plural: 'doutores', hint: 'Nome, CRO ou especialidade. Selecione um resultado para confirmar.',
        fields: record => [record.name, record.cro, record.specialty, record.id],
        details: record => [record.cro && `CRO: ${record.cro}`, record.specialty, record.phone || record.email],
    },
    procedure: {
        noun: 'procedimento', plural: 'procedimentos', hint: 'Nome do procedimento, com ou sem acentos. Selecione um resultado para confirmar.',
        fields: record => [record.name],
        details: record => [Number.isSafeInteger(record.referencePriceCents) && `Valor de referência: ${money(record.referencePriceCents)}`],
    },
};

export function recordKind(kind) { return kinds[kind] ?? kinds.doctor; }

export function recordDetails(record, kind) {
    return recordKind(kind).details(record).filter(Boolean).join(' · ') || 'Sem dados adicionais no cadastro';
}

export function findRecords(records, query, kind) {
    const term = normalize(query);
    const digits = query.replace(/\D/g, '');
    const numeric = /^[\d\s().+\-]+$/.test(query) && digits.length > 0;
    return records.filter(record => {
        const fields = recordKind(kind).fields(record);
        return normalize(fields.filter(Boolean).join(' ')).includes(term)
            || (numeric && fields.some(field => String(field ?? '').replace(/\D/g, '').includes(digits)));
    });
}
