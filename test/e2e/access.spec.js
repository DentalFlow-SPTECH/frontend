import { expect, test } from '@playwright/test';
import { signIn, useFakeApi } from './fake_api.js';

test.describe('acesso e perfis', () => {
    test('entrar valida campos, recusa senha errada sem janela do navegador e leva para Hoje', async ({ page }) => {
        test.setTimeout(60_000);
        await useFakeApi(page);
        page.on('dialog', dialog => { throw new Error(`diálogo inesperado: ${dialog.message()}`); });
        await page.goto('./#/hoje');
        await expect(page).toHaveURL(/#\/entrar\?volta=%2Fhoje/);
        await page.getByRole('button', { name: 'Entrar' }).click();
        await expect(page.getByText('Informe o seu usuário.')).toBeVisible();
        await expect(page.getByText('Informe a sua senha.')).toBeVisible();
        await page.getByLabel('Usuário').fill('ana');
        await page.getByLabel('Senha', { exact: true }).fill('errada');
        await page.getByRole('button', { name: 'Entrar' }).click();
        await expect(page.getByRole('alert')).toContainText('Usuário ou senha incorretos');
        await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
        await page.getByLabel('Senha', { exact: true }).fill('senha123');
        await page.getByRole('button', { name: 'Mostrar senha' }).click();
        await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text');
        await page.getByRole('button', { name: 'Entrar' }).click();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bom dia, Dra. Ana');
    });

    test('recepção não vê Painel, Mapa do dia nem Estoque e recebe tela de sem acesso', async ({ page, isMobile }) => {
        await useFakeApi(page);
        await signIn(page, 'carla');
        if (isMobile)
            await page.getByRole('button', { name: 'Mais' }).click();
        const nav = isMobile ? page.getByRole('dialog') : page.getByRole('navigation', { name: 'Navegação principal' }).first();
        await expect(nav.getByRole('link', { name: /Clínica/ })).toBeVisible();
        for (const name of ['Painel', 'Mapa do dia', 'Estoque'])
            await expect(nav.getByRole('link', { name })).toHaveCount(0);
        await page.goto('./#/painel');
        await expect(page.getByText('Esta área é do dentista responsável')).toBeVisible();
        await page.goto('./#/clinica/dentistas');
        await expect(page.getByText('Somente o dentista responsável pode cadastrar ou alterar')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Novo dentista' })).toHaveCount(0);
    });

    test('sair apaga a sessão e a página protegida volta a pedir login', async ({ page }) => {
        await useFakeApi(page);
        await signIn(page, 'ana');
        await page.getByRole('button', { name: /Conta de Dra. Ana Lima/ }).click();
        await page.getByRole('menuitem', { name: 'Sair' }).click();
        await expect(page).toHaveURL(/#\/entrar$/);
        // Espera a navegação de saída terminar; trocar o endereço no mesmo instante interrompe o roteador.
        await expect(page.getByLabel('Usuário')).toBeVisible();
        await page.goto('./#/pacientes');
        await expect(page.getByLabel('Usuário')).toBeVisible({ timeout: 15_000 });
        await expect(page).toHaveURL(/#\/entrar/);
    });

    test('sessão recusada pela API no meio do uso volta para Entrar com aviso', async ({ page }) => {
        await useFakeApi(page);
        await signIn(page, 'ana');
        // Recusa todas as chamadas e abre uma tela que sempre consulta a API (pacientes ficam em cache após Hoje).
        await page.route('**/dentalflow-api/v1/**', route => route.fulfill({ status: 401, body: '' }));
        await page.goto('./#/clinica');
        await expect(page).toHaveURL(/#\/entrar/);
        await expect(page.getByText('Sua sessão terminou. Entre novamente para continuar.')).toBeVisible();
    });
});
