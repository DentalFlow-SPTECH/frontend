import { parseMoney } from '../../clinic/model/clinic_model.js';

// Mapa clínico diário (guia, seção 14). A API calcula totais, descontos e saldo; aqui só montamos o envio.
export const visitTypes = { CLINICO: 'Clínico', PROTESE: 'Prótese', PEDIATRIA_CIRURGIA: 'Pediatria / cirurgia' };
export const paymentCodes = ['PIX', 'DINHEIRO', 'CARTAO', 'CHEQUE', 'CONVENIO', 'OUTRO'];
export const paymentLabels = { PIX: 'Pix', DINHEIRO: 'Dinheiro', CARTAO: 'Cartão', CHEQUE: 'Cheque', CONVENIO: 'Convênio', OUTRO: 'Outro' };
export const counters = [['moldingCount', 'Moldagens'], ['biteCount', 'Mordidas'], ['fittingCount', 'Provas'], ['deliveryCount', 'Entregas'], ['repetitionCount', 'Repetições']];
export const discounts = [['cardDiscount', 'Taxa de cartão'], ['predatedCheckDiscount', 'Cheque pré-datado'], ['cashCheckDiscount', 'Cheque à vista'], ['otherDiscount', 'Outros descontos']];

const money = value => (value === null || value === undefined || value === '' ? '' : Number(value).toFixed(2).replace('.', ','));
const hhmm = value => (value ? String(value).slice(0, 5) : '');
const time = value => (value ? `${value.slice(0, 5)}:00` : null);
let sequence = 0;
const key = () => `linha-${++sequence}`;

export const emptyVisit = (line = 1) => ({ key: key(), appointmentId: null, patientId: null, procedureId: '', lineNumber: line, recordNumber: '', patientName: '', scheduledTime: '', entryTime: '', exitTime: '', returnTime: '', paymentCode: 'PIX', value: '', type: 'CLINICO', checked: false });
export const emptyVoucher = () => ({ key: key(), responsibleName: '', recordNumber: '', value: '', description: '', checked: false });
export const emptyExpense = () => ({ key: key(), description: '', value: '' });

export function emptyDailyMapForm(date) {
    return { date, notes: '', ...Object.fromEntries(discounts.map(([field]) => [field, ''])), ...Object.fromEntries(counters.map(([field]) => [field, '0'])), visits: [], vouchers: [], expenses: [], teamSchedules: [] };
}

// Sugere uma linha por consulta do dia (exceto canceladas e faltas), com o valor do procedimento.
export function visitsFromAppointments(appointments) {
    return appointments.filter(item => !['CANCELADO', 'FALTOU'].includes(item.status)).sort((a, b) => a.start - b.start).map((item, index) => ({
        ...emptyVisit(index + 1), appointmentId: item.id, patientId: item.patientId, procedureId: String(item.procedureId), patientName: item.patientName,
        scheduledTime: item.time, value: money(item.procedure?.price ?? ''),
    }));
}

export function formFromDailyMap(map) {
    return {
        date: map.date, notes: map.notes ?? '',
        ...Object.fromEntries(discounts.map(([field]) => [field, Number(map[field]) ? money(map[field]) : ''])),
        ...Object.fromEntries(counters.map(([field]) => [field, String(map[field] ?? 0)])),
        visits: (map.visits ?? []).map(visit => ({
            ...emptyVisit(visit.lineNumber), appointmentId: visit.appointmentId ?? null, patientId: visit.patientId ?? null, procedureId: visit.procedureId ? String(visit.procedureId) : '',
            recordNumber: visit.recordNumber ?? '', patientName: visit.patientName ?? '', scheduledTime: hhmm(visit.scheduledTime), entryTime: hhmm(visit.entryTime), exitTime: hhmm(visit.exitTime), returnTime: hhmm(visit.returnTime),
            paymentCode: visit.paymentCode ?? '', value: money(visit.value), type: visit.type ?? 'CLINICO', checked: Boolean(visit.checked),
        })),
        vouchers: (map.vouchers ?? []).map(item => ({ ...emptyVoucher(), responsibleName: item.responsibleName ?? '', recordNumber: item.recordNumber ?? '', value: money(item.value), description: item.description ?? '', checked: Boolean(item.checked) })),
        expenses: (map.expenses ?? []).map(item => ({ ...emptyExpense(), description: item.description ?? '', value: money(item.value) })),
        teamSchedules: map.teamSchedules ?? [],
    };
}

export function validateDailyMap(form) {
    const errors = {};
    if (!form.date)
        errors.date = 'Informe a data.';
    form.visits.forEach((visit, index) => {
        const value = parseMoney(visit.value);
        if (!visit.patientName.trim())
            errors[`visits.${index}.patientName`] = 'Informe o paciente.';
        if (value === null || Number.isNaN(value) || value < 0)
            errors[`visits.${index}.value`] = 'Informe o valor (0 se não houve cobrança).';
    });
    form.vouchers.forEach((voucher, index) => {
        const value = parseMoney(voucher.value);
        if (value === null || Number.isNaN(value) || value < 0)
            errors[`vouchers.${index}.value`] = 'Informe o valor.';
    });
    form.expenses.forEach((expense, index) => {
        const value = parseMoney(expense.value);
        if (!expense.description.trim())
            errors[`expenses.${index}.description`] = 'Descreva a despesa.';
        if (value === null || Number.isNaN(value) || value < 0)
            errors[`expenses.${index}.value`] = 'Informe o valor.';
    });
    for (const [field] of discounts) {
        const value = parseMoney(form[field]);
        if (Number.isNaN(value) || (value !== null && value < 0))
            errors[field] = 'Valor inválido.';
    }
    for (const [field] of counters) {
        const value = Number(form[field] || 0);
        if (!Number.isInteger(value) || value < 0)
            errors[field] = 'Número inválido.';
    }
    if (form.notes.length > 4000)
        errors.notes = 'Use no máximo 4000 caracteres.';
    return errors;
}

export function toDailyMapPayload(form) {
    return {
        date: form.date, notes: form.notes.trim() || null,
        ...Object.fromEntries(discounts.map(([field]) => [field, parseMoney(form[field]) ?? 0])),
        ...Object.fromEntries(counters.map(([field]) => [field, Number(form[field] || 0)])),
        visits: form.visits.map((visit, index) => ({
            appointmentId: visit.appointmentId, patientId: visit.patientId, procedureId: visit.procedureId ? Number(visit.procedureId) : null, lineNumber: index + 1,
            recordNumber: visit.recordNumber.trim() || null, patientName: visit.patientName.trim(), scheduledTime: time(visit.scheduledTime), entryTime: time(visit.entryTime),
            exitTime: time(visit.exitTime), returnTime: time(visit.returnTime), paymentCode: visit.paymentCode || null, value: parseMoney(visit.value) ?? 0, type: visit.type, checked: visit.checked,
        })),
        vouchers: form.vouchers.map(item => ({ responsibleName: item.responsibleName.trim() || null, recordNumber: item.recordNumber.trim() || null, value: parseMoney(item.value) ?? 0, description: item.description.trim() || null, checked: item.checked })),
        expenses: form.expenses.map(item => ({ description: item.description.trim(), value: parseMoney(item.value) ?? 0 })),
        teamSchedules: form.teamSchedules,
    };
}

// Estimativa exibida enquanto o mapa é preenchido; o valor oficial é o calculado pela API ao salvar.
export function previewTotals(form) {
    const sum = list => list.reduce((total, value) => total + (parseMoney(value) || 0), 0);
    const gross = sum(form.visits.map(visit => visit.value));
    const vouchers = sum(form.vouchers.map(item => item.value));
    const discountTotal = sum(discounts.map(([field]) => form[field])) + vouchers;
    const expenses = sum(form.expenses.map(item => item.value));
    return { gross, discounts: discountTotal, expenses, balance: gross - discountTotal - expenses, patients: form.visits.length };
}

export const readyToClose = map => (map.visits ?? []).every(visit => visit.checked) && (map.vouchers ?? []).every(voucher => voucher.checked);
