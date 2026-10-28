import { expect, test } from '@playwright/test';
import { signIn, useFakeApi } from './fake_api.js';

test.describe('formulários integrados', () => {
    test('agendar consulta: busca o paciente, escolhe horário livre e abre na agenda', async ({ page }) => {
        const db = await useFakeApi(page);
        await signIn(page, 'carla', '/agenda/nova?data=2026-10-29');
        await page.getByLabel('Buscar paciente').fill('cam');
        await page.getByRole('button', { name: /Camila Duarte/ }).click();
        await page.getByRole('group', { name: 'Dentista' }).getByRole('button', { name: /Dra. Ana/ }).click();
        await page.getByLabel('Procedimento').selectOption({ label: 'Limpeza · 60 min · R$ 180,00' });
        await expect(page.getByRole('button', { name: '09:00', exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: '10:00', exact: true }).click();
        await page.getByRole('button', { name: 'Agendar consulta' }).click();
        await expect(page.getByText(/Consulta agendada/).first()).toBeVisible();
        await expect(page).toHaveURL(/ver=dia&data=2026-10-29&consulta=\d+/);
        const created = db.appointments.at(-1);
        expect(created).toMatchObject({ clinicId: 1, patientId: 3, dentistId: 3, procedureId: 2, scheduledAt: '2026-10-29T10:00:00', status: 'AGENDADO', userId: 8 });
        await expect(page.getByRole('dialog').getByRole('heading', { name: 'Camila Duarte' })).toBeVisible();
    });

    test('horário ocupado gera aviso, sem bloquear', async ({ page }) => {
        await useFakeApi(page);
        await signIn(page, 'ana', '/agenda/nova?data=2026-10-28&dentista=3&paciente=2');
        await page.getByLabel('Procedimento').selectOption({ label: 'Avaliação · 30 min · R$ 120,00' });
        await page.getByLabel('Horário').fill('10:10');
        await expect(page.getByText('Este horário já está ocupado')).toBeVisible();
        await expect(page.getByText('10:00 · Ana Clara Mendes')).toBeVisible();
    });

    test('novo paciente valida campos e mostra o CPF duplicado no próprio campo', async ({ page }) => {
        const db = await useFakeApi(page);
        await signIn(page, 'carla', '/pacientes/novo');
        await page.getByRole('button', { name: 'Salvar paciente' }).click();
        await expect(page.getByText('Informe o nome completo.')).toBeVisible();
        await expect(page.getByText('O CPF tem 11 números.')).toBeVisible();
        await page.getByLabel('Nome completo').fill('Maria Eduarda Lopes');
        await page.getByLabel('CPF').fill('10011122200');
        await expect(page.getByLabel('CPF')).toHaveValue('100.111.222-00');
        await page.getByLabel('Celular / WhatsApp (opcional)').fill('11987654321');
        await page.getByLabel('CEP').fill('01234567');
        await page.getByLabel('Bairro').fill('Centro');
        await page.getByLabel('Rua e número').fill('Rua A, 10');
        await page.getByRole('button', { name: 'Salvar paciente' }).click();
        await expect(page.getByLabel('CPF')).toHaveAttribute('aria-invalid', 'true');
        await expect(page.getByText('Já existe um paciente cadastrado com este CPF na mesma clínica.')).toBeVisible();
        await page.getByLabel('CPF').fill('99988877766');
        await page.getByRole('button', { name: 'Salvar paciente' }).click();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Maria Eduarda Lopes');
        expect(db.patients.at(-1)).toMatchObject({ cpf: '999.888.777-66', phone: '11987654321', zipCode: '01234-567', clinicId: 1 });
    });

    test('pacientes: busca por nome sem acento e por telefone', async ({ page }) => {
        await useFakeApi(page);
        await signIn(page, 'carla', '/pacientes');
        await page.getByLabel('Buscar paciente').fill('sonia');
        await expect(page.getByRole('link', { name: /^Sônia Martins/ })).toBeVisible();
        await expect(page.getByText('1 paciente encontrado')).toBeVisible();
        await page.getByLabel('Buscar paciente').fill('88880004');
        await expect(page.getByRole('link', { name: /^Gabriel Souza/ })).toBeVisible();
    });

    test('dentista cadastra procedimento e cria acesso da recepção', async ({ page }) => {
        const db = await useFakeApi(page);
        await signIn(page, 'ana', '/clinica/procedimentos/novo');
        await page.getByLabel('Nome').fill('Clareamento');
        await page.getByLabel('Preço (opcional)').fill('1.200,50');
        await page.getByLabel('Duração em minutos (opcional)').fill('60');
        await page.getByRole('button', { name: 'Cadastrar procedimento' }).click();
        await expect(page.getByRole('link', { name: /Clareamento/ })).toBeVisible();
        expect(db.procedures.at(-1)).toMatchObject({ name: 'Clareamento', price: 1200.5, durationMinutes: 60, clinicId: 1 });
        await page.goto('./#/clinica/usuarios/novo');
        await page.getByLabel('Nome da pessoa').fill('Paula Reis');
        await page.getByLabel('Usuário para entrar').fill('Paula');
        await page.getByLabel('Senha inicial').fill('123');
        await page.getByRole('button', { name: 'Criar acesso' }).click();
        await expect(page.getByText('A senha precisa ter pelo menos 6 caracteres.')).toBeVisible();
        await page.getByLabel('Senha inicial').fill('senha456');
        await page.getByRole('button', { name: 'Criar acesso' }).click();
        await expect(page.getByText(/Acesso de Paula criado/).first()).toBeVisible();
        expect(db.createdUsers.at(-1)).toMatchObject({ login: 'paula', accessLevel: 'RECEPCIONISTA', dentistId: null, clinicId: 1, active: true });
    });
});
