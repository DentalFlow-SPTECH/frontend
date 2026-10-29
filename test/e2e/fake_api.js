// API falsa para os testes de interface: segue o contrato do guia de integração (respostas, erros, perfis),
// sem precisar de backend. Os testes contra a API real ficam em real_api.spec.js (E2E_REAL_API=1).
export const today = '2026-10-28';
export const now = new Date(2026, 9, 28, 9, 40);

const users = [
    { id: 7, clinicId: 1, dentistId: 3, name: 'Dra. Ana Lima', login: 'ana', password: 'senha123', accessLevel: 'DENTISTA' },
    { id: 8, clinicId: 1, dentistId: null, name: 'Carla Souza', login: 'carla', password: 'senha123', accessLevel: 'RECEPCIONISTA' },
];

function seed() {
    const dentists = [
        { id: 3, clinicId: 1, name: 'Dra. Ana Lima', cro: 'CRO-SP-12345', specialty: 'Ortodontia', phone: '11999990001' },
        { id: 4, clinicId: 1, name: 'Dr. Bruno Reis', cro: 'CRO-SP-23456', specialty: 'Clínico geral', phone: '11999990002' },
        { id: 5, clinicId: 1, name: 'Dra. Júlia Costa', cro: 'CRO-SP-34567', specialty: 'Endodontia', phone: null },
    ];
    const procedures = [
        { id: 1, clinicId: 1, name: 'Avaliação', price: 120, durationMinutes: 30 },
        { id: 2, clinicId: 1, name: 'Limpeza', price: 180, durationMinutes: 60 },
        { id: 3, clinicId: 1, name: 'Restauração', price: 250, durationMinutes: 45 },
        { id: 4, clinicId: 1, name: 'Manutenção do aparelho', price: 150, durationMinutes: 30 },
        { id: 5, clinicId: 1, name: 'Tratamento de canal', price: 900, durationMinutes: 90 },
    ];
    const names = ['Ana Clara Mendes', 'Beatriz Rocha', 'Camila Duarte', 'Fernanda Alves', 'Gabriel Souza', 'João Pedro Santos', 'Lucas Ferreira', 'Maria Oliveira', 'Roberto Nunes', 'Sônia Martins'];
    const patients = names.map((name, index) => ({
        id: index + 1, clinicId: 1, name, cpf: `${String(index + 100).padStart(3, '0')}.111.222-${String(index).padStart(2, '0')}`, address: `Rua das Acácias, ${100 + index}`,
        neighborhood: index % 2 ? 'Centro' : 'Moema', zipCode: '01234-567', phone: `11988880${String(index).padStart(3, '0')}`, email: null, birthDate: `19${80 + index}-05-20`,
    }));
    const appointment = (id, time, patientId, dentistId, procedureId, status, date = today, notes = null) => ({ id, clinicId: 1, patientId, dentistId, procedureId, userId: 7, scheduledAt: `${date}T${time}:00`, status, notes });
    const appointments = [
        appointment(101, '08:00', 8, 3, 2, 'CONCLUIDO'), appointment(102, '08:30', 6, 4, 1, 'CONCLUIDO'), appointment(103, '09:00', 4, 3, 4, 'FALTOU'),
        appointment(104, '09:15', 7, 4, 3, 'EM_ATENDIMENTO'), appointment(105, '09:30', 2, 5, 5, 'EM_ATENDIMENTO'),
        appointment(106, '10:00', 1, 3, 4, 'CONFIRMADO', today, 'Prefere atendimento pela manhã.'), appointment(107, '10:15', 9, 4, 2, 'AGENDADO'),
        appointment(108, '10:30', 5, 3, 1, 'AGENDADO'), appointment(109, '14:00', 10, 4, 3, 'CANCELADO'), appointment(110, '14:30', 3, 5, 5, 'CONFIRMADO'),
        appointment(111, '09:00', 8, 3, 4, 'CONFIRMADO', '2026-10-29'), appointment(112, '11:00', 2, 5, 1, 'AGENDADO', '2026-10-30'),
    ];
    return {
        clinic: { id: 1, name: 'Clínica Sorriso Centro', cnpj: '12.345.678/0001-99', address: 'Rua das Flores, 100', phone: '1133334444' },
        dentists, procedures, patients, appointments,
        products: [
            { id: 1, clinicId: 1, name: 'Luva de procedimento', unit: 'CAIXA', unitCost: 25.9, currentStock: 12, minimumStock: 4, lowStock: false, active: true },
            { id: 2, clinicId: 1, name: 'Máscara descartável', unit: 'CAIXA', unitCost: 18.5, currentStock: 2, minimumStock: 3, lowStock: true, active: true },
        ],
        movements: { 1: [{ id: 1, productId: 1, userId: 7, type: 'AJUSTE', quantity: 12, unitCostAtTime: 25.9, reason: 'Estoque inicial', occurredAt: '2026-10-20T10:00:00' }], 2: [] },
        equipment: [{ id: 1, clinicId: 1, name: 'Autoclave 21 L', description: 'Esterilização', acquisitionValue: 8500, usefulLifeUses: 6000, completedUses: 2310, costPerUse: 1.4167, active: true }],
        dailyMaps: [],
        createdUsers: [],
        nextId: 500,
    };
}

const dashboard = (dentistId = null) => ({
    year: 2026, month: 10, clinicId: 1, dentistId,
    summary: { registeredMapDays: 3, clinicalTotal: 1450, prosthesisTotal: 0, clinicalGross: 1450, pediatricSurgeryGross: 0, generalGross: 1450, totalExpenses: 120, cardDiscount: 30, predatedCheckDiscount: 0, cashCheckDiscount: 0, voucherDiscount: 0, otherDiscount: 0, totalDiscounts: 30, totalOutflows: 150, netTotal: 1420, finalBalance: 1300, patientCount: 9, moldingCount: 2, biteCount: 1, fittingCount: 0, deliveryCount: 1, repetitionCount: 0 },
    kpis: { operatingDays: 3, averageTicket: 161.11, averageDailyRevenue: 483.33, expenseRate: 8.28, discountRate: 2.07, outflowRate: 10.34, netMargin: 89.66, repetitionRate: 0, completionRate: 70, noShowRate: 12.5 },
    appointmentFunnel: { total: 40, scheduled: 4, confirmed: 3, inProgress: 1, completed: 25, cancelled: 2, noShow: 5, completionRate: 62.5, cancellationRate: 5, noShowRate: 12.5 },
    dailyEvolution: [
        { date: '2026-10-26', generalGross: 450, totalExpenses: 40, totalDiscounts: 10, totalOutflows: 50, netTotal: 440, finalBalance: 400, patientCount: 3 },
        { date: '2026-10-27', generalGross: 600, totalExpenses: 50, totalDiscounts: 10, totalOutflows: 60, netTotal: 590, finalBalance: 540, patientCount: 4 },
        { date: '2026-10-28', generalGross: 400, totalExpenses: 30, totalDiscounts: 10, totalOutflows: 40, netTotal: 390, finalBalance: 360, patientCount: 2 },
    ],
    breakdown: dentistId ? [] : [{ clinicId: 1, clinicName: 'Clínica Sorriso Centro', dentistId: 3, dentistName: 'Dra. Ana Lima', generalGross: 1450, totalOutflows: 150, finalBalance: 1300 }],
    alerts: [{ code: 'HIGH_NO_SHOW_RATE', severity: 'WARNING', title: 'Faltas acima do esperado', message: '12,5% das consultas do mês tiveram falta.', value: 12.5, threshold: 10 }],
});

const ok = (data, status = 200) => ({ status, body: { status, message: 'ok', data, timestamp: `${today}T09:40:00` } });
const fail = (status, code, message) => ({ status, body: { code, status, message, cause: null } });
const dentistOnly = path => /^\/(user|dashboard|daily-map|inventory)/.test(path);
const dentistWrite = (method, path) => (method === 'POST' && /^\/(clinic|dentist|procedure)$/.test(path)) || (method === 'PUT' && /^\/(clinic|dentist|procedure)\//.test(path));

function totalsOf(map) {
    const sum = (list, field) => list.reduce((total, item) => total + Number(item[field] ?? 0), 0);
    const gross = sum(map.visits, 'value');
    const discounts = Number(map.cardDiscount) + Number(map.predatedCheckDiscount) + Number(map.cashCheckDiscount) + Number(map.otherDiscount) + sum(map.vouchers, 'value');
    const expenses = sum(map.expenses, 'value');
    return { generalGross: gross, clinicalTotal: gross, prosthesisTotal: 0, clinicalGross: gross, pediatricSurgeryGross: 0, totalDiscounts: discounts, totalExpenses: expenses, netTotal: gross - discounts, finalBalance: gross - discounts - expenses, patientCount: map.visits.length, voucherDiscount: sum(map.vouchers, 'value') };
}

function handle(db, method, path, query, body, user) {
    if (path === '/auth/me')
        return ok({ id: user.id, clinicId: user.clinicId, dentistId: user.dentistId, name: user.name, login: user.login, accessLevel: user.accessLevel });
    if (user.accessLevel !== 'DENTISTA' && (dentistOnly(path) || dentistWrite(method, path)))
        return fail(403, 'AUTH002', 'Acesso n�o permitido para este perfil.');
    let match;
    if (path === '/clinic/1')
        return method === 'PUT' ? ok(Object.assign(db.clinic, body)) : ok(db.clinic);
    for (const [collection, route] of [['dentists', 'dentist'], ['procedures', 'procedure'], ['patients', 'patient']]) {
        if (path === `/${route}` && method === 'GET') {
            const name = (query.get('name') ?? '').toLowerCase();
            return ok(db[collection].filter(item => !name || item.name.toLowerCase().includes(name)));
        }
        if (path === `/${route}` && method === 'POST') {
            if (route === 'patient' && db.patients.some(item => item.cpf === body.cpf))
                return fail(422, 'BSN001', 'Já existe um paciente cadastrado com este CPF na mesma clínica.');
            if (route === 'dentist' && db.dentists.some(item => item.cro === body.cro))
                return fail(422, 'BSN001', 'Já existe um dentista com este CRO.');
            const created = { id: db.nextId++, ...body };
            db[collection].push(created);
            return ok(created, 201);
        }
        if ((match = new RegExp(`^/${route}/(\\d+)$`).exec(path))) {
            const found = db[collection].find(item => item.id === Number(match[1]));
            if (!found)
                return fail(404, 'NFD001', 'Registro não encontrado.');
            if (method === 'PUT')
                Object.assign(found, body);
            return ok(found);
        }
    }
    if (path === '/appointment' && method === 'GET')
        return ok(db.appointments.filter(item => item.scheduledAt.startsWith(query.get('date')) && (!query.get('dentistId') || item.dentistId === Number(query.get('dentistId')))).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
    if (path === '/appointment' && method === 'POST') {
        const created = { id: db.nextId++, ...body, status: body.status || 'AGENDADO' };
        db.appointments.push(created);
        return ok(created, 201);
    }
    if ((match = /^\/appointment\/(\d+)(\/status)?$/.exec(path))) {
        const found = db.appointments.find(item => item.id === Number(match[1]));
        if (!found)
            return fail(404, 'NFD001', 'Agendamento não encontrado.');
        if (match[2]) {
            if (['CANCELADO', 'FALTOU'].includes(found.status))
                return fail(422, 'BSN001', 'Não é possível reabrir um agendamento cancelado ou faltoso.');
            found.status = query.get('status');
        }
        else if (method === 'PUT')
            Object.assign(found, body);
        return ok(found);
    }
    if (path === '/user' && method === 'POST') {
        if ([...users, ...db.createdUsers].some(item => item.login === body.login))
            return fail(422, 'BSN001', 'Já existe um usuário com este login.');
        db.createdUsers.push(body);
        return ok({ message: `User id:${db.nextId++} registered successfully` }, 201);
    }
    if (path === '/dashboard')
        return ok(dashboard(query.get('dentistId') ? Number(query.get('dentistId')) : null));
    if (path === '/inventory/products' && method === 'GET')
        return ok(db.products.filter(item => query.get('active') !== 'true' || item.active));
    if (path === '/inventory/products' && method === 'POST') {
        const created = { id: db.nextId++, clinicId: 1, ...body, currentStock: body.initialStock ?? 0, lowStock: (body.initialStock ?? 0) < body.minimumStock };
        db.products.push(created);
        db.movements[created.id] = [];
        return ok(created, 201);
    }
    if ((match = /^\/inventory\/products\/(\d+)(\/movements)?$/.exec(path))) {
        const product = db.products.find(item => item.id === Number(match[1]));
        if (!product)
            return fail(404, 'NFD001', 'Produto não encontrado.');
        if (match[2] && method === 'GET')
            return ok(db.movements[product.id] ?? []);
        if (match[2] && method === 'POST') {
            const next = body.type === 'ENTRADA' ? product.currentStock + body.quantity : body.type === 'SAIDA' ? product.currentStock - body.quantity : body.quantity;
            if (next < 0)
                return fail(422, 'BSN001', 'Estoque insuficiente para esta saída.');
            product.currentStock = next;
            product.lowStock = next < product.minimumStock;
            const movement = { id: db.nextId++, productId: product.id, userId: 7, ...body, unitCostAtTime: product.unitCost, occurredAt: `${today}T09:40:00` };
            (db.movements[product.id] ??= []).unshift(movement);
            return ok(movement, 201);
        }
        if (method === 'PUT')
            Object.assign(product, { ...body, initialStock: undefined });
        return ok(product);
    }
    if (path === '/inventory/equipment' && method === 'GET')
        return ok(db.equipment);
    if ((match = /^\/inventory\/equipment\/(\d+)$/.exec(path))) {
        const found = db.equipment.find(item => item.id === Number(match[1]));
        if (method === 'PUT')
            Object.assign(found, body, { costPerUse: body.acquisitionValue / body.usefulLifeUses });
        return ok(found);
    }
    if (path === '/inventory/equipment' && method === 'POST') {
        const created = { id: db.nextId++, clinicId: 1, ...body, costPerUse: body.acquisitionValue / body.usefulLifeUses };
        db.equipment.push(created);
        return ok(created, 201);
    }
    if (path === '/daily-map' && method === 'GET') {
        if (query.get('date')) {
            const found = db.dailyMaps.find(map => map.date === query.get('date'));
            return found ? ok(found) : fail(404, 'NFD001', 'Mapa diário não encontrado.');
        }
        return ok(db.dailyMaps.filter(map => map.date >= query.get('start') && map.date <= query.get('end')));
    }
    if (path === '/daily-map' && method === 'POST') {
        const created = { id: db.nextId++, clinicId: 1, dentistId: user.dentistId, attendantUserId: user.id, checkingUserId: null, status: 'ABERTO', closedAt: null, conferenceDate: null, ...body };
        Object.assign(created, totalsOf(created));
        db.dailyMaps.push(created);
        return ok(created, 201);
    }
    if ((match = /^\/daily-map\/(\d+)(\/close)?$/.exec(path))) {
        const found = db.dailyMaps.find(map => map.id === Number(match[1]));
        if (!found)
            return fail(404, 'NFD001', 'Mapa diário não encontrado.');
        if (match[2]) {
            if (![...found.visits, ...found.vouchers].every(item => item.checked))
                return fail(422, 'DMN001', 'Todos os atendimentos e vales devem estar conferidos antes do fechamento.');
            Object.assign(found, { status: 'FECHADO', closedAt: `${today}T18:00:00`, checkingUserId: user.id });
        }
        else if (method === 'PUT') {
            Object.assign(found, body);
            Object.assign(found, totalsOf(found));
        }
        return ok(found);
    }
    return fail(404, 'NFD001', `Rota não simulada: ${method} ${path}`);
}

// ViaCEP simulado: os testes não acessam a internet. Outros CEPs respondem como inexistentes.
const viaCep = { '01001000': { cep: '01001-000', logradouro: 'Praça da Sé', complemento: 'lado ímpar', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' } };

export async function useFakeApi(page, { clock = true } = {}) {
    const db = seed();
    if (clock)
        await page.clock.setFixedTime(now);
    await page.route('https://viacep.com.br/ws/**', async route => {
        const cep = /\/ws\/(\d{8})\/json/.exec(route.request().url())?.[1];
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(viaCep[cep] ?? { erro: true }) });
    });
    await page.route('**/dentalflow-api/v1/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname.replace(/^.*\/dentalflow-api\/v1/, '');
        const [scheme, token] = (request.headers().authorization ?? '').split(' ');
        const [login, password] = scheme === 'Basic' ? Buffer.from(token, 'base64').toString().split(':') : [];
        const user = users.find(item => item.login === login && item.password === password);
        if (!user)
            return route.fulfill({ status: 401, body: '' });
        const body = request.postData() ? JSON.parse(request.postData()) : null;
        const result = handle(db, request.method(), path, url.searchParams, body, user);
        await route.fulfill({ status: result.status, contentType: 'application/json', body: JSON.stringify(result.body) });
    });
    return db;
}

// Escolhe uma opção num campo de busca (Combobox): digita parte do nome e clica na sugestão.
export async function chooseOption(page, label, text, option = text) {
    await page.getByRole('combobox', { name: label }).fill(text);
    await page.getByRole('option', { name: option }).first().click();
}

export async function signIn(page, login = 'ana', route = '/hoje') {
    await page.goto(`./#/entrar?volta=${encodeURIComponent(route)}`);
    await page.getByLabel('Usuário').fill(login);
    await page.getByLabel('Senha', { exact: true }).fill('senha123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('heading', { level: 1 }).first().waitFor();
}
