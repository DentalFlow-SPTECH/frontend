import { expect, test } from '@playwright/test';
import { signIn, useFakeApi } from './fake_api.js';

test.describe('painel, estoque e mapa do dia', () => {
    test('painel mostra indicadores e alertas sem multiplicar percentuais', async ({ page }) => {
        await useFakeApi(page);
        await signIn(page, 'ana', '/painel');
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Painel de outubro');
        await expect(page.getByText('Faltas acima do esperado')).toBeVisible();
        await expect(page.getByText('R$ 1.300,00').first()).toBeVisible();
        await expect(page.getByText('Sobrou 89,7% do que entrou')).toBeVisible();
        await expect(page.getByRole('group', { name: 'Entradas e saídas por dia do mês' })).toBeVisible();
        await expect(page.getByText('Concluídas 62,5%')).toBeVisible();
    });

    test('estoque avisa reposição, impede saída maior que o saldo e registra entrada', async ({ page }) => {
        const db = await useFakeApi(page);
        await signIn(page, 'ana', '/estoque');
        await expect(page.getByText('1 material precisa de reposição')).toBeVisible();
        await page.getByRole('link', { name: /Máscara descartável/ }).click();
        await page.getByRole('button', { name: 'Registrar saída' }).click();
        const panel = page.getByRole('dialog');
        await panel.getByLabel(/Quantidade/).fill('5');
        await panel.getByRole('button', { name: 'Registrar saída' }).click();
        await expect(panel.getByText('Há somente 2 em estoque.')).toBeVisible();
        await panel.getByRole('group', { name: 'Tipo de movimentação' }).getByRole('button', { name: 'Entrada' }).click();
        await panel.getByLabel(/Quantidade/).fill('10');
        await panel.getByLabel('Motivo (opcional)').fill('Compra do fornecedor');
        await panel.getByRole('button', { name: 'Registrar entrada' }).click();
        await expect(page.getByText('Entrada registrada').first()).toBeVisible();
        await expect(page.getByText('Entrada de 10 caixa')).toBeVisible();
        expect(db.products.find(item => item.id === 2).currentStock).toBe(12);
    });

    test('mapa do dia traz as consultas, salva, e só fecha depois de conferido', async ({ page }) => {
        const db = await useFakeApi(page);
        await signIn(page, 'ana', '/mapa/novo?data=2026-10-28');
        await expect(page.getByText(/Trouxemos 3 consultas da sua agenda/)).toBeVisible();
        await expect(page.getByLabel('Paciente', { exact: true }).first()).toHaveValue('Maria Oliveira');
        await page.getByRole('button', { name: 'Adicionar despesa' }).click();
        await page.getByLabel('Descrição').last().fill('Material de limpeza');
        await page.getByLabel('Valor').last().fill('20');
        await page.getByRole('button', { name: 'Salvar mapa' }).click();
        await expect(page.getByText('Mapa do dia salvo').first()).toBeVisible();
        const saved = db.dailyMaps.at(-1);
        expect(saved.visits.map(visit => visit.patientName)).toEqual(['Maria Oliveira', 'Ana Clara Mendes', 'Gabriel Souza']);
        expect(saved.expenses).toEqual([{ description: 'Material de limpeza', value: 20 }]);
        await expect(page.getByRole('button', { name: 'Fechar mapa' })).toBeDisabled();
        await page.getByRole('link', { name: 'Editar' }).click();
        await page.getByRole('button', { name: 'Marcar todos como conferidos' }).click();
        await page.getByRole('button', { name: 'Salvar mapa' }).click();
        await page.getByRole('button', { name: 'Fechar mapa' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Fechar mapa' }).click();
        await expect(page.getByText('Mapa fechado e conferido').first()).toBeVisible();
        expect(db.dailyMaps.at(-1).status).toBe('FECHADO');
        await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
    });
});
