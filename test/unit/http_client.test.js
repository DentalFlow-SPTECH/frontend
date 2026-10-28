import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, createHttpClient, toApiError } from '../../src/data/api/http_client.js';
import { createApi } from '../../src/data/api/api.js';
import { createSession } from '../../src/data/session.js';

// Adapter falso do axios: registra a requisição e responde como a API.
function fakeAdapter(handler) {
    const calls = [];
    const adapter = async config => {
        calls.push(config);
        const { status, data } = handler(config);
        const response = { data, status, statusText: '', headers: {}, config, request: {} };
        if (status >= 400) {
            const error = new Error(`Request failed with status code ${status}`);
            error.response = response;
            error.config = config;
            throw error;
        }
        return response;
    };
    return { adapter, calls };
}

test('envia Basic Auth em todas as chamadas e devolve somente `data`', async () => {
    const session = createSession();
    session.start({ login: 'ana', password: 'senha123' }, { id: 1, clinicId: 1 });
    const { adapter, calls } = fakeAdapter(() => ({ status: 200, data: { status: 200, message: 'ok', data: [{ id: 3 }], timestamp: '' } }));
    const api = createApi(createHttpClient({ getCredentials: session.getCredentials, adapter, baseURL: '/api' }));
    const dentists = await api.dentist.list({ clinicId: 1 });
    assert.deepEqual(dentists, [{ id: 3 }]);
    assert.deepEqual(calls[0].auth, { username: 'ana', password: 'senha123' });
    assert.equal(calls[0].headers['X-Requested-With'], 'XMLHttpRequest');
    assert.deepEqual(calls[0].params, { clinicId: 1 });
});

test('PATCH de situação usa query string e não tem corpo', async () => {
    const { adapter, calls } = fakeAdapter(() => ({ status: 200, data: { data: { id: 9, status: 'CONFIRMADO' } } }));
    const api = createApi(createHttpClient({ getCredentials: () => null, adapter, baseURL: '/api' }));
    await api.appointment.setStatus(9, 'CONFIRMADO');
    assert.equal(calls[0].method, 'patch');
    assert.equal(calls[0].url, '/appointment/9/status');
    assert.deepEqual(calls[0].params, { status: 'CONFIRMADO' });
});

test('401 durante o uso encerra a sessão; 401 no login não', async () => {
    let expired = 0;
    const { adapter } = fakeAdapter(() => ({ status: 401, data: '' }));
    const api = createApi(createHttpClient({ getCredentials: () => ({ login: 'a', password: 'b' }), onUnauthorized: () => { expired += 1; }, adapter, baseURL: '/api' }));
    await assert.rejects(api.me({ login: 'a', password: 'errada' }), error => error.status === 401 && error.code === 'AUTH001');
    assert.equal(expired, 0);
    await assert.rejects(api.patient.list({ clinicId: 1 }));
    assert.equal(expired, 1);
});

test('erros seguem o formato ApiError com mensagens próprias para 401/403/5xx', () => {
    const business = toApiError({ response: { status: 422, data: { code: 'BSN001', status: 422, message: 'Já existe um paciente cadastrado com este CPF na mesma clínica.' } } });
    assert.ok(business instanceof ApiError);
    assert.equal(business.code, 'BSN001');
    assert.match(business.message, /CPF/);
    assert.equal(toApiError({ response: { status: 403, data: { code: 'AUTH002', message: 'Acesso n�o permitido' } } }).message, 'Seu perfil não tem acesso a esta área.');
    assert.equal(toApiError({ response: { status: 500, data: { code: 'DTBS001', message: 'SQL error' } } }).message, 'Algo deu errado do nosso lado. Tente de novo em instantes.');
    assert.equal(toApiError(new Error('Network Error')).code, 'NETWORK');
});
