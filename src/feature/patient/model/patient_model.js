// Domain operations return an atomic change; they never persist or publish state.
import { emptyPatientInput, patientFieldLabels } from '../../../demo/patient.js';
import { normalize } from '../../../demo/format.js';
export function createPatientInput(patient) {
    return Object.fromEntries(Object.keys(emptyPatientInput).map(key => [key, patient?.[key] ?? '']));
}
export function matchesPatient(patient, query) {
    const textMatch = normalize(`${patient.name} ${patient.code} ${patient.cpf} ${patient.phone} ${patient.mobile}`).includes(normalize(query));
    const digits = query.replace(/\D/g, '');
    return textMatch || (/^[\d\s().+\-]+$/.test(query) && digits.length > 0 && [patient.cpf, patient.phone, patient.mobile].some(value => value.replace(/\D/g, '').includes(digits)));
}
const uid = () => crypto.randomUUID();
export function savePatientModel(current, input, id) {
    const existing = id ? current.patients.find(patient => patient.id === id) : undefined;
    if (id && !existing)
        throw new Error('Este paciente não está disponível. Seu preenchimento foi mantido.');
    if (!input.name.trim())
        throw new Error('Informe o nome completo do paciente.');
    const changed = Object.keys(emptyPatientInput).filter(key => input[key] !== existing?.[key]);
    if (existing && !changed.length)
        return { value: existing };
    let sequence = current.patients.length + 1;
    while (current.patients.some(patient => patient.code === `PAC-${String(sequence).padStart(3, '0')}`))
        sequence += 1;
    const patient = {
        ...existing, ...input, name: input.name.trim(), id: existing?.id ?? uid(), code: existing?.code ?? `PAC-${String(sequence).padStart(3, '0')}`,
        history: [...(existing?.history ?? []), { id: uid(), date: new Date().toISOString(), actor: 'Você', description: existing ? `Dados cadastrais atualizados: ${changed.map(key => patientFieldLabels[key]).join(', ')}.` : 'Cadastro criado.' }],
    };
    const change = { data: { ...current, patients: existing ? current.patients.map(value => value.id === existing.id ? patient : value) : [...current.patients, patient] }, action: existing ? 'Paciente atualizado' : 'Paciente cadastrado', record: patient.code, recordPath: `/pacientes/${patient.id}` };
    return { ...change, value: patient };
}
