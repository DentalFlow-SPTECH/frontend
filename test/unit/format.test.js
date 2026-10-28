import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, ageOf, brl, dateLong, firstName, initials, maskCep, maskCnpj, maskCpf, maskPhone, percent, rangeLabel, startOfWeek, whatsappLink } from '../../src/component/format.js';

test('máscaras de CPF, CNPJ, celular e CEP aceitam digitação parcial', () => {
    assert.equal(maskCpf('12345678900'), '123.456.789-00');
    assert.equal(maskCpf('1234'), '123.4');
    assert.equal(maskCnpj('12345678000199'), '12.345.678/0001-99');
    assert.equal(maskPhone('11987654321'), '(11) 98765-4321');
    assert.equal(maskPhone('1133334444'), '(11) 3333-4444');
    assert.equal(maskPhone('11'), '(11');
    assert.equal(maskCep('01234567'), '01234-567');
});

test('datas locais não passam por UTC e a semana começa na segunda', () => {
    assert.equal(startOfWeek('2026-10-28'), '2026-10-26');
    assert.equal(startOfWeek('2026-11-01'), '2026-10-26');
    assert.equal(addDays('2026-10-31', 1), '2026-11-01');
    assert.equal(dateLong('2026-10-28'), 'Quarta, 28 de outubro');
    assert.equal(rangeLabel('2026-10-26', '2026-11-01'), '26 de outubro a 1 de novembro');
    assert.equal(ageOf('2010-10-29', new Date(2026, 9, 28)), 15);
    assert.equal(ageOf('2010-10-28', new Date(2026, 9, 28)), 16);
});

test('nomes, valores e WhatsApp seguem o padrão brasileiro', () => {
    assert.equal(initials('Dra. Ana Clara Lima'), 'AL');
    assert.equal(firstName('Dra. Ana Lima'), 'Dra. Ana');
    assert.equal(firstName('Maria Oliveira'), 'Maria');
    assert.match(brl(1234.5), /R\$\s1\.234,50/);
    assert.equal(percent(12.5), '12,5%');
    assert.equal(whatsappLink('(11) 98765-4321'), 'https://wa.me/5511987654321');
    assert.equal(whatsappLink('123'), null);
});
