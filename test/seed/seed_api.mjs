// Povoa uma API local vazia com dados fictícios, usando somente as rotas públicas da API.
// Pré-requisito: um usuário DENTISTA já existente (o backend ainda não tem fluxo para o primeiro acesso).
// Uso: node test/seed/seed_api.mjs [baseUrl] [login] [senha]
const [base = 'http://localhost:8080/dentalflow-api/v1', login = 'ana', password = 'senha123'] = process.argv.slice(2);
const auth = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;

async function call(method, path, body) {
    const response = await fetch(`${base}${path}`, { method, headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    const json = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${json?.code ?? ''} ${json?.message ?? text}`);
    return json.data;
}

const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const me = await call('GET', '/auth/me');
const clinicId = me.clinicId;

const dentists = [await call('GET', `/dentist/${me.dentistId}`)];
for (const input of [
    { name: 'Dr. Bruno Reis', cro: 'CRO-SP-23456', specialty: 'Clínico geral', phone: '11999990002' },
    { name: 'Dra. Júlia Costa', cro: 'CRO-SP-34567', specialty: 'Endodontia', phone: '11999990003' },
]) dentists.push(await call('POST', '/dentist', { clinicId, ...input }));

const procedures = [];
for (const [name, price, durationMinutes] of [
    ['Avaliação', 120, 30], ['Limpeza', 180, 60], ['Restauração', 250, 45], ['Manutenção do aparelho', 150, 30],
    ['Tratamento de canal', 900, 90], ['Clareamento', 700, 60], ['Extração', 300, 45],
]) procedures.push(await call('POST', '/procedure', { clinicId, name, price, durationMinutes }));
const procedure = name => procedures.find(p => p.name === name);

const patientInputs = [
    ['Ana Clara Mendes', '2010-03-14', 'Centro'], ['Beatriz Rocha', '1985-07-02', 'Vila Mariana'], ['Camila Duarte', '1997-11-21', 'Pinheiros'],
    ['Fernanda Alves', '2003-01-09', 'Centro'], ['Gabriel Souza', '1989-05-30', 'Mooca'], ['João Pedro Santos', '1974-09-12', 'Tatuapé'],
    ['Lucas Ferreira', '1995-02-17', 'Centro'], ['Maria Oliveira', '1990-05-20', 'Bela Vista'], ['Patrícia Gomes', '1981-12-03', 'Moema'],
    ['Renata Barros', '1993-08-25', 'Santana'], ['Roberto Nunes', '1968-04-11', 'Lapa'], ['Sônia Martins', '1959-10-06', 'Perdizes'],
    ['Thiago Lima', '2001-06-15', 'Centro'], ['Vinícius Prado', '1987-03-28', 'Butantã'], ['Helena Prado', '1978-01-19', 'Moema'],
    ['Otávio Ramos', '1999-09-09', 'Ipiranga'], ['Lívia Castro', '2005-12-12', 'Centro'], ['Marcos Teixeira', '1972-07-07', 'Saúde'],
];
const patients = [];
for (const [index, [name, birthDate, neighborhood]] of patientInputs.entries()) {
    const n = String(index + 10).padStart(3, '0');
    patients.push(await call('POST', '/patient', {
        clinicId, name, cpf: `${n}.${n}.${n}-${String(index).padStart(2, '0')}`, address: `Rua das Acácias, ${100 + index}`, neighborhood,
        zipCode: `01${String(index).padStart(3, '0')}-000`, phone: `119${String(98000000 + index * 1371).slice(0, 8)}`, email: `${name.split(' ')[0].toLowerCase()}@email.com`, birthDate,
    }));
}
const patient = name => patients.find(p => p.name === name);

// Semana corrente (segunda a sábado) com consultas de manhã e à tarde para os três dentistas.
const today = new Date();
const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
const plan = [
    [0, 'Dra. Ana Lima', '08:00', 'Maria Oliveira', 'Manutenção do aparelho'], [0, 'Dr. Bruno Reis', '09:00', 'Roberto Nunes', 'Limpeza'], [0, 'Dra. Júlia Costa', '10:00', 'Beatriz Rocha', 'Tratamento de canal'],
    [0, 'Dra. Ana Lima', '14:00', 'Lívia Castro', 'Avaliação'], [1, 'Dr. Bruno Reis', '08:30', 'Helena Prado', 'Restauração'], [1, 'Dra. Ana Lima', '09:00', 'Otávio Ramos', 'Manutenção do aparelho'],
    [1, 'Dra. Júlia Costa', '11:00', 'Camila Duarte', 'Clareamento'], [1, 'Dr. Bruno Reis', '15:00', 'Marcos Teixeira', 'Extração'],
    [2, 'Dra. Ana Lima', '08:00', 'Maria Oliveira', 'Avaliação'], [2, 'Dr. Bruno Reis', '08:30', 'João Pedro Santos', 'Avaliação'], [2, 'Dra. Ana Lima', '09:00', 'Fernanda Alves', 'Manutenção do aparelho'],
    [2, 'Dr. Bruno Reis', '09:15', 'Lucas Ferreira', 'Restauração'], [2, 'Dra. Júlia Costa', '09:30', 'Beatriz Rocha', 'Tratamento de canal'], [2, 'Dra. Ana Lima', '10:00', 'Ana Clara Mendes', 'Manutenção do aparelho', 'Prefere atendimento pela manhã. Vem com a mãe.'],
    [2, 'Dr. Bruno Reis', '10:15', 'Roberto Nunes', 'Limpeza'], [2, 'Dra. Ana Lima', '10:30', 'Gabriel Souza', 'Avaliação'], [2, 'Dra. Júlia Costa', '11:15', 'Patrícia Gomes', 'Clareamento'],
    [2, 'Dr. Bruno Reis', '11:30', 'Vinícius Prado', 'Restauração'], [2, 'Dr. Bruno Reis', '14:00', 'Sônia Martins', 'Restauração'], [2, 'Dra. Ana Lima', '14:00', 'Thiago Lima', 'Avaliação'],
    [2, 'Dra. Júlia Costa', '14:30', 'Camila Duarte', 'Tratamento de canal'], [2, 'Dra. Ana Lima', '15:00', 'Renata Barros', 'Limpeza'],
    [3, 'Dra. Ana Lima', '08:30', 'Helena Prado', 'Avaliação'], [3, 'Dr. Bruno Reis', '09:00', 'Marcos Teixeira', 'Limpeza'], [3, 'Dra. Júlia Costa', '10:00', 'Otávio Ramos', 'Tratamento de canal'],
    [3, 'Dra. Ana Lima', '13:30', 'Lívia Castro', 'Manutenção do aparelho'], [4, 'Dr. Bruno Reis', '08:00', 'Thiago Lima', 'Restauração'], [4, 'Dra. Ana Lima', '09:30', 'Gabriel Souza', 'Manutenção do aparelho'],
    [4, 'Dra. Júlia Costa', '11:00', 'Renata Barros', 'Clareamento'], [5, 'Dra. Ana Lima', '08:00', 'Fernanda Alves', 'Avaliação'], [5, 'Dr. Bruno Reis', '09:00', 'João Pedro Santos', 'Limpeza'],
];
const todayIndex = (today.getDay() + 6) % 7;
let created = 0;
for (const [day, dentistName, time, patientName, procedureName, notes = null] of plan) {
    const date = new Date(monday); date.setDate(monday.getDate() + day);
    const appointment = await call('POST', '/appointment', {
        clinicId, patientId: patient(patientName).id, dentistId: dentists.find(d => d.name === dentistName).id, procedureId: procedure(procedureName).id,
        userId: me.id, scheduledAt: `${iso(date)}T${time}:00`, status: 'AGENDADO', notes,
    });
    created += 1;
    const minutesOfDay = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const past = day < todayIndex || (day === todayIndex && minutesOfDay + 60 < nowMinutes);
    const status = past ? (patientName === 'Fernanda Alves' ? 'FALTOU' : patientName === 'Sônia Martins' ? 'CANCELADO' : 'CONCLUIDO')
        : day === todayIndex && minutesOfDay <= nowMinutes ? 'EM_ATENDIMENTO'
        : (created % 3 === 0 ? 'AGENDADO' : 'CONFIRMADO');
    if (status === 'AGENDADO') continue;
    const path = ['CONCLUIDO', 'EM_ATENDIMENTO'].includes(status) ? ['CONFIRMADO', 'EM_ATENDIMENTO', status] : [status];
    for (const step of [...new Set(path)]) await call('PATCH', `/appointment/${appointment.id}/status?status=${step}`);
}

await call('POST', '/user', { name: 'Carla Souza', login: 'carla', password: 'senha123', clinicId, dentistId: null, accessLevel: 'RECEPCIONISTA', active: true });

for (const [name, unit, unitCost, initialStock, minimumStock] of [
    ['Luva de procedimento', 'CAIXA', 25.9, 12, 4], ['Máscara descartável', 'CAIXA', 18.5, 2, 3], ['Resina composta A2', 'SERINGA', 89.9, 6, 2],
    ['Anestésico lidocaína', 'TUBETE', 3.2, 80, 30], ['Sugador descartável', 'PACOTE', 12.0, 1, 2],
]) await call('POST', '/inventory/products', { name, unit, unitCost, initialStock, minimumStock, active: true });
for (const [name, description, acquisitionValue, usefulLifeUses, completedUses] of [
    ['Raio X digital', 'Sala 2', 30000, 15000, 1240], ['Autoclave 21 L', 'Esterilização', 8500, 6000, 2310], ['Fotopolimerizador LED', 'Sala 1', 1200, 4000, 950],
]) await call('POST', '/inventory/equipment', { name, description, acquisitionValue, usefulLifeUses, completedUses, active: true });

// Mapa do dia anterior da Dra. Ana, para alimentar o painel.
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
await call('POST', '/daily-map', {
    date: iso(yesterday), cardDiscount: 12, predatedCheckDiscount: 0, cashCheckDiscount: 0, otherDiscount: 0,
    moldingCount: 1, biteCount: 0, fittingCount: 0, deliveryCount: 0, repetitionCount: 0, notes: 'Movimento normal',
    visits: [
        { appointmentId: null, patientId: patient('Otávio Ramos').id, procedureId: procedure('Manutenção do aparelho').id, lineNumber: 1, recordNumber: 'F-101', patientName: 'Otávio Ramos', scheduledTime: '09:00:00', entryTime: '08:57:00', exitTime: '09:31:00', returnTime: null, paymentCode: 'PIX', value: 150, type: 'CLINICO', checked: true },
        { appointmentId: null, patientId: patient('Lívia Castro').id, procedureId: procedure('Avaliação').id, lineNumber: 2, recordNumber: 'F-102', patientName: 'Lívia Castro', scheduledTime: '14:00:00', entryTime: '14:05:00', exitTime: '14:32:00', returnTime: null, paymentCode: 'CARTAO', value: 120, type: 'CLINICO', checked: true },
    ],
    vouchers: [], expenses: [{ description: 'Material de limpeza', value: 35 }], teamSchedules: [],
});

console.log(JSON.stringify({ dentists: dentists.length, procedures: procedures.length, patients: patients.length, appointments: created }));
