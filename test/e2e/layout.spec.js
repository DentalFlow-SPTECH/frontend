import { expect, test } from '@playwright/test';
import { signIn, useFakeApi } from './fake_api.js';

// Refatoração de usabilidade (28/10/2026): formulários centralizados, colunas com rótulo, paginação,
// busca no lugar de dropdown, CEP pelo ViaCEP e gráfico de entradas e saídas legível.
test.describe('refatoração de usabilidade', () => {
    test('formulários ficam no centro da página, com o título alinhado ao formulário', async ({ page, isMobile }) => {
        test.skip(isMobile, 'no celular o formulário já ocupa a largura toda');
        await useFakeApi(page);
        await signIn(page, 'ana', '/clinica');
        const routes = {
            '/clinica/dentistas/4/editar': 'Editar dentista', '/clinica/procedimentos/1/editar': 'Editar procedimento', '/clinica/editar': 'Dados da clínica',
            '/clinica/usuarios/novo': 'Criar acesso', '/estoque/materiais/1/editar': 'Editar material', '/estoque/equipamentos/1/editar': 'Editar equipamento',
            '/pacientes/novo': 'Novo paciente', '/agenda/nova': 'Agendar consulta', '/mapa/novo': 'Lançar mapa do dia',
        };
        for (const [route, title] of Object.entries(routes)) {
            await page.goto(`./#${route}`);
            await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
            await page.locator('main form').waitFor();
            const box = await page.evaluate(() => {
                const main = document.querySelector('main').getBoundingClientRect();
                const form = document.querySelector('main form').getBoundingClientRect();
                const title = document.querySelector('main h1').getBoundingClientRect();
                return { offset: Math.abs(main.left + main.width / 2 - (form.left + form.width / 2)), title: Math.abs(title.left - form.left) };
            });
            expect(box.offset, route).toBeLessThan(2);
            expect(box.title, route).toBeLessThan(2);
        }
    });

    test('pacientes: colunas com rótulo e paginação que volta para a mesma página', async ({ page, isMobile }) => {
        const db = await useFakeApi(page);
        for (let index = 0; index < 25; index++)
            db.patients.push({ ...db.patients[0], id: 200 + index, name: `Paciente Extra ${String(index).padStart(2, '0')}`, cpf: `700.111.222-${String(index).padStart(2, '0')}` });
        await signIn(page, 'carla', '/pacientes');
        await expect(page.getByText('Mostrando 1–20 de 35 pacientes')).toBeVisible();
        if (!isMobile) {
            for (const column of ['Paciente', 'Celular', 'CPF'])
                await expect(page.locator('[aria-hidden="true"]').getByText(column, { exact: true })).toBeVisible();
            await expect(page.getByRole('link', { name: /^Ana Clara Mendes.*Celular: \(11\) 98888-0000.*CPF: 100\.111\.222-00/ })).toBeVisible();
        }
        await page.getByRole('button', { name: 'Próxima' }).click();
        await expect(page).toHaveURL(/pagina=2/);
        await expect(page.getByText('Mostrando 21–35 de 35 pacientes')).toBeVisible();
        await page.getByRole('link', { name: /^Sônia Martins/ }).click();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sônia Martins');
        await page.goBack();
        await expect(page.getByText('Mostrando 21–35 de 35 pacientes')).toBeVisible();
        await page.getByLabel('Buscar paciente').fill('extra 0');
        await expect(page).not.toHaveURL(/pagina=/);
        await expect(page.getByText('10 pacientes encontrados')).toBeVisible();
    });

    test('CEP preenche rua e bairro pelo ViaCEP e o foco vai para o número', async ({ page }) => {
        const db = await useFakeApi(page);
        await signIn(page, 'carla', '/pacientes/novo');
        await page.getByLabel('Nome completo').fill('Paula Teixeira');
        await page.getByLabel('CPF').fill('12312312312');
        await page.getByLabel('CEP').fill('01001000');
        await expect(page.getByLabel('Rua', { exact: true })).toHaveValue('Praça da Sé');
        await expect(page.getByLabel('Bairro')).toHaveValue('Sé');
        await expect(page.getByText('São Paulo/SP')).toBeVisible();
        await expect(page.getByLabel('Número')).toBeFocused();
        await page.keyboard.type('100');
        await page.getByLabel('Complemento').fill('Sala 2');
        await page.getByRole('button', { name: 'Salvar paciente' }).click();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Paula Teixeira');
        expect(db.patients.at(-1)).toMatchObject({ address: 'Praça da Sé, 100 - Sala 2', neighborhood: 'Sé', zipCode: '01001-000' });
    });

    test('procedimento é escolhido por busca, também pelo teclado', async ({ page }) => {
        await useFakeApi(page);
        await signIn(page, 'ana', '/agenda/nova?data=2026-10-29&dentista=3&paciente=2');
        const field = page.getByRole('combobox', { name: 'Procedimento' });
        await field.fill('cao');
        await expect(page.getByRole('option')).toHaveText([/Avaliação/, /Restauração/, /Manutenção do aparelho/]);
        await field.press('ArrowDown');
        await field.press('Enter');
        await expect(field).toHaveValue('Restauração');
        await expect(page.getByRole('option')).toHaveCount(0);
        await field.fill('xyz');
        await expect(page.getByText('Nenhum resultado')).toBeVisible();
        await field.press('Escape');
        await expect(field).toHaveValue('Restauração');
    });

    test('gráfico do painel mostra entradas e saídas de cada dia e o saldo no balão', async ({ page }) => {
        await useFakeApi(page);
        await signIn(page, 'ana', '/painel');
        const chart = page.getByRole('group', { name: 'Entradas e saídas por dia do mês' });
        await expect(chart.getByText('R$ 600', { exact: true })).toBeVisible();
        const day = chart.getByRole('img', { name: /^Terça, 27 de outubro: entradas R\$\s600,00, saídas R\$\s60,00, saldo R\$\s540,00$/ });
        await day.focus();
        const tip = page.locator('figure').getByText('Saldo do dia');
        await expect(tip).toBeVisible();
        await expect(page.locator('figure').getByText(/R\$\s540,00/).first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
});
