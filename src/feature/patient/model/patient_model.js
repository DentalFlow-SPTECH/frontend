import { ageOf, digits, isoDate, maskCep, maskCpf, maskPhone, normalizeText } from '../../../component/format.js';

// Regras do guia (seção 10): nome, CPF, endereço, bairro e CEP obrigatórios; nascimento não pode ser futuro.
export const emptyPatientForm = () => ({ name: '', cpf: '', birthDate: '', phone: '', email: '', zipCode: '', address: '', neighborhood: '' });

export function formFromPatient(patient) {
    return {
        name: patient.name ?? '', cpf: maskCpf(patient.cpf), birthDate: patient.birthDate ?? '', phone: maskPhone(patient.phone),
        email: patient.email ?? '', zipCode: maskCep(patient.zipCode), address: patient.address ?? '', neighborhood: patient.neighborhood ?? '',
    };
}

export function validatePatient(form, today = isoDate(new Date())) {
    const errors = {};
    if (!form.name.trim())
        errors.name = 'Informe o nome completo.';
    else if (form.name.trim().length > 100)
        errors.name = 'Use no máximo 100 caracteres.';
    if (digits(form.cpf).length !== 11)
        errors.cpf = 'O CPF tem 11 números.';
    if (form.birthDate && form.birthDate > today)
        errors.birthDate = 'A data de nascimento não pode ser no futuro.';
    if (form.phone && digits(form.phone).length < 10)
        errors.phone = 'Informe o DDD e o número.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
        errors.email = 'Confira o e-mail.';
    else if (form.email.length > 100)
        errors.email = 'Use no máximo 100 caracteres.';
    if (digits(form.zipCode).length !== 8)
        errors.zipCode = 'O CEP tem 8 números.';
    if (!form.address.trim())
        errors.address = 'Informe a rua e o número.';
    else if (form.address.length > 150)
        errors.address = 'Use no máximo 150 caracteres.';
    if (!form.neighborhood.trim())
        errors.neighborhood = 'Informe o bairro.';
    else if (form.neighborhood.length > 80)
        errors.neighborhood = 'Use no máximo 80 caracteres.';
    return errors;
}

// Campo do formulário a destacar quando a API recusa por regra de negócio (BSN001).
export function fieldFromApiMessage(message) {
    const text = normalizeText(message);
    if (text.includes('cpf'))
        return 'cpf';
    if (text.includes('nascimento'))
        return 'birthDate';
    if (text.includes('e-mail') || text.includes('email'))
        return 'email';
    return null;
}

export function toPatientPayload(form, clinicId) {
    return {
        clinicId, name: form.name.trim(), cpf: maskCpf(form.cpf), address: form.address.trim(), neighborhood: form.neighborhood.trim(),
        zipCode: maskCep(form.zipCode), phone: digits(form.phone) || null, email: form.email.trim() || null, birthDate: form.birthDate || null,
    };
}

export function searchPatients(patients, term) {
    const text = normalizeText(term);
    const number = digits(term);
    const sorted = [...patients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (!text)
        return sorted;
    return sorted.filter(patient => normalizeText(patient.name).includes(text)
        || (number.length >= 3 && (digits(patient.cpf).includes(number) || digits(patient.phone).includes(number))));
}

export function groupByLetter(patients) {
    const groups = [];
    for (const patient of patients) {
        const letter = normalizeText(patient.name).charAt(0).toUpperCase() || '#';
        if (groups.at(-1)?.letter !== letter)
            groups.push({ letter, items: [] });
        groups.at(-1).items.push(patient);
    }
    return groups;
}

export const patientSummary = patient => [patient.neighborhood, ageOf(patient.birthDate) !== null && `${ageOf(patient.birthDate)} anos`].filter(Boolean).join(' · ');
