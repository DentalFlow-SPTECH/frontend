import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed.js';
import { chooseRecord } from './record_picker_helpers.js';

const storageKey = 'dental_flow_demo_v1';
function largeData() {
    const data = createSeed();
    data.patients.push(...Array.from({ length: 1200 }, (_, index) => ({ ...data.patients[0], id: `patient-${index}`, code: `PAC-${String(index + 100).padStart(4, '0')}`, name: index >= 1198 ? 'Érica Exemplo' : `Paciente Exemplo ${index}`, birthDate: '', phone: `(11) 90001-${String(index).padStart(4, '0')}`, cpf: index === 1198 ? '123.456.789-00' : '', history: [] })));
    data.doctors.push(...Array.from({ length: 120 }, (_, index) => ({ id: `doctor-${index}`, name: index > 117 ? 'Dra. Lívia Exemplo' : `Doutor Exemplo ${index}`, cro: `SP-${index + 1000}`, specialty: 'Clínica geral' })));
    return data;
}
async function inject(page, data) {
    await page.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); }, { key: storageKey, data });
}
async function open(page, route) {
    await page.goto(`./#${route}`);
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
    await expect(page.locator('main h1')).toBeVisible();
}

test('listas grandes limitam resultados, distinguem homônimos e persistem os ids escolhidos', async ({ page }) => {
    await inject(page, largeData());
    await open(page, '/agenda/nova?date=2026-10-08');
    const patient = page.locator('#appointment_patientId');
    await patient.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Buscar paciente', exact: true });
    const search = dialog.getByLabel('Buscar paciente', { exact: true });
    await expect(search).toBeFocused();
    await expect(dialog.locator('[data-record-id]')).toHaveCount(8);
    await dialog.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(dialog.getByRole('status')).toHaveText('9–16 de 1204 pacientes');
    await expect(dialog.locator('[data-record-id]')).toHaveCount(8);
    await search.fill('erica');
    await expect(dialog.locator('[data-record-id]')).toHaveCount(2);
    await expect(dialog.locator('[data-record-id="patient-1198"]')).toContainText('PAC-1298');
    await expect(dialog.locator('[data-record-id="patient-1199"]')).toContainText('PAC-1299');
    await search.press('Enter');
    await expect(patient).toHaveAttribute('value', '');
    await expect(dialog.locator('[data-record-id="patient-1198"]')).toBeFocused();
    await dialog.locator('[data-record-id="patient-1199"]').click();
    await expect(patient).toHaveAttribute('value', 'patient-1199');
    await expect(patient).toBeFocused();
    await expect(patient).toContainText('PAC-1299');
    await chooseRecord(page, page.locator('#appointment_doctorId'), 'doctor-119', 'SP-1119');
    await page.locator('#appointment_procedure').selectOption('Profilaxia');
    await page.locator('#appointment_time').fill('09:00');
    await page.locator('#appointment_duration').fill('30');
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Consulta agendada', exact: true })).toBeVisible();
    await page.reload();
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
    expect(saved.appointments).toHaveLength(1);
    expect(saved.appointments[0]).toMatchObject({ patientId: 'patient-1199', doctorId: 'doctor-119', procedure: 'Profilaxia', duration: 30 });
    expect(saved.patients).toHaveLength(1204);
    expect(saved.doctors).toHaveLength(122);
    expect(saved.budgets).toHaveLength(3);
});

test('busca por identificadores, vazio, Escape e foco preservam a escolha e o formulário', async ({ page }) => {
    const data = largeData();
    await inject(page, data);
    await open(page, '/orcamentos/novo?paciente=p1');
    const patient = page.locator('#budget_patientId');
    await page.getByLabel('Observação do orçamento (opcional)').fill('Conservar observação.');
    await patient.click();
    const dialog = page.getByRole('dialog', { name: 'Buscar paciente', exact: true });
    const search = dialog.getByLabel('Buscar paciente', { exact: true });
    await search.fill('12345678900');
    await expect(dialog.locator('[data-record-id]')).toHaveCount(1);
    await expect(dialog.locator('[data-record-id="patient-1198"]')).toBeVisible();
    await search.fill('900011199');
    await expect(dialog.locator('[data-record-id="patient-1199"]')).toBeVisible();
    await search.fill('NãoExisteExemplo');
    await expect(dialog.getByRole('heading', { name: 'Nenhum paciente corresponde à busca' })).toBeVisible();
    await expect(dialog.locator('[data-record-id]')).toHaveCount(0);
    for (let index = 0; index < 8; index++) {
        await page.keyboard.press('Tab');
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    for (let index = 0; index < 8; index++) {
        await page.keyboard.press('Shift+Tab');
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(patient).toHaveAttribute('value', 'p1');
    await expect(patient).toBeFocused();
    await expect(page.getByLabel('Observação do orçamento (opcional)')).toHaveValue('Conservar observação.');
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(JSON.stringify(data));
    await patient.click();
    await expect(search).toHaveValue('');
    await dialog.getByRole('button', { name: 'Limpar seleção', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
    await expect(patient).toBeFocused();
    await expect(patient).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Selecione o paciente.', { exact: true })).toBeVisible();
});

test('filtro de doutor mantém contexto e opção Todos sem gravar', async ({ page }) => {
    await inject(page, largeData());
    await open(page, '/agenda?date=2026-10-08&view=month');
    const doctor = page.locator('#agenda_doctor');
    await chooseRecord(page, doctor, 'doctor-118', 'SP-1118');
    await expect(page).toHaveURL(/date=2026-10-08&view=month&doutor=doctor-118/);
    await doctor.click();
    const dialog = page.getByRole('dialog', { name: 'Buscar doutor', exact: true });
    await expect(dialog.locator('[data-record-id]')).toHaveCount(8);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await dialog.getByRole('button', { name: 'Todos os doutores', exact: true }).click();
    await expect(doctor).toHaveAttribute('value', '');
    await expect(page).toHaveURL(/date=2026-10-08&view=month$/);
    await page.reload();
    await expect(doctor).toHaveAttribute('value', '');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).appointments.length, storageKey)).toBe(0);
});

test('cadastros vazios na busca mantêm os outros campos e não criam registros', async ({ page }) => {
    const data = createSeed(); data.patients = []; data.doctors = []; data.budgets = [];
    await inject(page, data);
    await open(page, '/agenda/nova?date=2026-10-08');
    await page.locator('#appointment_time').fill('09:30');
    await page.locator('#appointment_patientId').click();
    await expect(page.getByRole('heading', { name: 'Nenhum paciente cadastrado', exact: true })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.locator('#appointment_doctorId').click();
    await expect(page.getByRole('heading', { name: 'Nenhum doutor cadastrado', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#appointment_time')).toHaveValue('09:30');
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(JSON.stringify(data));
});
