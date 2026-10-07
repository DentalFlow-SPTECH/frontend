const uid = () => crypto.randomUUID();
export function saveDoctorModel(current, input, id) {
    const existing = id ? current.doctors.find(value => value.id === id) : undefined;
    if (id && !existing)
        throw new Error('Este doutor não está disponível. Seu preenchimento foi mantido.');
    if (!input.name.trim())
        throw new Error('Informe o nome do doutor.');
    if (existing && Object.keys(input).every(key => input[key] === (existing[key] ?? '')))
        return { value: existing };
    const doctor = { ...existing, ...input, name: input.name.trim(), id: existing?.id ?? uid(), history: [...(existing?.history ?? []), { id: uid(), date: new Date().toISOString(), actor: 'Você', description: existing ? 'Cadastro do doutor atualizado.' : 'Doutor cadastrado.' }] };
    const change = { data: { ...current, doctors: existing ? current.doctors.map(value => value.id === doctor.id ? doctor : value) : [...current.doctors, doctor] }, action: existing ? 'Doutor atualizado' : 'Doutor cadastrado', record: doctor.name, recordPath: `/doutores/${doctor.id}` };
    return { ...change, value: doctor };
}
export const emptyDoctor = { name: '', cpf: '', cro: '', specialty: '', phone: '', email: '', status: '' };
export const labels = { name: 'Nome completo', cpf: 'CPF', cro: 'CRO', specialty: 'Especialidade', phone: 'Telefone', email: 'E-mail', status: 'Status profissional' };
export const fields = Object.keys(emptyDoctor);
