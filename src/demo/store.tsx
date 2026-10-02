import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { createSeed } from './seed';
import type { Budget, BudgetInput, DemoData, EntryInput, ExitInput, Product, ProductInput } from './model';

const storageKey = 'dental_flow_demo_v1';
type Scenario = 'normal' | 'slow' | 'read-error' | 'write-error';
interface DemoContextValue {
  data: DemoData; storageNotice: string; scenario: Scenario; generation: number; writePending: boolean;
  setScenario: (value: Scenario) => void;
  load: () => Promise<void>;
  saveBudget: (input: BudgetInput, id?: string) => Promise<Budget>;
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
    // Refresh only the fixed sample copy; keep stock balances and all visitor-created records.
    const seed = createSeed();
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
  async function transaction<T>(operation: () => T): Promise<T> {
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
    const now = new Date().toISOString();
    const budget: Budget = { ...input, id: existing?.id ?? uid(), code: existing?.code ?? `ORC-${String(current.budgets.length + 1).padStart(3, '0')}`, local: true, statusLabel: 'Registro local', approvedOn: '', history: [...(existing?.history ?? []), { id: uid(), date: now, actor: 'Você', description: existing ? 'Orçamento atualizado.' : 'Orçamento criado.' }] };
    persist({ ...current, budgets: existing ? current.budgets.map(value => value.id === existing.id ? budget : value) : [...current.budgets, budget] });
    return budget;
  }); }
  async function createProduct(input: ProductInput) { return transaction(() => {
    const current = latestData.current;
    const product: Product = { ...input, id: uid(), code: `MAT-${String(current.products.length + 1).padStart(3, '0')}` };
    persist({ ...current, products: [...current.products, product] });
    return product;
  }); }
  async function addEntry(input: EntryInput) { return transaction(() => {
    const current = latestData.current;
    if (!current.products.some(product => product.id === input.productId)) throw new Error('Este material não está disponível. Os dados preenchidos foram mantidos.');
    persist({ ...current, products: current.products.map(product => product.id === input.productId ? { ...product, quantity: product.quantity + input.quantity } : product), movements: [...current.movements, { ...input, id: uid(), type: 'Entrada', actor: 'Você', reason: 'Recebimento de material' }] });
  }); }
  async function addExit(input: ExitInput) { return transaction(() => {
    const current = latestData.current;
    const product = current.products.find(value => value.id === input.productId);
    if (!product) throw new Error('Este material não está disponível. Os dados preenchidos foram mantidos.');
    if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error('Informe uma quantidade inteira maior que zero.');
    if (input.quantity > product.quantity) throw new Error('A quantidade supera o saldo disponível. Revise a quantidade.');
    persist({ ...current, products: current.products.map(value => value.id === input.productId ? { ...value, quantity: value.quantity - input.quantity } : value), movements: [...current.movements, { ...input, id: uid(), type: 'Saída', actor: 'Você', supplier: '', purchaseCents: 0, lot: '', expiresOn: '' }] });
  }); }
  async function reset() { return transaction(() => { persist(createSeed()); setGeneration(value => value + 1); }); }
  async function load() { await delay(scenario === 'slow' ? 1500 : 200); if (scenario === 'read-error') throw new Error('Não foi possível carregar os registros. Tente novamente.'); }
  return <DemoContext.Provider value={{ data, storageNotice, scenario, generation, writePending, setScenario, load, saveBudget, createProduct, addEntry, addExit, reset }}>{children}</DemoContext.Provider>;
}
export function useDemo() { const value = useContext(DemoContext); if (!value) throw new Error('DemoProvider não disponível'); return value; }
