import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, idleLimit, sessionKey } from '../../src/data/session.js';

function memoryStorage() {
    const data = new Map();
    return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key), data };
}

test('sessão sobrevive ao recarregar (mesmo armazenamento) e não guarda a senha em texto puro', () => {
    const storage = memoryStorage();
    let time = 1_000_000;
    const first = createSession({ storage, now: () => time });
    first.start({ login: 'ana', password: 'segredo-ç' }, { id: 1, name: 'Dra. Ana' });
    assert.ok(!storage.data.get(sessionKey).includes('segredo'));
    time += 60_000;
    const reopened = createSession({ storage, now: () => time });
    assert.deepEqual(reopened.getCredentials(), { login: 'ana', password: 'segredo-ç' });
    assert.equal(reopened.user().name, 'Dra. Ana');
    assert.equal(reopened.getSnapshot().restored, true);
});

test('30 minutos sem uso encerram a sessão; sair apaga o armazenamento', () => {
    const storage = memoryStorage();
    let time = 0;
    const session = createSession({ storage, now: () => time });
    session.start({ login: 'carla', password: 'x' }, { id: 2 });
    time += 20_000;
    session.touch();
    time += idleLimit + 1;
    const reopened = createSession({ storage, now: () => time });
    assert.equal(reopened.user(), null);
    assert.match(reopened.getSnapshot().notice, /inatividade/);
    assert.equal(storage.data.has(sessionKey), false);
    const active = createSession({ storage, now: () => time });
    active.start({ login: 'carla', password: 'x' }, { id: 2 });
    active.end('', 'signed_out');
    assert.equal(storage.data.has(sessionKey), false);
});

test('sem armazenamento disponível a sessão continua só em memória', () => {
    const broken = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } };
    const session = createSession({ storage: broken });
    session.start({ login: 'ana', password: 'x' }, { id: 1 });
    assert.equal(session.user().id, 1);
});
