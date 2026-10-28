// Formatação e máscaras puras (sem React/DOM), compartilhadas por Models e Views.
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
export const brl = value => money.format(Number(value ?? 0));
export const numberLabel = value => decimal.format(Number(value ?? 0));
export const percent = value => `${Number(value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
export const digits = value => String(value ?? '').replace(/\D/g, '');

const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const weekdaysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const monthName = month => months[month - 1];

// Datas trafegam como `YYYY-MM-DD` e `YYYY-MM-DDTHH:mm:ss` locais; nada passa por UTC.
export function isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseDate(value) {
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
}
export function addDays(value, amount) {
    const date = parseDate(value);
    date.setDate(date.getDate() + amount);
    return isoDate(date);
}
export function startOfWeek(value) {
    const date = parseDate(value);
    return addDays(value, -((date.getDay() + 6) % 7));
}
export const weekdayOf = value => weekdays[parseDate(value).getDay()];
export const weekdayShort = value => weekdaysShort[parseDate(value).getDay()];
export const dayOfMonth = value => parseDate(value).getDate();
export function dateLong(value) {
    const date = parseDate(value);
    return `${weekdays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
}
export function dateShort(value) {
    const date = parseDate(value);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}
export function rangeLabel(start, end) {
    const a = parseDate(start);
    const b = parseDate(end);
    if (a.getMonth() === b.getMonth())
        return `${a.getDate()} a ${b.getDate()} de ${months[b.getMonth()]}`;
    return `${a.getDate()} de ${months[a.getMonth()]} a ${b.getDate()} de ${months[b.getMonth()]}`;
}
export const timeOf = scheduledAt => String(scheduledAt ?? '').slice(11, 16);
export const minutesOf = time => {
    const [hours, minutes] = String(time).split(':').map(Number);
    return hours * 60 + (minutes || 0);
};
export const clock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export function ageOf(birthDate, today = new Date()) {
    if (!birthDate)
        return null;
    const date = parseDate(birthDate);
    let age = today.getFullYear() - date.getFullYear();
    if (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate()))
        age -= 1;
    return age;
}

export function maskCpf(value) {
    const d = digits(value).slice(0, 11);
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}
export function maskCnpj(value) {
    const d = digits(value).slice(0, 14);
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}
export function maskPhone(value) {
    const d = digits(value).slice(0, 11);
    if (d.length <= 2)
        return d.length ? `(${d}` : '';
    if (d.length <= 6)
        return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10)
        return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export function maskCep(value) {
    const d = digits(value).slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function initials(name) {
    const parts = String(name ?? '').replace(/^(Dra?\.?)\s+/i, '').split(/\s+/).filter(Boolean);
    if (!parts.length)
        return '?';
    return (parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
}
export function firstName(name) {
    const parts = String(name ?? '').split(/\s+/).filter(Boolean);
    return /^Dra?\.?$/i.test(parts[0] ?? '') ? parts.slice(0, 2).join(' ') : parts[0] ?? '';
}
export function normalizeText(value) {
    return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Link do WhatsApp com DDI do Brasil quando o número tem DDD.
export function whatsappLink(phone, text = '') {
    const d = digits(phone);
    if (d.length < 10)
        return null;
    const number = d.length <= 11 ? `55${d}` : d;
    return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
export const telLink = phone => (digits(phone).length >= 8 ? `tel:+55${digits(phone)}` : null);
