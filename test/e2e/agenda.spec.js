import { expect, test } from '@playwright/test';
import { signIn, useFakeApi } from './fake_api.js';

test.describe('agenda e hoje', () => {
    test('Hoje mostra o próximo paciente, quem não confirmou e abre o detalhe', async ({ page, isMobile }) => {
        await useFakeApi(page);
        await signIn(page, 'carla');
        await expect(page.getByText('Quarta, 28 de outubro · 10 consultas')).toBeVisible();
        await expect(page.getByText('2 pacientes ainda não confirmaram')).toBeVisible();
        await page.getByRole('group', { name: 'Filtrar por dentista' }).getByRole('button', { name: /Dra. Júlia/ }).click();
        await expect(page.getByText('Quarta, 28 de outubro · 2 consultas')).toBeVisible();
        await page.getByRole('group', { name: 'Filtrar por dentista' }).getByRole('button', { name: /Todos/ }).click();
        await page.getByRole('list').getByRole('button', { name: /10:00.*Ana Clara Mendes/ }).click();
        const detail = isMobile ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Consulta selecionada' });
        await expect(detail.getByRole('heading', { name: 'Ana Clara Mendes' })).toBeVisible();
        await expect(detail.getByText('Prefere atendimento pela manhã.')).toBeVisible();
        await expect(detail.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /wa\.me\/551198888/);
    });

    test('semana em grade: horas no eixo vertical, dias no horizontal e cartões pela duração', async ({ page, isMobile }) => {
        test.skip(isMobile, 'no celular a visão padrão é o dia');
        await useFakeApi(page);
        await signIn(page, 'ana', '/agenda');
        const grid = page.getByRole('region', { name: /Agenda:/ });
        await expect(grid.getByText('Qua 28')).toBeVisible();
        await expect(grid.getByText('Dom 1')).toBeVisible();
        const canal = grid.getByRole('button', { name: /09:30 às 11:00, Beatriz Rocha/ });
        const avaliacao = grid.getByRole('button', { name: /10:30 às 11:00, Gabriel Souza/ });
        const tall = await canal.boundingBox();
        const short = await avaliacao.boundingBox();
        expect(tall.height).toBeGreaterThan(short.height * 2.5);
        await expect(page.getByRole('region', { name: 'Próximo paciente' })).toContainText('Ana Clara Mendes');
        await page.getByRole('button', { name: 'Próximo período' }).click();
        await expect(page.getByRole('heading', { level: 1 }).locator('..')).toContainText('2 a 8 de novembro');
    });

    test('mudar situação mostra aviso com Desfazer e cancelar pede confirmação', async ({ page }) => {
        // Relógio real: o temporizador do aviso não convive com o relógio congelado no build de produção.
        const db = await useFakeApi(page, { clock: false });
        await signIn(page, 'ana', '/agenda?ver=dia&data=2026-10-28&consulta=107');
        const panel = page.getByRole('dialog');
        await expect(panel.getByRole('heading', { name: 'Roberto Nunes' })).toBeVisible();
        await panel.getByRole('button', { name: 'Confirmar' }).click();
        await expect(page.getByText('Consulta de Roberto confirmada').first()).toBeVisible();
        expect(db.appointments.find(item => item.id === 107).status).toBe('CONFIRMADO');
        await page.getByRole('button', { name: 'Desfazer' }).click();
        await expect.poll(() => db.appointments.find(item => item.id === 107).status).toBe('AGENDADO');
        await panel.getByRole('button', { name: 'Cancelar', exact: true }).click();
        const confirm = page.getByRole('dialog', { name: 'Cancelar esta consulta?' });
        await expect(confirm).toContainText('não pode ser reaberta');
        await confirm.getByRole('button', { name: 'Cancelar consulta' }).click();
        await expect.poll(() => db.appointments.find(item => item.id === 107).status).toBe('CANCELADO');
        await expect(panel.getByText('Consulta cancelada')).toBeVisible();
        await expect(panel.getByRole('link', { name: 'Agendar de novo' })).toBeVisible();
    });

    test('dia no computador separa colunas por dentista; mês mostra a contagem', async ({ page, isMobile }) => {
        test.skip(isMobile, 'colunas por dentista são da tela larga');
        await useFakeApi(page);
        await signIn(page, 'ana', '/agenda?ver=dia');
        const grid = page.getByRole('region', { name: /Agenda:/ });
        for (const name of ['Dra. Ana Lima', 'Dr. Bruno Reis', 'Dra. Júlia Costa'])
            await expect(grid.getByText(name, { exact: true })).toBeVisible();
        await page.getByRole('group', { name: 'Visão da agenda' }).getByRole('button', { name: 'Mês' }).click();
        await expect(page.getByRole('button', { name: '28: 9 consultas' })).toBeVisible();
        await page.getByRole('button', { name: '29: 1 consultas' }).click();
        await expect(page).toHaveURL(/ver=dia&data=2026-10-29/);
    });

    test('celular abre na visão do dia com barra de abas e 3 dias como alternativa', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'comportamento do celular');
        await useFakeApi(page);
        await signIn(page, 'ana', '/agenda');
        await expect(page.getByRole('group', { name: 'Visão da agenda' }).getByRole('button', { name: 'Dia', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Agenda' })).toBeVisible();
        await page.getByRole('group', { name: 'Visão da agenda' }).getByRole('button', { name: '3 dias' }).click();
        await expect(page.getByRole('region', { name: /Agenda:/ }).getByText('Sex 30')).toBeVisible();
    });
});
