import test from 'node:test';
import assert from 'node:assert/strict';
import { pageList, paginate } from '../../src/component/pagination.js';
import { composeAddress, composeClinicAddress, splitAddress, splitClinicAddress } from '../../src/component/address.js';
import { moneyShort } from '../../src/component/format.js';
import { chartTotals, niceScale } from '../../src/feature/dashboard/model/dashboard_model.js';
import { createCepApi } from '../../src/data/api/cep_api.js';

test('paginação limita a página pedida e informa o intervalo mostrado', () => {
    const items = Array.from({ length: 45 }, (_, index) => index + 1);
    assert.deepEqual(paginate(items, 2, 20), { items: items.slice(20, 40), page: 2, pageCount: 3, total: 45, from: 21, to: 40 });
    assert.equal(paginate(items, 9, 20).page, 3);
    assert.equal(paginate(items, 'x', 20).page, 1);
    assert.deepEqual(paginate([], null, 20), { items: [], page: 1, pageCount: 1, total: 0, from: 0, to: 0 });
    assert.deepEqual(pageList(1, 1), [1]);
    assert.deepEqual(pageList(1, 5), [1, 2, '…', 5]);
    assert.deepEqual(pageList(3, 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(pageList(6, 12), [1, '…', 5, 6, 7, '…', 12]);
});

test('endereço: monta e separa rua, número e complemento sem perder texto', () => {
    assert.equal(composeAddress({ street: 'Rua A', number: '10', complement: '' }), 'Rua A, 10');
    assert.equal(composeAddress({ street: ' Praça da Sé ', number: '100', complement: 'Sala 2' }), 'Praça da Sé, 100 - Sala 2');
    assert.deepEqual(splitAddress('Praça da Sé, 100 - Sala 2'), { street: 'Praça da Sé', number: '100', complement: 'Sala 2' });
    assert.deepEqual(splitAddress('Rua B, s/n'), { street: 'Rua B', number: 's/n', complement: '' });
    for (const legacy of ['Avenida Paulista 1000', 'Rua X, fundos', 'Rua X, 12, casa 2', ''])
        assert.equal(composeAddress(splitAddress(legacy)), legacy);
    const clinic = { street: 'Rua X', number: '123', complement: 'Sala 2', neighborhood: 'Vila Mariana', city: 'São Paulo', state: 'SP', zipCode: '04010-100' };
    assert.equal(composeClinicAddress({ ...clinic, state: 'sp' }), 'Rua X, 123 - Sala 2, Vila Mariana, São Paulo/SP, 04010-100');
    assert.deepEqual(splitClinicAddress('Rua X, 123 - Sala 2, Vila Mariana, São Paulo/SP, 04010-100'), clinic);
    for (const legacy of ['Rua das Flores, 100', 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP'])
        assert.equal(composeClinicAddress(splitClinicAddress(legacy)), legacy);
});

test('gráfico: eixo com valores redondos e valores curtos em reais', () => {
    assert.deepEqual(niceScale(720), { max: 800, ticks: [0, 200, 400, 600, 800] });
    assert.deepEqual(niceScale(5430).ticks, [0, 2000, 4000, 6000]);
    assert.deepEqual(niceScale(0), { max: 1, ticks: [0, 1] });
    assert.deepEqual(chartTotals([{ generalGross: 450, totalOutflows: 50 }, { generalGross: '600', totalOutflows: 60 }]), { gross: 1050, outflows: 110 });
    assert.equal(moneyShort(800), 'R$ 800');
    assert.equal(moneyShort(1200), 'R$ 1,2 mil');
    assert.equal(moneyShort(2500000), 'R$ 2,5 mi');
});

test('ViaCEP: só manda o CEP, sem credenciais; CEP inexistente vira null e demora vira erro', async () => {
    const calls = [];
    const reply = body => async (url, options) => {
        calls.push({ url, options });
        return { ok: true, status: 200, json: async () => body };
    };
    const found = await createCepApi({ fetch: reply({ cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' }) }).lookup('01001-000');
    assert.deepEqual(found, { zipCode: '01001-000', street: 'Praça da Sé', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' });
    assert.equal(calls[0].url, 'https://viacep.com.br/ws/01001000/json/');
    assert.equal(calls[0].options.credentials, 'omit');
    assert.equal(calls[0].options.headers, undefined);
    assert.equal(await createCepApi({ fetch: reply({ erro: true }) }).lookup('99999999'), null);
    assert.equal(await createCepApi({ fetch: reply({}) }).lookup('0100'), null);
    assert.equal(calls.length, 2);
    const never = (_, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('tempo esgotado'))));
    await assert.rejects(createCepApi({ fetch: never, timeout: 10 }).lookup('01001000'));
});
