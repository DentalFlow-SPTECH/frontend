import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function open(page, route = '/orcamentos') {
    await page.goto(`./#${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Carregando registros…')).toHaveCount(0, { timeout: 15_000 });
}
async function openReview(page) {
    if (!(await page.getByRole('dialog', { name: 'Revisão da interface' }).isVisible()))
        await page.keyboard.press('Control+Alt+r');
    await expect(page.getByRole('dialog', { name: 'Revisão da interface' })).toBeVisible();
}
async function scenario(page, value) {
    await openReview(page);
    await page.getByLabel('Cenário de revisão').selectOption(value);
    await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
    if (value !== 'read-error' && value !== 'slow')
        await expect(page.getByText('Carregando registros…')).toHaveCount(0);
}
async function createBudgetDraft(page) {
    await open(page, '/orcamentos/novo?paciente=p3');
    await page.getByLabel('Doutor', { exact: true }).selectOption('d1');
    await page.getByRole('button', { name: 'Adicionar procedimento', exact: true }).click();
    await page.getByLabel('Procedimento', { exact: true }).selectOption({ label: 'Profilaxia' });
    await page.getByLabel('Quantidade', { exact: true }).fill('2');
    await page.getByLabel('Valor unitário (R$)', { exact: true }).fill('250,00');
    await page.getByLabel('Observação do orçamento (opcional)').fill('Planejamento fictício para apresentação.');
}
test('paciente, orçamentos e estado vazio permanecem relacionados', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { name: 'Orçamentos', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Marina Albuquerque', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /ORC-001/ }).filter({ visible: true })).toBeVisible();
    if (await page.locator('#budget_patient_picker').isVisible())
        await page.getByLabel('Paciente', { exact: true }).selectOption('p3');
    else
        await page.getByRole('button', { name: /Beatriz Campos/ }).click();
    await expect(page.getByRole('heading', { name: 'Ainda não há orçamentos' })).toBeVisible();
    await page.getByRole('link', { name: 'Criar primeiro orçamento' }).click();
    await expect(page.getByLabel('Paciente', { exact: true })).toHaveValue('p3');
});
test('exemplos de orçamento são somente para consulta', async ({ page }) => {
    await open(page, '/orcamentos/b2');
    await expect(page.getByRole('heading', { name: 'Orçamento ORC-002', exact: true })).toBeVisible();
    await expect(page.getByText('Somente leitura', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Salvar|Aprovar|Remover/ })).toHaveCount(0);
    await expect(page.getByRole('complementary', { name: 'Resumo do orçamento' }).getByText('R$ 700,00', { exact: true })).toBeVisible();
});
test('orçamento valida campos, associa erro e foca a primeira correção', async ({ page }) => {
    await open(page, '/orcamentos/novo?paciente=p3');
    await page.getByLabel('Observação do orçamento (opcional)').fill('Manter esta observação.');
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.getByLabel('Doutor', { exact: true })).toBeFocused();
    await expect(page.getByLabel('Doutor', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Observação do orçamento (opcional)')).toHaveValue('Manter esta observação.');
    await page.getByLabel('Doutor', { exact: true }).selectOption('d1');
    await page.getByRole('button', { name: 'Adicionar procedimento', exact: true }).click();
    await page.getByLabel('Procedimento', { exact: true }).selectOption({ label: 'Profilaxia' });
    await page.getByLabel('Quantidade', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.getByLabel('Quantidade', { exact: true })).toBeFocused();
    await expect(page.getByText('Use uma quantidade inteira maior que zero.', { exact: true })).toBeVisible();
});
test('itens, falha de gravação, edição e recarregamento de orçamento', async ({ page }) => {
    await createBudgetDraft(page);
    await page.getByRole('button', { name: 'Adicionar procedimento', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.getByText('Revise os campos indicados', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Remover item 2/ }).click();
    await expect(page.getByText('Revise os campos indicados', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Procedimento', { exact: true })).toHaveCount(1);
    await expect(page.getByText('R$ 500,00', { exact: true })).toHaveCount(2);
    await scenario(page, 'write-error');
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.getByText('Não foi possível salvar', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Quantidade', { exact: true })).toHaveValue('2');
    await expect(page.getByLabel('Observação do orçamento (opcional)')).toHaveValue('Planejamento fictício para apresentação.');
    await scenario(page, 'normal');
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Orçamento ORC-004', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Quantidade', { exact: true })).toHaveValue('2');
    await page.getByLabel('Quantidade', { exact: true }).fill('3');
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.getByText('Orçamento salvo.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Quantidade', { exact: true })).toHaveValue('3');
    await expect(page.getByText('R$ 750,00', { exact: true })).toHaveCount(2);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dental_flow_demo_v1')));
    expect(stored.budgets.filter((budget) => budget.local)).toHaveLength(1);
    expect(stored.budgets.at(-1).history).toHaveLength(2);
});
test('aviso de alterações não salvas conserva o preenchimento ao permanecer', async ({ page }) => {
    await createBudgetDraft(page);
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('link', { name: 'Orçamentos do paciente', exact: false }).click();
    await expect(page.getByRole('heading', { name: 'Novo orçamento', exact: true })).toBeVisible();
    await expect(page.getByLabel('Valor unitário (R$)', { exact: true })).toHaveValue('250,00');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('link', { name: 'Orçamentos do paciente', exact: false }).click();
    await expect(page.getByRole('heading', { name: 'Orçamentos', exact: true })).toBeVisible();
});
test('busca, mínimo e retorno ao estoque preservam a seleção', async ({ page }) => {
    await open(page, '/estoque');
    await page.getByLabel('Buscar material', { exact: true }).fill('luvas');
    await page.getByLabel('Somente abaixo do mínimo').check();
    await page.getByRole('link', { name: 'Luvas de procedimento — tamanho M', exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('heading', { name: 'Luvas de procedimento — tamanho M', exact: true })).toBeVisible();
    await expect(page.getByText('Abaixo do mínimo', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar ao estoque', exact: false }).click();
    await expect(page.getByLabel('Buscar material', { exact: true })).toHaveValue('luvas');
    await expect(page.getByLabel('Somente abaixo do mínimo')).toBeChecked();
    await page.getByLabel('Buscar material', { exact: true }).fill('material inexistente');
    await expect(page.getByRole('heading', { name: 'Nenhum material encontrado' })).toBeVisible();
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(page.getByLabel('Buscar material', { exact: true })).toHaveValue('');
});
test('entrada com erro preserva formulário e atualiza saldo e histórico uma vez', async ({ page }) => {
    await open(page, '/estoque/s1/entrada');
    await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
    await expect(page.locator('#entry_quantity')).toBeFocused();
    await page.locator('#entry_quantity').fill('3');
    await page.getByText('Informações adicionais (opcional)', { exact: true }).click();
    await page.locator('#entry_supplier').fill('Fornecedor de apresentação');
    await page.locator('#entry_observation').fill('Recebimento fictício para demonstração.');
    await scenario(page, 'write-error');
    await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
    await expect(page.getByText('A entrada ainda não foi salva', { exact: true })).toBeVisible();
    await expect(page.locator('#entry_quantity')).toHaveValue('3');
    await expect(page.locator('#entry_supplier')).toHaveValue('Fornecedor de apresentação');
    await scenario(page, 'normal');
    await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Entrada registrada', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '11 caixa', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Ver material e histórico' }).click();
    await expect(page.getByText('No mínimo ou acima', { exact: true })).toBeVisible();
    await expect(page.getByText('Recebimento fictício para demonstração.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Recebimento fictício para demonstração.', { exact: true })).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dental_flow_demo_v1')));
    expect(stored.products.find((product) => product.id === 's1').quantity).toBe(11);
    expect(stored.movements.filter((movement) => movement.productId === 's1')).toHaveLength(3);
});
test('cadastro de material valida, conserva falha e persiste após recarregar', async ({ page }) => {
    await open(page, '/estoque/novo');
    await page.getByRole('button', { name: 'Salvar material', exact: true }).click();
    await expect(page.locator('#product_name')).toBeFocused();
    await page.locator('#product_name').fill('Gaze de demonstração');
    await page.locator('#product_unit').fill('pacote');
    await page.locator('#product_minimum').fill('3');
    await page.locator('#product_cost').fill('14,50');
    await scenario(page, 'write-error');
    await page.getByRole('button', { name: 'Salvar material', exact: true }).click();
    await expect(page.getByText('O material ainda não foi salvo', { exact: true })).toBeVisible();
    await expect(page.locator('#product_name')).toHaveValue('Gaze de demonstração');
    await scenario(page, 'normal');
    await page.getByRole('button', { name: 'Salvar material', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Material cadastrado', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Ver material', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nenhuma movimentação registrada' })).toBeVisible();
    await expect(page.getByText('Sem saldo', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Gaze de demonstração', exact: true })).toBeVisible();
    await expect(page.getByText('R$ 14,50', { exact: true })).toBeVisible();
});
test('carregamento e falha de leitura permitem recuperação sem perder busca', async ({ page }) => {
    await open(page, '/estoque?q=resina');
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 100));
    await scenario(page, 'slow');
    await expect(page.getByText('Carregando registros…')).toBeVisible();
    await page.clock.runFor(1600);
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
    await page.clock.resume();
    await scenario(page, 'read-error');
    await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
    await scenario(page, 'normal');
    await expect(page.getByLabel('Buscar material', { exact: true })).toHaveValue('resina');
    await expect(page.getByRole('link', { name: 'Resina composta — cor A2', exact: true }).filter({ visible: true })).toBeVisible();
});
test('restauração exige confirmação e desfaz só os dados demonstrativos', async ({ page }) => {
    await createBudgetDraft(page);
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Orçamento ORC-004', exact: true })).toBeVisible();
    await openReview(page);
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Restaurar dados de teste' }).click();
    await expect(page.getByRole('heading', { name: 'Orçamento ORC-004', exact: true })).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Restaurar dados de teste' }).click();
    await expect(page.getByRole('heading', { name: 'Orçamento não encontrado', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
    await page.getByRole('link', { name: 'Voltar aos orçamentos' }).click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dental_flow_demo_v1')));
    expect(stored.budgets).toHaveLength(3);
});
test('pacientes, teclado e menu móvel oferecem navegação funcional', async ({ page }, testInfo) => {
    await open(page, '/pacientes');
    await page.getByLabel('Buscar paciente', { exact: true }).fill('Beatriz');
    await page.getByRole('link', { name: 'Ver orçamentos de Beatriz Campos' }).click();
    await expect(page.getByRole('heading', { name: 'Ainda não há orçamentos' })).toBeVisible();
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => { const active = document.activeElement; return { tag: active.tagName, outline: getComputedStyle(active).outlineStyle }; });
    expect(focus.tag).not.toBe('BODY');
    expect(focus.outline).not.toBe('none');
    if (testInfo.project.name === 'mobile_375') {
        await page.getByRole('button', { name: 'Abrir navegação' }).click();
        await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Abrir navegação' })).toBeFocused();
        await page.getByRole('button', { name: 'Abrir navegação' }).click();
    }
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Estoque' }).click();
    await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible();
});
test('telas principais sem erros de acessibilidade, overflow ou falhas de JavaScript', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/orcamentos', '/orcamentos/b1', '/orcamentos/novo', '/estoque', '/estoque/s1', '/estoque/novo', '/estoque/s1/entrada', '/estoque/s1/saida', '/pacientes']) {
        await open(page, route);
        await expect(page.locator('main h1')).toHaveCount(1);
        await expect(page.getByText(/demonstração|fictíci|ilustrativ|próximas definições/i)).toHaveCount(0);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow, `Overflow em ${route}`).toBe(false);
        const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })), route).toEqual([]);
        if (['/orcamentos', '/estoque', '/orcamentos/novo', '/estoque/s1/saida'].includes(route))
            await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '_')}_${testInfo.project.name}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
});
test('dados locais ilegíveis têm recuperação explícita', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dental_flow_demo_v1', '{broken'));
    await open(page);
    await expect(page.getByText(/Não foi possível abrir os dados salvos/)).toBeVisible();
    await openReview(page);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Restaurar dados de teste' }).click();
    await expect(page.getByText(/Não foi possível abrir os dados salvos/)).toHaveCount(0);
});
test('endereço desconhecido oferece retorno e links com hash sobrevivem ao reload', async ({ page }) => {
    await open(page, '/nao-existe');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar ao Painel' }).click();
    await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
    await open(page, '/estoque/s2');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Resina composta — cor A2' })).toBeVisible();
    await expect(page.locator('img').filter({ visible: true })).toHaveCount(test.info().project.name === 'desktop' ? 1 : 0);
});
test('fontes, marca e arquivos carregam localmente sem chamada de API', async ({ page, baseURL }) => {
    const failed = [];
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    page.on('response', response => { if (response.status() >= 400)
        failed.push(`${response.status()} ${response.url()}`); });
    await open(page);
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator('img').evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
    const origin = new URL(baseURL).origin;
    expect(requests.filter(url => url.startsWith('http') && new URL(url).origin !== origin)).toEqual([]);
    expect(requests.filter(url => /\/api\/|\/v1\//.test(url))).toEqual([]);
    expect(failed).toEqual([]);
});
test('gravação pendente impede restauração e descarte de um envio em andamento', async ({ page }) => {
    await createBudgetDraft(page);
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 100));
    await scenario(page, 'slow');
    await page.clock.runFor(1600);
    await expect(page.getByRole('button', { name: 'Salvar orçamento', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await openReview(page);
    await expect(page.getByRole('button', { name: 'Restaurar dados de teste' })).toBeDisabled();
    await expect(page.getByLabel('Cenário de revisão')).toBeDisabled();
    await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
    page.once('dialog', dialog => { expect(dialog.type()).toBe('alert'); return dialog.accept(); });
    await page.getByRole('link', { name: 'Orçamentos do paciente', exact: false }).click();
    await expect(page.getByRole('heading', { name: 'Novo orçamento', exact: true })).toBeVisible();
    await page.clock.runFor(2000);
    await expect(page.getByRole('heading', { name: 'Orçamento ORC-004', exact: true })).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dental_flow_demo_v1')));
    expect(stored.budgets).toHaveLength(4);
});
test('mudar o material na rota de entrada reinicia o formulário e a confirmação', async ({ page }) => {
    await open(page, '/estoque/s1/entrada');
    await page.locator('#entry_quantity').fill('2');
    await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Entrada registrada', exact: true })).toBeVisible();
    await page.evaluate(() => { window.location.hash = '#/estoque/s2/entrada'; });
    await expect(page.getByRole('heading', { name: 'Registrar entrada', exact: true })).toBeVisible();
    await expect(page.locator('#entry_quantity')).toHaveValue('');
    await expect(page.getByRole('heading', { name: 'Entrada registrada', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Resina composta — cor A2', exact: true })).toBeVisible();
});
test('saída valida quantidade, motivo e impede saldo negativo', async ({ page }) => {
    await open(page, '/estoque/s1/saida');
    await page.getByRole('button', { name: 'Salvar saída', exact: true }).click();
    await expect(page.locator('#exit_quantity')).toBeFocused();
    await page.locator('#exit_quantity').fill('9');
    await page.locator('#exit_reason').selectOption('Consumo interno');
    await page.locator('#exit_observation').fill('Separação para o atendimento.');
    await page.getByRole('button', { name: 'Salvar saída', exact: true }).click();
    await expect(page.getByText('A quantidade supera o saldo disponível. Revise a quantidade.', { exact: true })).toBeVisible();
    await expect(page.locator('#exit_quantity')).toBeFocused();
    await expect(page.locator('#exit_observation')).toHaveValue('Separação para o atendimento.');
    expect(await page.evaluate(() => localStorage.getItem('dental_flow_demo_v1'))).toBeNull();
    await page.locator('#exit_quantity').fill('2');
    await page.locator('#exit_reason').selectOption('');
    await page.getByRole('button', { name: 'Salvar saída', exact: true }).click();
    await expect(page.locator('#exit_reason')).toBeFocused();
});
test('saída preserva falha, retira saldo uma vez e mantém histórico ao recarregar', async ({ page }) => {
    await open(page, '/estoque/s1?q=luvas&abaixo=1');
    await page.getByRole('link', { name: 'Registrar saída', exact: true }).click();
    await page.locator('#exit_quantity').fill('3');
    await page.locator('#exit_reason').selectOption('Consumo interno');
    await page.locator('#exit_observation').fill('Materiais separados para uso.');
    await expect(page.getByText('Quantidade após a saída:')).toContainText('5 caixa');
    await scenario(page, 'write-error');
    await page.getByRole('button', { name: 'Salvar saída', exact: true }).click();
    await expect(page.getByText('A saída ainda não foi salva', { exact: true })).toBeVisible();
    await expect(page.locator('#exit_quantity')).toHaveValue('3');
    await expect(page.locator('#exit_reason')).toHaveValue('Consumo interno');
    await expect(page.locator('#exit_observation')).toHaveValue('Materiais separados para uso.');
    await scenario(page, 'normal');
    await page.getByRole('button', { name: 'Salvar saída', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Saída registrada', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '5 caixa', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar saída', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Ver material e histórico' }).click();
    await expect(page.getByText('Materiais separados para uso.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Materiais separados para uso.', { exact: true })).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dental_flow_demo_v1')));
    expect(stored.products.find((product) => product.id === 's1').quantity).toBe(5);
    expect(stored.movements.filter((movement) => movement.productId === 's1')).toHaveLength(3);
    expect(stored.movements.at(-1)).toMatchObject({ type: 'Saída', quantity: 3, reason: 'Consumo interno' });
    await page.getByRole('link', { name: 'Voltar ao estoque', exact: false }).click();
    await expect(page.getByLabel('Buscar material', { exact: true })).toHaveValue('luvas');
    await expect(page.getByLabel('Somente abaixo do mínimo')).toBeChecked();
});
test('material sem estoque orienta entrada e retirada total resulta em saldo zero', async ({ page }) => {
    await open(page, '/estoque/s5/saida');
    await expect(page.getByText('Material sem estoque', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar saída', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Registrar entrada', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Registrar entrada', exact: true })).toBeVisible();
    await open(page, '/estoque/s1/saida');
    await page.locator('#exit_quantity').fill('8');
    await page.locator('#exit_reason').selectOption('Procedimento');
    await page.getByRole('button', { name: 'Salvar saída', exact: true }).click();
    await expect(page.getByRole('heading', { name: '0 caixa', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Ver material e histórico' }).click();
    await page.getByRole('link', { name: 'Registrar saída', exact: true }).click();
    await expect(page.getByText('Material sem estoque', { exact: true })).toBeVisible();
});
test('erro em informação recolhida abre a seção e foca o campo', async ({ page }) => {
    await open(page, '/estoque/s1/entrada');
    await page.locator('#entry_quantity').fill('2');
    await page.getByText('Informações adicionais (opcional)', { exact: true }).click();
    await page.locator('#entry_purchase').fill('12,345');
    await page.getByText('Informações adicionais (opcional)', { exact: true }).click();
    await page.getByRole('button', { name: 'Salvar entrada', exact: true }).click();
    await expect(page.locator('#entry_purchase')).toBeVisible();
    await expect(page.locator('#entry_purchase')).toBeFocused();
    await expect(page.locator('#entry_purchase')).toHaveValue('12,345');
    await expect(page.locator('#entry_quantity')).toHaveValue('2');
});
test('revisão fica fora da navegação e o teclado conserva foco e formulário', async ({ page }) => {
    await createBudgetDraft(page);
    await page.getByLabel('Valor unitário (R$)', { exact: true }).focus();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByText('Revisão')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Revisão da interface' })).toHaveCount(0);
    await openReview(page);
    await expect(page.getByLabel('Cenário de revisão')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Revisão da interface' })).toHaveCount(0);
    await expect(page.getByLabel('Valor unitário (R$)', { exact: true })).toBeFocused();
    await expect(page.getByLabel('Valor unitário (R$)', { exact: true })).toHaveValue('250,00');
    page.once('dialog', dialog => dialog.accept());
    await open(page, '/revisao');
    await expect(page.getByRole('heading', { name: 'Revisão da interface', exact: true })).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
    await page.getByRole('link', { name: 'Voltar aos orçamentos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Orçamentos', exact: true })).toBeVisible();
});
test('textos secundários têm contraste forte e rótulos legíveis', async ({ page }) => {
    await open(page, '/estoque/novo');
    const readability = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        const foreground = styles.getPropertyValue('--muted').trim();
        const backgrounds = ['#ffffff', styles.getPropertyValue('--canvas').trim()];
        function luminance(hex) {
            const rgb = hex.replace('#', '').match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
            return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        }
        const ratios = backgrounds.map(background => (luminance(background) + 0.05) / (luminance(foreground) + 0.05));
        const labelSizes = [...document.querySelectorAll('main label')].map(label => parseFloat(getComputedStyle(label).fontSize));
        return { ratios, labelSizes };
    });
    expect(Math.min(...readability.ratios)).toBeGreaterThanOrEqual(7);
    expect(Math.min(...readability.labelSizes)).toBeGreaterThanOrEqual(16);
});
