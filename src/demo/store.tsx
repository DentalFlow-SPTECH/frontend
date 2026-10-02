import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { createSeed } from './seed';
import type { Appointment, AppointmentInput, Budget, BudgetInput, CashInput, CashMovement, ClinicUser, DemoData, Doctor, DoctorInput, EntryInput, ExitInput, Patient, PatientInput, Product, ProductInput, UserInput } from './model';
import { emptyPatientInput, patientFieldLabels } from './patient';
import { appointmentInterval, appointmentStatuses, isDate, isTooth } from './clinic';

const storageKey = 'dental_flow_demo_v1';
type Scenario = 'normal' | 'slow' | 'read-error' | 'write-error';
interface DemoContextValue {
  data: DemoData; storageNotice: string; scenario: Scenario; generation: number; writePending: boolean;
  setScenario: (value: Scenario) => void;
  load: () => Promise<void>;
  saveBudget: (input: BudgetInput, id?: string) => Promise<Budget>;
  savePatient: (input: PatientInput, id?: string) => Promise<Patient>;
  saveDoctor: (input: DoctorInput, id?: string) => Promise<Doctor>;
  saveAppointment: (input: AppointmentInput, id?: string) => Promise<Appointment>;
  cancelAppointment: (id: string, reason: string) => Promise<Appointment>;
  saveCashMovement: (input: CashInput) => Promise<CashMovement>;
  saveUser: (input: UserInput, id?: string) => Promise<ClinicUser>;
  setUserBlocked: (id: string, blocked: boolean) => Promise<ClinicUser>;
  createProduct: (input: ProductInput) => Promise<Product>;
  addEntry: (input: EntryInput) => Promise<void>;
  addExit: (input: ExitInput) => Promise<void>;
  reset: () => Promise<void>;
}
const DemoContext = createContext<DemoContextValue | null>(null);
function initialData(): { data: DemoData; notice: string } {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { data: createSeed(), notice: '' };
    const saved = JSON.parse(raw) as DemoData;
    // Validate the collections before using a local snapshot. Preserve an unreadable snapshot until reset.
    if (saved.version !== 1 || !['patients', 'doctors', 'procedures', 'budgets', 'products', 'movements'].every(key => Array.isArray(saved[key as keyof DemoData]))) throw new Error('invalid');
    for (const key of ['appointments', 'cashMovements', 'users', 'audit'] as const) {
      if (saved[key] === undefined) (saved[key] as unknown[]) = [];
      else if (!Array.isArray(saved[key])) throw new Error('invalid');
    }
    // Refresh only the fixed sample copy; keep stock balances and all visitor-created records.
    const seed = createSeed();
    // Add only missing fields; keep IDs, codes, edits and budget relationships from version 1.
    saved.patients = saved.patients.map(patient => ({ ...emptyPatientInput, ...patient, history: patient.history ?? [] }));
    saved.budgets = saved.budgets.map(budget => {
      const reference = !budget.local && seed.budgets.find(value => value.id === budget.id);
      return reference ? { ...budget, observation: reference.observation, paymentNote: reference.paymentNote, items: budget.items.map(item => ({ ...item, observation: reference.items.find(value => value.id === item.id)?.observation ?? item.observation })), history: reference.history } : budget;
    });
    saved.products = saved.products.map(product => {
      const reference = seed.products.find(value => value.id === product.id);
      return reference ? { ...product, description: reference.description, supplier: reference.supplier, lot: reference.lot } : product;
    });
    saved.movements = saved.movements.map(movement => {
      const reference = seed.movements.find(value => value.id === movement.id);
      return reference ? { ...movement, actor: reference.actor, reason: reference.reason, supplier: reference.supplier, lot: reference.lot, observation: reference.observation } : { ...movement, actor: movement.actor.replace(' · demonstração', ''), reason: movement.reason === 'Entrada demonstrativa' ? 'Recebimento de material' : movement.reason };
    });
    return { data: saved, notice: '' };
  } catch { return { data: createSeed(), notice: 'Não foi possível abrir os dados salvos. Os registros iniciais estão sendo exibidos.' }; }
}
function uid() { return crypto.randomUUID(); }
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
export function DemoProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(initialData);
  const [data, setData] = useState(initial.data);
  const [storageNotice, setStorageNotice] = useState(initial.notice);
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [generation, setGeneration] = useState(0);
  const [writePending, setWritePending] = useState(false);
  const writeLock = useRef(false);
  const latestData = useRef(data);
  async function beforeWrite() {
    await delay(scenario === 'slow' ? 1500 : 300);
    if (scenario === 'write-error') throw new Error('Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
  }
  function persist(next: DemoData) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { throw new Error('Não foi possível salvar neste navegador. Os dados preenchidos foram mantidos. Verifique se o armazenamento local está disponível e tente novamente.'); }
    latestData.current = next; setData(next); setStorageNotice('');
  }
  function recordChange(next: DemoData, action: string, record: string, recordPath: string) {
    persist({ ...next, audit: [...next.audit, { id: uid(), date: new Date().toISOString(), actor: 'Você', action, record, recordPath }] });
  }
  async function transaction<T>(operation: () => T, recovery = false): Promise<T> {
    if (storageNotice && !recovery) throw new Error('Os dados salvos não puderam ser abertos. Faça a recuperação dos dados antes de salvar novos registros. Seu preenchimento foi mantido.');
    if (writeLock.current) throw new Error('Há uma operação sendo salva. Aguarde a conclusão e tente novamente.');
    writeLock.current = true; setWritePending(true);
    try { await beforeWrite(); return operation(); }
    finally { writeLock.current = false; setWritePending(false); }
  }
  async function saveBudget(input: BudgetInput, id?: string) { return transaction(() => {
    const current = latestData.current;
    const existing = id ? current.budgets.find(budget => budget.id === id) : undefined;
    if (id && !existing) throw new Error('Este orçamento não está disponível. Seu preenchimento foi mantido.');
    if (existing && !existing.local) throw new Error('Este orçamento está disponível somente para leitura.');
    if (input.items.some(item => item.tooth && !isTooth(item.tooth))) throw new Error('Revise a identificação dos dentes. Seu preenchimento foi mantido.');
    const now = new Date().toISOString();
    const budget: Budget = { ...input, id: existing?.id ?? uid(), code: existing?.code ?? `ORC-${String(current.budgets.length + 1).padStart(3, '0')}`, local: true, statusLabel: 'Registro local', approvedOn: '', history: [...(existing?.history ?? []), { id: uid(), date: now, actor: 'Você', description: existing ? 'Orçamento atualizado.' : 'Orçamento criado.' }] };
    recordChange({ ...current, budgets: existing ? current.budgets.map(value => value.id === existing.id ? budget : value) : [...current.budgets, budget] }, existing ? 'Orçamento atualizado' : 'Orçamento criado', budget.code, `/orcamentos/${budget.id}`);
    return budget;
  }); }
  async function createProduct(input: ProductInput) { return transaction(() => {
    const current = latestData.current;
    const product: Product = { ...input, id: uid(), code: `MAT-${String(current.products.length + 1).padStart(3, '0')}` };
    recordChange({ ...current, products: [...current.products, product] }, 'Material cadastrado', product.code, `/estoque/${product.id}`);
    return product;
  }); }
  async function savePatient(input: PatientInput, id?: string) { return transaction(() => {
    const current = latestData.current;
    const existing = id ? current.patients.find(patient => patient.id === id) : undefined;
    if (id && !existing) throw new Error('Este paciente não está disponível. Seu preenchimento foi mantido.');
    if (!input.name.trim()) throw new Error('Informe o nome completo do paciente.');
    const changed = (Object.keys(emptyPatientInput) as (keyof PatientInput)[]).filter(key => input[key] !== existing?.[key]);
    if (existing && !changed.length) return existing;
    let sequence = current.patients.length + 1;
    while (current.patients.some(patient => patient.code === `PAC-${String(sequence).padStart(3, '0')}`)) sequence += 1;
    const patient: Patient = {
      ...existing, ...input, name: input.name.trim(), id: existing?.id ?? uid(), code: existing?.code ?? `PAC-${String(sequence).padStart(3, '0')}`,
      history: [...(existing?.history ?? []), { id: uid(), date: new Date().toISOString(), actor: 'Você', description: existing ? `Dados cadastrais atualizados: ${changed.map(key => patientFieldLabels[key]).join(', ')}.` : 'Cadastro criado.' }],
    };
    recordChange({ ...current, patients: existing ? current.patients.map(value => value.id === existing.id ? patient : value) : [...current.patients, patient] }, existing ? 'Paciente atualizado' : 'Paciente cadastrado', patient.code, `/pacientes/${patient.id}`);
    return patient;
  }); }
  async function saveDoctor(input: DoctorInput, id?: string) { return transaction(() => {
    const current = latestData.current;
    const existing = id ? current.doctors.find(value => value.id === id) : undefined;
    if (id && !existing) throw new Error('Este doutor não está disponível. Seu preenchimento foi mantido.');
    if (!input.name.trim()) throw new Error('Informe o nome do doutor.');
    if (existing && Object.keys(input).every(key => input[key as keyof DoctorInput] === (existing[key as keyof DoctorInput] ?? ''))) return existing;
    const doctor: Doctor = { ...existing, ...input, name: input.name.trim(), id: existing?.id ?? uid(), history: [...(existing?.history ?? []), { id: uid(), date: new Date().toISOString(), actor: 'Você', description: existing ? 'Cadastro do doutor atualizado.' : 'Doutor cadastrado.' }] };
    recordChange({ ...current, doctors: existing ? current.doctors.map(value => value.id === doctor.id ? doctor : value) : [...current.doctors, doctor] }, existing ? 'Doutor atualizado' : 'Doutor cadastrado', doctor.name, `/doutores/${doctor.id}`);
    return doctor;
  }); }
  async function saveAppointment(input: AppointmentInput, id?: string) { return transaction(() => {
    const current = latestData.current;
    const existing = id ? current.appointments.find(value => value.id === id) : undefined;
    if (id && !existing) throw new Error('Esta consulta não está disponível. Seu preenchimento foi mantido.');
    if (!current.patients.some(value => value.id === input.patientId) || !current.doctors.some(value => value.id === input.doctorId) || !current.procedures.some(value => value.name === input.procedure)) throw new Error('Revise o paciente, o doutor e o procedimento selecionados.');
    if (existing && (input.patientId !== existing.patientId || input.duration !== existing.duration)) throw new Error('O paciente e a duração desta consulta devem ser preservados na edição.');
    const interval = appointmentInterval(input);
    if (!interval) throw new Error('Informe data, horário e duração válidos.');
    if (!appointmentStatuses.includes(input.status)) throw new Error('Selecione a situação da consulta.');
    if (input.budgetId && !current.budgets.some(value => value.id === input.budgetId && value.patientId === input.patientId)) throw new Error('Selecione um orçamento deste paciente ou deixe o vínculo vazio.');
    const conflict = input.status !== 'Cancelada' && current.appointments.find(value => {
      if (value.id === id || value.doctorId !== input.doctorId || value.status === 'Cancelada') return false;
      const other = appointmentInterval(value);
      return other && interval.start < other.end && other.start < interval.end;
    });
    if (conflict) throw new Error('Este doutor já tem uma consulta nesse intervalo. Revise o horário ou o doutor.');
    const description = existing ? existing.status !== input.status ? `Consulta atualizada. Situação: ${existing.status} → ${input.status}.` : 'Consulta atualizada.' : 'Consulta agendada.';
    const appointment: Appointment = { ...input, id: existing?.id ?? uid(), cancelReason: input.status === 'Cancelada' ? existing?.cancelReason ?? '' : '', history: [...(existing?.history ?? []), { id: uid(), date: new Date().toISOString(), actor: 'Você', description }] };
    recordChange({ ...current, appointments: existing ? current.appointments.map(value => value.id === appointment.id ? appointment : value) : [...current.appointments, appointment] }, existing ? 'Consulta atualizada' : 'Consulta agendada', `${current.patients.find(value => value.id === appointment.patientId)!.name} · ${appointment.date} ${appointment.time}`, `/agenda/${appointment.id}`);
    return appointment;
  }); }
  async function cancelAppointment(id: string, reason: string) { return transaction(() => {
    const current = latestData.current;
    const existing = current.appointments.find(value => value.id === id);
    if (!existing) throw new Error('Esta consulta não está disponível.');
    if (existing.status === 'Cancelada') return existing;
    const appointment: Appointment = { ...existing, status: 'Cancelada', cancelReason: reason.trim(), history: [...existing.history, { id: uid(), date: new Date().toISOString(), actor: 'Você', description: reason.trim() ? `Consulta cancelada. Motivo: ${reason.trim()}` : 'Consulta cancelada.' }] };
    recordChange({ ...current, appointments: current.appointments.map(value => value.id === id ? appointment : value) }, 'Consulta cancelada', `${current.patients.find(value => value.id === appointment.patientId)?.name ?? 'Consulta'} · ${appointment.date} ${appointment.time}`, `/agenda/${appointment.id}`);
    return appointment;
  }); }
  async function saveCashMovement(input: CashInput) { return transaction(() => {
    const current = latestData.current;
    if (!['Entrada', 'Saída'].includes(input.type) || !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0 || !isDate(input.date) || !input.description.trim()) throw new Error('Informe valor maior que zero, data válida e descrição.');
    const movement: CashMovement = { ...input, description: input.description.trim(), id: uid(), history: [{ id: uid(), date: new Date().toISOString(), actor: 'Você', description: `${input.type} de caixa registrada.` }] };
    const total = current.cashMovements.filter(value => value.type === input.type).reduce((sum, value) => sum + value.amountCents, input.amountCents);
    if (!Number.isSafeInteger(total)) throw new Error('O valor informado é muito alto. Revise o valor.');
    recordChange({ ...current, cashMovements: [...current.cashMovements, movement] }, `${input.type} de caixa registrada`, movement.description, `/caixa/${movement.id}`);
    return movement;
  }); }
  async function saveUser(input: UserInput, id?: string) { return transaction(() => {
    const current = latestData.current;
    const existing = id ? current.users.find(value => value.id === id) : undefined;
    if (id && !existing) throw new Error('Este usuário não está disponível. Seu preenchimento foi mantido.');
    if (!input.name.trim()) throw new Error('Informe o nome do usuário.');
    const allowedModules = ['agenda', 'pacientes', 'orcamentos', 'estoque', 'doutores', 'caixa', 'administracao'];
    const allowedOperations = ['visualizar', 'criar', 'alterar', 'excluir'];
    if (input.permissions.some(permission => { const [module, operation] = permission.split(':'); return !allowedModules.includes(module) || !allowedOperations.includes(operation); })) throw new Error('Revise as permissões selecionadas.');
    const permissions = [...new Set(input.permissions)];
    if (existing && (['name', 'email', 'phone', 'login', 'profile'] as const).every(key => (key === 'name' ? input.name.trim() : input[key]) === existing[key]) && [...existing.permissions].sort().join(',') === [...permissions].sort().join(',')) return existing;
    const user: ClinicUser = { ...input, name: input.name.trim(), permissions, id: existing?.id ?? uid(), blocked: existing?.blocked ?? false, history: [...(existing?.history ?? []), { id: uid(), date: new Date().toISOString(), actor: 'Você', description: existing ? 'Cadastro e permissões do usuário atualizados.' : 'Usuário cadastrado.' }] };
    recordChange({ ...current, users: existing ? current.users.map(value => value.id === user.id ? user : value) : [...current.users, user] }, existing ? 'Usuário atualizado' : 'Usuário cadastrado', user.name, `/administracao/${user.id}`);
    return user;
  }); }
  async function setUserBlocked(id: string, blocked: boolean) { return transaction(() => {
    const current = latestData.current;
    const existing = current.users.find(value => value.id === id);
    if (!existing) throw new Error('Este usuário não está disponível.');
    if (existing.blocked === blocked) return existing;
    const action = blocked ? 'Usuário bloqueado' : 'Usuário reativado';
    const user: ClinicUser = { ...existing, blocked, history: [...existing.history, { id: uid(), date: new Date().toISOString(), actor: 'Você', description: `${action}.` }] };
    recordChange({ ...current, users: current.users.map(value => value.id === id ? user : value) }, action, user.name, `/administracao/${user.id}`);
    return user;
  }); }
  async function addEntry(input: EntryInput) { return transaction(() => {
    const current = latestData.current;
    if (!current.products.some(product => product.id === input.productId)) throw new Error('Este material não está disponível. Os dados preenchidos foram mantidos.');
    recordChange({ ...current, products: current.products.map(product => product.id === input.productId ? { ...product, quantity: product.quantity + input.quantity } : product), movements: [...current.movements, { ...input, id: uid(), type: 'Entrada', actor: 'Você', reason: 'Recebimento de material' }] }, 'Entrada de estoque registrada', current.products.find(value => value.id === input.productId)!.code, `/estoque/${input.productId}`);
  }); }
  async function addExit(input: ExitInput) { return transaction(() => {
    const current = latestData.current;
    const product = current.products.find(value => value.id === input.productId);
    if (!product) throw new Error('Este material não está disponível. Os dados preenchidos foram mantidos.');
    if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error('Informe uma quantidade inteira maior que zero.');
    if (input.quantity > product.quantity) throw new Error('A quantidade supera o saldo disponível. Revise a quantidade.');
    recordChange({ ...current, products: current.products.map(value => value.id === input.productId ? { ...value, quantity: value.quantity - input.quantity } : value), movements: [...current.movements, { ...input, id: uid(), type: 'Saída', actor: 'Você', supplier: '', purchaseCents: 0, lot: '', expiresOn: '' }] }, 'Saída de estoque registrada', product.code, `/estoque/${product.id}`);
  }); }
  async function reset() { return transaction(() => { persist(createSeed()); setGeneration(value => value + 1); }, true); }
  async function load() { await delay(scenario === 'slow' ? 1500 : 200); if (scenario === 'read-error') throw new Error('Não foi possível carregar os registros. Tente novamente.'); }
  return <DemoContext.Provider value={{ data, storageNotice, scenario, generation, writePending, setScenario, load, saveBudget, savePatient, saveDoctor, saveAppointment, cancelAppointment, saveCashMovement, saveUser, setUserBlocked, createProduct, addEntry, addExit, reset }}>{children}</DemoContext.Provider>;
}
export function useDemo() { const value = useContext(DemoContext); if (!value) throw new Error('DemoProvider não disponível'); return value; }
