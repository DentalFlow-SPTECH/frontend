import { digits, maskCep, maskCnpj, maskPhone } from '../../../component/format.js';
import { composeClinicAddress, splitClinicAddress } from '../../../component/address.js';

const max = (value, size, message) => (value.trim().length > size ? message ?? `Use no máximo ${size} caracteres.` : undefined);
const clean = errors => Object.fromEntries(Object.entries(errors).filter(([, value]) => value));

// A API da clínica tem um campo de endereço só: o formulário separa as partes (para o CEP preencher) e junta ao salvar.
const emptyAddress = { zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
export const emptyClinicForm = () => ({ name: '', cnpj: '', phone: '', ...emptyAddress });
export function formFromClinic(clinic) {
    const address = splitClinicAddress(clinic.address);
    return { name: clinic.name ?? '', cnpj: maskCnpj(clinic.cnpj), phone: maskPhone(clinic.phone), ...address, zipCode: maskCep(address.zipCode) };
}
export function validateClinic(form) {
    return clean({
        name: !form.name.trim() ? 'Informe o nome da clínica.' : max(form.name, 100),
        cnpj: form.cnpj && digits(form.cnpj).length !== 14 ? 'O CNPJ tem 14 números.' : undefined,
        zipCode: form.zipCode && digits(form.zipCode).length !== 8 ? 'O CEP tem 8 números.' : undefined,
        street: composeClinicAddress(form).length > 150 ? 'O endereço completo passa de 150 caracteres. Abrevie alguma parte.' : undefined,
        state: form.state && !/^[A-Za-z]{2}$/.test(form.state.trim()) ? 'Use a sigla do estado (ex.: SP).' : undefined,
        phone: form.phone && digits(form.phone).length < 10 ? 'Informe o DDD e o número.' : undefined,
    });
}
export const toClinicPayload = form => ({ name: form.name.trim(), cnpj: form.cnpj ? maskCnpj(form.cnpj) : null, address: composeClinicAddress(form) || null, phone: digits(form.phone) || null });

export const emptyDentistForm = () => ({ name: '', cro: '', specialty: '', phone: '' });
export const formFromDentist = dentist => ({ name: dentist.name ?? '', cro: dentist.cro ?? '', specialty: dentist.specialty ?? '', phone: maskPhone(dentist.phone) });
export function validateDentist(form) {
    return clean({
        name: !form.name.trim() ? 'Informe o nome.' : max(form.name, 100),
        cro: !form.cro.trim() ? 'Informe o CRO.' : max(form.cro, 20),
        specialty: max(form.specialty, 50),
        phone: form.phone && digits(form.phone).length < 10 ? 'Informe o DDD e o número.' : undefined,
    });
}
export const toDentistPayload = (form, clinicId) => ({ clinicId, name: form.name.trim(), cro: form.cro.trim().toUpperCase(), specialty: form.specialty.trim() || null, phone: digits(form.phone) || null });

export const emptyProcedureForm = () => ({ name: '', price: '', durationMinutes: '' });
export const formFromProcedure = procedure => ({ name: procedure.name ?? '', price: procedure.price === null || procedure.price === undefined ? '' : String(procedure.price).replace('.', ','), durationMinutes: procedure.durationMinutes ? String(procedure.durationMinutes) : '' });
export const parseMoney = value => {
    const text = String(value ?? '').trim().replace(/\s|R\$/g, '');
    if (!text)
        return null;
    const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
    const number = Number(normalized);
    return Number.isFinite(number) ? Math.round(number * 100) / 100 : NaN;
};
export function validateProcedure(form) {
    const price = parseMoney(form.price);
    const duration = form.durationMinutes === '' ? null : Number(form.durationMinutes);
    return clean({
        name: !form.name.trim() ? 'Informe o nome do procedimento.' : max(form.name, 100),
        price: Number.isNaN(price) ? 'Use um valor como 180,00.' : price !== null && price < 0 ? 'O valor não pode ser negativo.' : undefined,
        durationMinutes: duration !== null && (!Number.isInteger(duration) || duration <= 0) ? 'Informe os minutos (maior que zero).' : undefined,
    });
}
export const toProcedurePayload = (form, clinicId) => ({ clinicId, name: form.name.trim(), price: parseMoney(form.price), durationMinutes: form.durationMinutes === '' ? null : Number(form.durationMinutes) });

export const emptyUserForm = () => ({ name: '', login: '', password: '', accessLevel: 'RECEPCIONISTA', dentistId: '' });
export function validateUser(form) {
    return clean({
        name: !form.name.trim() ? 'Informe o nome.' : max(form.name, 100),
        login: !form.login.trim() ? 'Escolha um usuário para entrar.' : /\s/.test(form.login.trim()) ? 'Não use espaços no usuário.' : max(form.login, 50),
        password: form.password.length < 6 ? 'A senha precisa ter pelo menos 6 caracteres.' : undefined,
        dentistId: form.accessLevel === 'DENTISTA' && !form.dentistId ? 'Escolha o dentista ligado a este acesso.' : undefined,
    });
}
export const toUserPayload = (form, clinicId) => ({
    name: form.name.trim(), login: form.login.trim().toLowerCase(), password: form.password, clinicId,
    dentistId: form.accessLevel === 'DENTISTA' ? Number(form.dentistId) : null, accessLevel: form.accessLevel, active: true,
});
