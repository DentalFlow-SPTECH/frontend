// Acrescenta um histórico pequeno à API local, depois de seed_api.mjs: pacientes, semana anterior atendida,
// próxima semana agendada, mapas do dia de outubro (alimentam o painel) e movimentações de estoque.
// Usa somente rotas públicas da API e pode ser repetido: pula o que já existe.
// Uso: node test/seed/seed_history.mjs [baseUrl] [login] [senha]
const [base = 'http://localhost:8080/dentalflow-api/v1', login = 'ana', password = 'senha123'] = process.argv.slice(2);
const auth = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
async function call(method, path, body) {
    const response = await fetch(`${base}${path}`, { method, headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    const json = text ? JSON.parse(text) : null;
    if (!response.ok)
        throw new Error(`${method} ${path} → ${response.status} ${json?.code ?? ''} ${json?.message ?? text}`);
    return json.data;
}
const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
let seed = 42;
const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const pick = list => list[Math.floor(random() * list.length)];

const me = await call('GET', '/auth/me');
const clinicId = me.clinicId;
const dentists = await call('GET', `/dentist?clinicId=${clinicId}`);
const procedures = await call('GET', `/procedure?clinicId=${clinicId}`);
let patients = await call('GET', `/patient?clinicId=${clinicId}`);
const created = { patients: 0, appointments: 0, maps: 0, closedMaps: 0, movements: 0 };

const newPatients = [
    ['Adriana Bezerra', '1983-02-11', 'Vila Mariana'], ['Bruno Henrique Lopes', '1996-07-23', 'Centro'], ['Cecília Andrade', '2012-04-30', 'Moema'],
    ['Daniel Fonseca', '1979-11-02', 'Pinheiros'], ['Eduarda Vasconcelos', '2001-09-14', 'Santana'], ['Fábio Nascimento', '1965-03-08', 'Tatuapé'],
    ['Giovana Ribeiro', '1992-12-19', 'Centro'], ['Heitor Cardoso', '2015-06-05', 'Mooca'], ['Isadora Monteiro', '1988-08-27', 'Perdizes'], ['Jonas Albuquerque', '1970-01-15', 'Lapa'],
];
for (const [index, [name, birthDate, neighborhood]] of newPatients.entries()) {
    if (patients.some(patient => patient.name === name))
        continue;
    const n = String(300 + index);
    await call('POST', '/patient', {
        clinicId, name, cpf: `${n}.${n}.${n}-${String(index + 10).slice(-2)}`, address: `Avenida Paulista, ${1000 + index * 15}`, neighborhood,
        zipCode: `013${String(index).padStart(2, '0')}-100`, phone: `1197${String(1000000 + index * 7919).slice(0, 7)}`, email: null, birthDate,
    });
    created.patients += 1;
}
patients = await call('GET', `/patient?clinicId=${clinicId}`);

// Especialidade orienta os procedimentos de cada dentista.
const byDentist = {
    Ortodontia: ['Manutenção do aparelho', 'Avaliação'], Endodontia: ['Tratamento de canal', 'Avaliação', 'Clareamento'],
};
const proceduresOf = dentist => (byDentist[dentist.specialty] ?? ['Limpeza', 'Restauração', 'Avaliação', 'Extração']).map(name => procedures.find(item => item.name === name)).filter(Boolean);
const times = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

async function schedule(date, finalStatusOf) {
    const day = iso(date);
    const existing = await call('GET', `/appointment?date=${day}`);
    if (existing.length)
        return;
    for (const dentist of dentists) {
        const count = date.getDay() === 6 ? 1 : 2;
        const slots = [...times].sort(() => random() - .5).slice(0, count).sort();
        for (const time of slots) {
            const appointment = await call('POST', '/appointment', {
                clinicId, patientId: pick(patients).id, dentistId: dentist.id, procedureId: pick(proceduresOf(dentist)).id,
                userId: me.id, scheduledAt: `${day}T${time}:00`, status: 'AGENDADO', notes: null,
            });
            created.appointments += 1;
            const status = finalStatusOf();
            const path = status === 'CONCLUIDO' ? ['CONFIRMADO', 'EM_ATENDIMENTO', 'CONCLUIDO'] : status === 'AGENDADO' ? [] : [status];
            for (const step of path)
                await call('PATCH', `/appointment/${appointment.id}/status?status=${step}`);
        }
    }
}

const today = new Date();
today.setHours(0, 0, 0, 0);
const monday = addDays(today, -((today.getDay() + 6) % 7));
for (let day = 0; day < 6; day += 1) {
    await schedule(addDays(monday, day - 7), () => { const roll = random(); return roll < .1 ? 'FALTOU' : roll < .16 ? 'CANCELADO' : 'CONCLUIDO'; });
    await schedule(addDays(monday, day + 7), () => (random() < .45 ? 'CONFIRMADO' : 'AGENDADO'));
}

// Mapas do dia do usuário autenticado (a API usa o dentista da autenticação), nos dias úteis já passados do mês.
const first = new Date(today.getFullYear(), today.getMonth(), 1);
const maps = await call('GET', `/daily-map?start=${iso(first)}&end=${iso(today)}`);
const mapDates = [];
for (let date = new Date(first); date < today; date = addDays(date, 1))
    if (date.getDay() !== 0 && !maps.some(map => map.date === iso(date)) && random() < .55)
        mapDates.push(new Date(date));
const payments = ['PIX', 'PIX', 'CARTAO', 'CARTAO', 'DINHEIRO', 'CONVENIO'];
const myProcedures = proceduresOf(dentists.find(dentist => dentist.id === me.dentistId) ?? dentists[0]);
for (const date of mapDates) {
    const recent = (today - date) / 86400000 <= 3;
    const visits = Array.from({ length: date.getDay() === 6 ? 2 : 3 + Math.floor(random() * 3) }, (_, index) => {
        const procedure = pick(myProcedures);
        const hour = 8 + index;
        return {
            appointmentId: null, patientId: pick(patients).id, procedureId: procedure.id, lineNumber: index + 1, recordNumber: `F-${200 + Math.floor(random() * 700)}`,
            patientName: pick(patients).name, scheduledTime: `${String(hour).padStart(2, '0')}:00:00`, entryTime: `${String(hour).padStart(2, '0')}:0${Math.floor(random() * 9)}:00`,
            exitTime: `${String(hour).padStart(2, '0')}:4${Math.floor(random() * 9)}:00`, returnTime: null, paymentCode: pick(payments),
            value: Math.round((procedure.price ?? 150) * (random() < .2 ? .9 : 1)), type: random() < .15 ? 'PROTESE' : 'CLINICO', checked: !recent || random() < .5,
        };
    });
    const map = await call('POST', '/daily-map', {
        date: iso(date), cardDiscount: visits.filter(visit => visit.paymentCode === 'CARTAO').length * 6, predatedCheckDiscount: 0, cashCheckDiscount: 0, otherDiscount: random() < .2 ? 15 : 0,
        moldingCount: Math.floor(random() * 2), biteCount: random() < .3 ? 1 : 0, fittingCount: random() < .3 ? 1 : 0, deliveryCount: random() < .2 ? 1 : 0, repetitionCount: random() < .1 ? 1 : 0,
        notes: random() < .3 ? 'Dia tranquilo.' : null, visits,
        vouchers: random() < .25 ? [{ responsibleName: 'Carla Souza', recordNumber: null, value: 20, description: 'Vale transporte', checked: !recent }] : [],
        expenses: random() < .5 ? [{ description: pick(['Material de limpeza', 'Café e copos', 'Manutenção do compressor', 'Correios']), value: 15 + Math.floor(random() * 60) }] : [],
        teamSchedules: [],
    });
    created.maps += 1;
    if (!recent) {
        await call('PATCH', `/daily-map/${map.id}/close`);
        created.closedMaps += 1;
    }
}

// Movimentações de estoque: uso nos atendimentos e reposição.
const products = await call('GET', '/inventory/products');
for (const [name, type, quantity, reason] of [
    ['Luva de procedimento', 'SAIDA', 2, 'Uso nos atendimentos da semana'], ['Anestésico lidocaína', 'SAIDA', 18, 'Uso nos atendimentos da semana'],
    ['Resina composta A2', 'SAIDA', 1, 'Restaurações'], ['Máscara descartável', 'ENTRADA', 6, 'Compra do fornecedor'], ['Luva de procedimento', 'ENTRADA', 4, 'Compra do fornecedor'],
]) {
    const product = products.find(item => item.name === name);
    if (!product || (type === 'SAIDA' && Number(product.currentStock) < quantity))
        continue;
    await call('POST', `/inventory/products/${product.id}/movements`, { type, quantity, reason });
    created.movements += 1;
}

console.log(JSON.stringify(created));
