import { createSeed } from '../demo/seed.js';
import { readSnapshot, writeSnapshot } from './local/snapshot_storage.js';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
/** One local data session. Storage and waiting are injected for runtime-independent tests. */
export function createClinicSession({ storage, wait = delay }) {
    const initial = readSnapshot(storage);
    let snapshot = {
        data: initial.data,
        storageNotice: initial.notice,
        scenario: 'normal',
        generation: 0,
        writePending: false,
    };
    let writeLock = false;
    const listeners = new Set();
    function publish(update) {
        snapshot = { ...snapshot, ...update };
        listeners.forEach(listener => listener());
    }
    function persist(data) {
        writeSnapshot(storage, data);
        publish({ data, storageNotice: '' });
    }
    async function transaction(operation, recovery = false) {
        if (snapshot.storageNotice && !recovery)
            throw new Error('Os dados salvos não puderam ser abertos. Faça a recuperação dos dados antes de salvar novos registros. Seu preenchimento foi mantido.');
        if (writeLock)
            throw new Error('Há uma operação sendo salva. Aguarde a conclusão e tente novamente.');
        writeLock = true;
        const scenario = snapshot.scenario;
        publish({ writePending: true });
        try {
            await wait(scenario === 'slow' ? 1500 : 300);
            if (scenario === 'write-error')
                throw new Error('Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
            return operation();
        }
        finally {
            writeLock = false;
            publish({ writePending: false });
        }
    }
    function commit(change) {
        if (change.data) {
            const data = {
                ...change.data,
                audit: [...change.data.audit, {
                        id: crypto.randomUUID(), date: new Date().toISOString(), actor: 'Você',
                        action: change.action, record: change.record, recordPath: change.recordPath,
                    }],
            };
            persist(data);
        }
        return change.value;
    }
    async function load() {
        const scenario = snapshot.scenario;
        await wait(scenario === 'slow' ? 1500 : 200);
        if (scenario === 'read-error')
            throw new Error('Não foi possível carregar os registros. Tente novamente.');
    }
    return {
        getSnapshot: () => snapshot,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        setScenario: scenario => publish({ scenario }),
        transaction,
        commit,
        load,
        reset: () => transaction(() => {
            persist(createSeed());
            publish({ generation: snapshot.generation + 1 });
        }, true),
    };
}
