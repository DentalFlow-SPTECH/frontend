import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed.js';

const storageKey = 'dental_flow_demo_v1';
function populated() {
    const data = createSeed();
    const history = Array.from({ length: 24 }, (_, index) => ({ id: `history-${index}`, date: '2026-10-08', actor: 'Equipe fictícia', description: `Registro de teste ${index + 1}` }));
    data.patients = Array.from({ length: 24 }, (_, index) => ({ ...data.patients[0], id: index === 0 ? 'p1' : `patient-${index}`, code: `PAC-${index + 100}`, name: `Paciente fictício ${String(index + 1).padStart(2, '0')}`, history }));
    data.doctors = Array.from({ length: 24 }, (_, index) => ({ ...data.doctors[0], id: index === 0 ? 'd1' : `doctor-${index}`, name: `Doutor fictício ${String(index + 1).padStart(2, '0')}`, history }));
    data.budgets = Array.from({ length: 24 }, (_, index) => ({ ...data.budgets[0], id: `budget-${index}`, code: `ORC-${index + 100}`, doctorId: 'd1', patientId: 'p1', createdOn: '2026-10-08', history }));
    data.products = Array.from({ length: 24 }, (_, index) => ({ ...data.products[0], id: `product-${index}`, code: `MAT-${index + 100}`, name: `Material fictício ${String(index + 1).padStart(2, '0')}`, quantity: 24, minimum: 30 }));
    data.movements = data.products.flatMap(product => Array.from({ length: 24 }, (_, index) => ({ id: `${product.id}-movement-${index}`, productId: product.id, type: 'Entrada', quantity: 1, date: '2026-10-08', actor: 'Equipe fictícia', reason: 'Recebimento de teste', supplier: '', purchaseCents: 0, lot: '', expiresOn: '', observation: '' })));
    data.cashMovements = Array.from({ length: 24 }, (_, index) => ({ id: `cash-${index}`, type: index < 12 ? 'Entrada' : 'Saída', amountCents: index < 12 ? 1000 : 500, date: '2026-10-08', description: `Movimentação fictícia ${String(index + 1).padStart(2, '0')}`, category: '', paymentMethod: '', responsible: '', observation: '', history }));
    data.appointments = Array.from({ length: 24 }, (_, index) => ({ id: `appointment-${index}`, patientId: 'p1', doctorId: 'd1', date: '2026-10-08', time: `${String(index).padStart(2, '0')}:00`, duration: 30, procedure: 'Profilaxia', status: 'Agendada', observation: '', attendance: '', budgetId: '', cancelReason: '', history }));
    data.users = Array.from({ length: 24 }, (_, index) => ({ id: `user-${index}`, name: `Usuário fictício ${String(index + 1).padStart(2, '0')}`, login: `teste.${index}`, email: '', phone: '', profile: 'Recepção', permissions: [], blocked: false, history }));
    data.audit = Array.from({ length: 24 }, (_, index) => ({ id: `audit-${index}`, date: '2026-10-08T12:00:00Z', actor: 'Equipe fictícia', action: `Ação de teste ${index + 1}`, record: 'Registro fictício', recordPath: '' }));
    return data;
}
async function inject(page, data) {
    await page.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); }, { key: storageKey, data });
}
async function open(page, route) {
    await page.goto(`./#${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
}
// Listas simples mostram oito registros; listas com totais e filtros, seis; relações, históricos e auditoria, seis; consultas do dia, quatro.
const listings = [
    { route: '/pacientes', label: 'Pacientes', size: 8, filter: '#patient_search', term: 'Paciente fictício 01', back: 'Voltar aos pacientes' },
    { route: '/doutores', label: 'Doutores', size: 8, filter: '#doctor_search', term: 'Doutor fictício 01', back: 'Voltar aos doutores' },
    { route: '/estoque', label: 'Materiais', size: 8, filter: '#inventory_search', term: 'Material fictício 01', back: 'Voltar ao estoque' },
    { route: '/caixa', label: 'Movimentações do caixa', size: 6, filter: '#cash_type_filter', term: 'Entrada', back: 'Voltar ao caixa' },
    { route: '/administracao', label: 'Usuários', size: 6, filter: '#user_search', term: 'Usuário fictício 01', back: 'Voltar à administração' },
    { route: '/orcamentos?paciente=p1', label: 'Orçamentos', size: 6, back: 'Orçamentos do paciente' },
];
const range = (size, page, total = 24) => `Mostrando ${(page - 1) * size + 1}–${Math.min(page * size, total)} de ${total} registros`;
for (const listing of listings) test(`${listing.label}: limite, últimas páginas, filtros e retorno preservam registros`, async ({ page }) => {
    const data = populated();
    const { size } = listing;
    const pages = Math.ceil(24 / size);
    await inject(page, data);
    await open(page, listing.route);
    const list = page.locator(`[data-page-list="${listing.label}"]`);
    const rows = list.locator('tbody tr:visible, ul > li:visible');
    await expect(rows).toHaveCount(size);
    await expect(list.getByRole('status')).toHaveText(range(size, 1));
    await expect(list.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    // Em 1366 × 768 a busca e a paginação ficam na primeira tela, sem rolagem da página.
    if ((page.viewportSize()?.width ?? 0) >= 768) {
        const original = page.viewportSize();
        await page.setViewportSize({ width: 1366, height: 768 });
        await expect(list.getByRole('button', { name: 'Próxima' })).toBeInViewport({ ratio: 1 });
        expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
        await page.setViewportSize(original);
    }
    await list.getByRole('button', { name: 'Próxima' }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await expect(list.getByRole('group')).toBeFocused();
    await expect(list.getByRole('status')).toHaveText(range(size, 2));
    const selectedName = await list.locator('a:visible').first().innerText();
    await list.locator('a:visible').first().click();
    await page.getByRole('link', { name: listing.back, exact: false }).click();
    await expect(list.getByRole('status')).toHaveText(range(size, 2));
    await expect(list.locator('a:visible').first()).toHaveText(selectedName);
    await page.reload();
    await expect(list.getByRole('status')).toHaveText(range(size, 2));
    for (let current = 3; current <= pages; current++)
        await list.getByRole('button', { name: 'Próxima' }).click();
    await expect(rows).toHaveCount(24 - size * (pages - 1));
    await expect(list.getByRole('status')).toHaveText(range(size, pages));
    await expect(list.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    if (listing.filter) {
        const filter = page.locator(listing.filter);
        if (listing.filter === '#cash_type_filter') await filter.selectOption(listing.term);
        else await filter.fill(listing.term);
        await expect(page).not.toHaveURL(/pagina=/);
        await expect(list.getByRole('status')).toHaveText(listing.filter === '#cash_type_filter' ? range(size, 1, 12) : 'Mostrando 1–1 de 1 registro');
    }
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(JSON.stringify(data));
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('caixa mantém totais de toda a seleção e páginas inválidas permanecem limitadas', async ({ page }) => {
    await inject(page, populated());
    await open(page, '/caixa?pagina=99999');
    const list = page.locator('[data-page-list="Movimentações do caixa"]');
    await expect(list.getByRole('status')).toHaveText(range(6, 4));
    const totals = page.getByLabel('Totais de todas as movimentações da seleção').locator('dd');
    await expect(totals).toHaveText(['R$ 120,00', 'R$ 60,00', 'R$ 60,00']);
    await list.getByRole('button', { name: 'Anterior' }).click();
    await expect(totals).toHaveText(['R$ 120,00', 'R$ 60,00', 'R$ 60,00']);
    await open(page, '/caixa?pagina=-3');
    await expect(list.getByRole('status')).toHaveText(range(6, 1));
});

test('históricos, relações, auditoria e consultas do dia também têm limite', async ({ page }) => {
    const data = populated();
    await inject(page, data);
    for (const [route, labels, size = 6] of [
        ['/pacientes/p1', ['Histórico', 'Orçamentos do paciente']],
        ['/doutores/d1', ['Histórico', 'Consultas do doutor', 'Orçamentos do doutor']],
        ['/estoque/product-0', ['Movimentações do material']],
        ['/caixa/cash-0', ['Histórico']],
        ['/administracao/user-0', ['Histórico']],
        ['/administracao?aba=auditoria', ['Auditoria']],
        ['/orcamentos/budget-0', ['Histórico']],
        ['/agenda?date=2026-10-08&view=month', ['Consultas do dia'], 4],
        ['/agenda?date=2026-10-08&view=week', ['Consultas do dia'], 4],
    ]) {
        await open(page, route);
        for (const label of labels) {
            const list = page.locator(`[data-page-list="${label}"]:visible`);
            await expect(list.locator('ol > li, ul > li')).toHaveCount(size);
            await list.getByRole('button', { name: 'Próxima' }).click();
            await expect(list.getByRole('status')).toHaveText(range(size, 2));
        }
    }
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(JSON.stringify(data));
});

test('painel mostra indicadores do conjunto completo sem listas paginadas', async ({ page }) => {
    await inject(page, populated());
    await open(page, '/painel?date=2026-10-08');
    await expect(page.getByLabel('Indicadores de Outubro de 2026', { exact: true }).locator('dd > span').first()).toHaveText('24');
    await expect(page.getByRole('region', { name: 'Pendências', exact: true }).locator('li').last().locator('strong')).toHaveText('24');
    await expect(page.locator('[data-page-list]')).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('itens do orçamento preservam total, edição, validação em outra página e inclusão', async ({ page }) => {
    const data = populated();
    const budget = data.budgets[0];
    budget.local = true;
    budget.items = Array.from({ length: 11 }, (_, index) => ({ id: `item-${index}`, procedure: 'Profilaxia', quantity: 1, unitPriceCents: 18000, observation: '', tooth: '', surface: '' }));
    await inject(page, data);
    await open(page, '/orcamentos/budget-0');
    const navigation = page.getByRole('navigation', { name: 'Paginação de Itens do orçamento' });
    await expect(page.locator('[id$="_quantity"]')).toHaveCount(10);
    await expect(page.getByLabel('Resumo do orçamento')).toContainText('R$ 1.980,00');
    await page.locator('#item_item-0_quantity').fill('0');
    await navigation.getByRole('button', { name: 'Próxima' }).click();
    await expect(page.locator('[id$="_quantity"]')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Item 11', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.locator('#item_item-0_quantity')).toBeFocused();
    await page.locator('#item_item-0_quantity').fill('1');
    await page.locator('#budget_items').click();
    await expect(navigation.getByRole('status')).toHaveText('Mostrando 11–12 de 12 registros');
    await expect(page.getByRole('heading', { name: 'Item 12', exact: true })).toBeVisible();
    await expect(page.locator('[id$="_procedure"]').last()).toBeFocused();
    await page.getByRole('button', { name: 'Remover item 12', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.getByText('Orçamento salvo.', { exact: true })).toBeVisible();
    await page.reload();
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
    expect(saved.budgets[0].items).toHaveLength(11);
    expect(saved.budgets[0].items.every(item => item.quantity === 1)).toBe(true);
});
