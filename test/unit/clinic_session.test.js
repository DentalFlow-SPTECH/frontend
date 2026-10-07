import assert from 'node:assert/strict';
import test from 'node:test';
import { createClinicSession } from '../../src/data/clinic_session.js';
import { storageKey } from '../../src/data/local/snapshot_storage.js';
import { createSeed } from '../../src/demo/seed.js';
import { createPatientRepository } from '../../src/feature/patient/repository/patient_repository.js';
import { createInventoryRepository } from '../../src/feature/inventory/repository/inventory_repository.js';
import { createAgendaRepository } from '../../src/feature/agenda/repository/agenda_repository.js';
import { emptyPatientInput } from '../../src/demo/patient.js';

function memoryStorage(raw = null) {
  let value = raw;
  let writes = 0;
  return {
    getItem(key) { assert.equal(key, storageKey); return value; },
    setItem(key, next) { assert.equal(key, storageKey); value = next; writes++; },
    read: () => value,
    writes: () => writes,
  };
}
const immediate = async () => {};

test('legacy snapshot keeps identity and unrelated records without writing during load', () => {
  const data = createSeed();
  data.patients[0] = { id: 'p1', code: 'PAC-001', name: 'Nome editado pelo visitante' };
  delete data.appointments; delete data.users; delete data.cashMovements; delete data.audit;
  const raw = JSON.stringify(data);
  const storage = memoryStorage(raw);
  const session = createClinicSession({ storage, wait: immediate });
  const loaded = session.getSnapshot().data;
  assert.equal(loaded.patients[0].name, 'Nome editado pelo visitante');
  assert.equal(loaded.patients[0].id, 'p1');
  assert.equal(loaded.patients[0].cpf, '');
  assert.deepEqual(loaded.patients[0].history, []);
  assert.deepEqual(loaded.budgets.map(value => [value.id, value.patientId]), data.budgets.map(value => [value.id, value.patientId]));
  assert.equal(storage.read(), raw);
  assert.equal(storage.writes(), 0);
});

test('unreadable storage is preserved until explicit recovery', async () => {
  const storage = memoryStorage('{invalid');
  const session = createClinicSession({ storage, wait: immediate });
  const patient = createPatientRepository(session);
  await assert.rejects(patient.savePatient({ ...emptyPatientInput, name: 'Clara' }), /recuperação/);
  assert.equal(storage.read(), '{invalid');
  assert.equal(storage.writes(), 0);
  await session.reset();
  assert.equal(JSON.parse(storage.read()).version, 1);
  assert.equal(session.getSnapshot().generation, 1);
});

test('patient edits preserve relationships and unchanged saves generate no additional audit', async () => {
  const storage = memoryStorage();
  const session = createClinicSession({ storage, wait: immediate });
  const repository = createPatientRepository(session);
  const original = session.getSnapshot().data;
  const fields = Object.fromEntries(Object.keys(emptyPatientInput).map(key => [key, original.patients[0][key]]));
  const patient = await repository.savePatient({ ...fields, name: 'Marina atualizada' }, original.patients[0].id);
  assert.equal(patient.code, original.patients[0].code);
  assert.equal(patient.id, original.patients[0].id);
  assert.deepEqual(session.getSnapshot().data.budgets, original.budgets);
  assert.equal(session.getSnapshot().data.audit.length, original.audit.length + 1);
  await repository.savePatient({ ...fields, name: patient.name }, patient.id);
  assert.equal(storage.writes(), 1);
  assert.equal(session.getSnapshot().data.audit.length, original.audit.length + 1);
});

test('failed persistence leaves the published data and snapshot untouched', async () => {
  const storage = memoryStorage();
  const session = createClinicSession({ storage: { ...storage, setItem() { throw new Error('quota'); } }, wait: immediate });
  const original = session.getSnapshot().data;
  await assert.rejects(createPatientRepository(session).savePatient({ ...emptyPatientInput, name: 'Clara' }), /armazenamento local/);
  assert.equal(session.getSnapshot().data, original);
  assert.equal(storage.read(), null);
  assert.equal(session.getSnapshot().writePending, false);
});

test('simultaneous writes are rejected before their domain operations run', async () => {
  let release;
  const storage = memoryStorage();
  const session = createClinicSession({ storage, wait: () => new Promise(resolve => { release = resolve; }) });
  const repository = createPatientRepository(session);
  const first = repository.savePatient({ ...emptyPatientInput, name: 'Clara' });
  assert.equal(session.getSnapshot().writePending, true);
  await assert.rejects(repository.savePatient({ ...emptyPatientInput, name: 'Outro' }), /operação sendo salva/);
  release();
  await first;
  assert.equal(storage.writes(), 1);
  assert.equal(session.getSnapshot().data.patients.filter(value => value.name === 'Outro').length, 0);
});

test('stock exit uses the latest balance and writes movement and audit in one snapshot', async () => {
  const storage = memoryStorage();
  const session = createClinicSession({ storage, wait: immediate });
  const repository = createInventoryRepository(session);
  const original = session.getSnapshot().data;
  const product = original.products.find(value => value.quantity > 0);
  const input = { productId: product.id, quantity: product.quantity, date: '2026-10-06', reason: 'Consumo interno', observation: '' };
  await repository.addExit(input);
  assert.equal(session.getSnapshot().data.products.find(value => value.id === product.id).quantity, 0);
  assert.equal(session.getSnapshot().data.movements.length, original.movements.length + 1);
  assert.equal(session.getSnapshot().data.audit.length, original.audit.length + 1);
  await assert.rejects(repository.addExit({ ...input, quantity: 1 }), /saldo disponível/);
  assert.equal(storage.writes(), 1);
});

test('appointment intervals reject overlap, allow touching times and preserve links', async () => {
  const storage = memoryStorage();
  const session = createClinicSession({ storage, wait: immediate });
  const repository = createAgendaRepository(session);
  const data = session.getSnapshot().data;
  const input = { patientId: data.patients[0].id, doctorId: data.doctors[0].id, procedure: data.procedures[0].name, date: '2026-10-06', time: '09:00', duration: 30, observation: '', attendance: '', budgetId: '', status: 'Agendada' };
  const first = await repository.saveAppointment(input);
  await assert.rejects(repository.saveAppointment({ ...input, time: '09:15' }), /intervalo/);
  await repository.saveAppointment({ ...input, time: '09:30' });
  await assert.rejects(repository.saveAppointment({ ...input, patientId: data.patients[1].id }, first.id), /preservados/);
  assert.equal(storage.writes(), 2);
});
