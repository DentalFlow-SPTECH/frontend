import { expect, test } from '@playwright/test';

// Integração contra a API real (backend em localhost:8080 com os dados de test/seed/seed_api.mjs).
// Rode com E2E_REAL_API=1; sem isso os testes são ignorados. Cria registros novos a cada execução.
test.skip(!process.env.E2E_REAL_API, 'defina E2E_REAL_API=1 com o backend local no ar');
test.describe.configure({ mode: 'serial' });

async function signIn(page, login) {
    await page.goto('./#/entrar');
    await page.getByLabel('Usuário').fill(login);
    await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD ?? 'senha123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/#\/hoje/);
}

test('recepção cadastra paciente, agenda, confirma e a API recusa o painel', async ({ page, isMobile }) => {
    test.skip(isMobile, 'um fluxo completo basta para a integração');
    const stamp = Date.now().toString().slice(-8);
    await signIn(page, 'carla');
    await page.goto('./#/pacientes/novo');
    await page.getByLabel('Nome completo').fill(`Teste Integração ${stamp}`);
    await page.getByLabel('CPF').fill(`900${stamp}`);
    await page.getByLabel('CEP').fill('01234567');
    await page.getByLabel('Bairro').fill('Centro');
    await page.getByLabel('Rua', { exact: true }).fill('Rua do Teste');
    await page.getByLabel('Número').fill('1');
    await page.getByRole('button', { name: 'Salvar paciente' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Teste Integração ${stamp}`);
    await page.getByRole('link', { name: 'Agendar consulta' }).click();
    await page.getByRole('group', { name: 'Dentista' }).getByRole('button').first().click();
    await page.getByRole('combobox', { name: 'Procedimento' }).click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Data').fill('2026-12-01');
    await page.getByLabel('Horário').fill('07:05');
    await page.getByRole('button', { name: 'Agendar consulta' }).click();
    const panel = page.getByRole('dialog');
    await expect(panel.getByRole('heading', { name: `Teste Integração ${stamp}` })).toBeVisible();
    await panel.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/confirmada/).first()).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Iniciar atendimento' })).toBeVisible();
    const response = await page.evaluate(async () => (await fetch('/dentalflow-api/v1/dashboard?year=2026&month=10', { headers: { 'X-Requested-With': 'XMLHttpRequest', Authorization: `Basic ${btoa('carla:senha123')}` } })).status);
    expect(response).toBe(403);
});

test('dentista vê o painel e o mapa do dia vindos da API', async ({ page, isMobile }) => {
    test.skip(isMobile, 'um fluxo completo basta para a integração');
    await signIn(page, 'ana');
    await page.goto('./#/painel');
    await expect(page.getByText('Saldo do mês')).toBeVisible();
    await page.goto('./#/mapa');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mapa do dia');
    await page.goto('./#/estoque');
    await expect(page.getByRole('link', { name: /Luva de procedimento/ })).toBeVisible();
});
