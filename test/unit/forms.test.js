import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldFromApiMessage, formFromPatient, searchPatients, toPatientPayload, validatePatient } from '../../src/feature/patient/model/patient_model.js';
import { emptyClinicForm, formFromClinic, parseMoney, toClinicPayload, toProcedurePayload, toUserPayload, validateClinic, validateProcedure, validateUser } from '../../src/feature/clinic/model/clinic_model.js';
import { toMovementPayload, toProductPayload, validateMovement } from '../../src/feature/inventory/model/inventory_model.js';
import { previewTotals, readyToClose, toDailyMapPayload, validateDailyMap, visitsFromAppointments } from '../../src/feature/daily_map/model/daily_map_model.js';
import { alertTone, funnelParts, monthParam, shiftMonth, sortAlerts } from '../../src/feature/dashboard/model/dashboard_model.js';

const patient = { name: 'Maria Oliveira', cpf: '123.456.789-00', birthDate: '1990-05-20', phone: '(11) 98765-4321', email: 'maria@email.com', zipCode: '01234-567', street: 'Rua A', number: '10', complement: '', neighborhood: 'Centro' };

test('paciente segue as regras da API e envia CPF/CEP mascarados', () => {
    assert.deepEqual(validatePatient(patient, '2026-10-28'), {});
    const errors = validatePatient({ ...patient, cpf: '123', zipCode: '', birthDate: '2030-01-01', email: 'x@' }, '2026-10-28');
    assert.deepEqual(Object.keys(errors).sort(), ['birthDate', 'cpf', 'email', 'zipCode']);
    assert.deepEqual(toPatientPayload(patient, 1), { clinicId: 1, name: 'Maria Oliveira', cpf: '123.456.789-00', address: 'Rua A, 10', neighborhood: 'Centro', zipCode: '01234-567', phone: '11987654321', email: 'maria@email.com', birthDate: '1990-05-20' });
    assert.equal(fieldFromApiMessage('Já existe um paciente cadastrado com este CPF na mesma clínica.'), 'cpf');
});

test('paciente: endereço em rua, número e complemento, montado num texto só para a API', () => {
    assert.equal(toPatientPayload({ ...patient, street: 'Praça da Sé', number: '100', complement: 'Sala 2' }, 1).address, 'Praça da Sé, 100 - Sala 2');
    assert.deepEqual(validatePatient({ ...patient, street: '', number: '' }, '2026-10-28'), { street: 'Informe a rua.' });
    assert.deepEqual(validatePatient({ ...patient, number: '' }, '2026-10-28'), { number: 'Informe o número (ou s/n).' });
    // Cadastro antigo com o número dentro da rua continua salvando sem exigir o campo Número.
    assert.deepEqual(validatePatient({ ...patient, street: 'Avenida Paulista 1000', number: '' }, '2026-10-28'), {});
    assert.ok(validatePatient({ ...patient, street: 'R'.repeat(140), complement: 'Bloco B' }, '2026-10-28').street);
    assert.deepEqual(formFromPatient({ name: 'Ana', cpf: '12345678900', address: 'Rua das Acácias, 101 - Apto 4', neighborhood: 'Centro', zipCode: '01234567' }),
        { name: 'Ana', cpf: '123.456.789-00', birthDate: '', phone: '', email: '', zipCode: '01234-567', street: 'Rua das Acácias', number: '101', complement: 'Apto 4', neighborhood: 'Centro' });
});

test('clínica: o endereço separado vira um texto só e volta separado na edição', () => {
    const form = { ...emptyClinicForm(), name: 'Clínica Sorriso', street: 'Rua X', number: '123', complement: 'Sala 2', neighborhood: 'Vila Mariana', city: 'São Paulo', state: 'SP', zipCode: '04010-100' };
    assert.equal(toClinicPayload(form).address, 'Rua X, 123 - Sala 2, Vila Mariana, São Paulo/SP, 04010-100');
    assert.equal(toClinicPayload(emptyClinicForm()).address, null);
    assert.deepEqual(formFromClinic({ name: 'Clínica Sorriso', address: toClinicPayload(form).address }), { ...form, cnpj: '', phone: '' });
    assert.deepEqual(Object.keys(validateClinic({ ...form, zipCode: '0401', state: 'São Paulo' })).sort(), ['state', 'zipCode']);
});

test('busca de pacientes ignora acentos e aceita CPF ou telefone', () => {
    const list = [{ name: 'Sônia Martins', cpf: '111.222.333-44', phone: '11999990001' }, { name: 'Ana Clara', cpf: '555.666.777-88', phone: '11988887777' }];
    assert.deepEqual(searchPatients(list, 'sonia').map(item => item.name), ['Sônia Martins']);
    assert.deepEqual(searchPatients(list, '555.666').map(item => item.name), ['Ana Clara']);
    assert.deepEqual(searchPatients(list, '').map(item => item.name), ['Ana Clara', 'Sônia Martins']);
});

test('valores em reais aceitam vírgula e milhar', () => {
    assert.equal(parseMoney('1.234,56'), 1234.56);
    assert.equal(parseMoney('180'), 180);
    assert.equal(parseMoney('R$ 25,9'), 25.9);
    assert.equal(parseMoney(''), null);
    assert.ok(Number.isNaN(parseMoney('abc')));
    assert.deepEqual(validateProcedure({ name: 'Limpeza', price: '-1', durationMinutes: '0' }), { price: 'O valor não pode ser negativo.', durationMinutes: 'Informe os minutos (maior que zero).' });
    assert.deepEqual(toProcedurePayload({ name: ' Limpeza ', price: '180,00', durationMinutes: '60' }, 1), { clinicId: 1, name: 'Limpeza', price: 180, durationMinutes: 60 });
});

test('usuário DENTISTA exige dentista e RECEPCIONISTA envia dentistId nulo', () => {
    assert.ok(validateUser({ name: 'Ana', login: 'ana lima', password: '123', accessLevel: 'DENTISTA', dentistId: '' }).dentistId);
    assert.equal(toUserPayload({ name: 'Carla', login: ' Carla ', password: 'senha123', accessLevel: 'RECEPCIONISTA', dentistId: '3' }, 1).dentistId, null);
    assert.equal(toUserPayload({ name: 'Carla', login: ' Carla ', password: 'senha123', accessLevel: 'RECEPCIONISTA', dentistId: '' }, 1).login, 'carla');
});

test('estoque não permite saída maior que o saldo', () => {
    const product = { currentStock: 2 };
    assert.ok(validateMovement({ type: 'SAIDA', quantity: '3', reason: '' }, product).quantity);
    assert.deepEqual(validateMovement({ type: 'AJUSTE', quantity: '0', reason: '' }, product), {});
    assert.deepEqual(toMovementPayload({ type: 'ENTRADA', quantity: '2,5', reason: ' compra ' }), { type: 'ENTRADA', quantity: 2.5, reason: 'compra' });
    assert.equal(toProductPayload({ name: 'Luva', unit: 'caixa', unitCost: '25,90', initialStock: '', minimumStock: '2', active: true }).unit, 'CAIXA');
});

test('mapa do dia sugere atendimentos, estima o saldo e só fecha conferido', () => {
    const visits = visitsFromAppointments([
        { id: 1, patientId: 10, procedureId: 5, patientName: 'Maria', time: '09:00', start: 540, status: 'CONCLUIDO', procedure: { price: 150 } },
        { id: 2, patientId: 11, procedureId: 5, patientName: 'João', time: '08:00', start: 480, status: 'FALTOU', procedure: { price: 150 } },
    ]);
    assert.equal(visits.length, 1);
    assert.equal(visits[0].value, '150,00');
    const form = { date: '2026-10-28', notes: '', cardDiscount: '10', predatedCheckDiscount: '', cashCheckDiscount: '', otherDiscount: '', moldingCount: '1', biteCount: '0', fittingCount: '0', deliveryCount: '0', repetitionCount: '0', visits, vouchers: [{ key: 'v', responsibleName: 'Ana', recordNumber: '', value: '5', description: '', checked: false }], expenses: [{ key: 'e', description: 'Material', value: '20' }], teamSchedules: [] };
    assert.deepEqual(validateDailyMap(form), {});
    assert.deepEqual(previewTotals(form), { gross: 150, discounts: 15, expenses: 20, balance: 115, patients: 1 });
    const payload = toDailyMapPayload(form);
    assert.equal(payload.visits[0].scheduledTime, '09:00:00');
    assert.equal(payload.visits[0].lineNumber, 1);
    assert.equal(payload.cardDiscount, 10);
    assert.equal(readyToClose({ visits: [{ checked: true }], vouchers: [{ checked: false }] }), false);
});

test('painel ordena alertas por gravidade e não multiplica percentuais', () => {
    assert.deepEqual(sortAlerts([{ severity: 'INFO' }, { severity: 'CRITICAL' }, { severity: 'WARNING' }]).map(alert => alert.severity), ['CRITICAL', 'WARNING', 'INFO']);
    assert.equal(alertTone('CRITICAL'), 'danger');
    assert.equal(funnelParts({ completed: 5, scheduled: 1, confirmed: 2, inProgress: 1, cancelled: 1, noShow: 2 })[1].value, 4);
    assert.deepEqual(monthParam('2026-13'), monthParam(null));
    assert.equal(shiftMonth({ year: 2026, month: 1 }, -1), '2025-12');
});
