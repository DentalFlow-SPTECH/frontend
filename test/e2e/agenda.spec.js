import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const storageKey = 'dental_flow_demo_v1';
async function open(page, route = '/agenda?date=2026-10-02') {
    if (new URL(page.url()).hash === `#${route}`)
        await page.reload();
    else
        await page.goto(`./#${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Carregando registros…')).toHaveCount(0, { timeout: 15_000 });
}
async function scenario(page, value) {
    await page.keyboard.press('Control+Alt+r');
    await expect(page.getByRole('dialog', { name: 'Revisão da interface' })).toBeVisible();
    await page.getByLabel('Cenário de revisão').selectOption(value);
    await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
    if (value !== 'read-error' && value !== 'slow')
        await expect(page.getByText('Carregando registros…')).toHaveCount(0);
}
async function draft(page, { date = '2026-10-02', time = '09:00', duration = '45', doctor = 'd1', patient = 'p1' } = {}) {
    await open(page, `/agenda/nova?date=${date}`);
    await expect(page.getByRole('heading', { name: 'Nova consulta', exact: true })).toBeVisible();
    await page.locator('#appointment_patientId').selectOption(patient);
    await page.locator('#appointment_doctorId').selectOption(doctor);
    await page.locator('#appointment_procedure').selectOption('Profilaxia');
    await page.locator('#appointment_time').fill(time);
    await page.locator('#appointment_duration').fill(duration);
}
async function save(page) {
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Consulta agendada', exact: true })).toBeVisible();
}
async function snapshot(page) {
    return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
}
async function noOverflow(page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); }
test('agenda vazia mantém semana, navegação temporal e mês completo', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { name: 'Nenhuma consulta nesta semana' })).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) < 768)
        await page.getByRole('button', { name: 'Ver grade de horários da semana' }).click();
    await expect(page.getByRole('link', { name: 'Agendar em 28/09/2026', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Próxima semana' }).click();
    await expect(page.locator('#agenda_date')).toHaveValue('2026-10-09');
    await page.getByRole('button', { name: 'Semana anterior' }).click();
    await expect(page.locator('#agenda_date')).toHaveValue('2026-10-02');
    await page.getByRole('button', { name: 'Visão mensal' }).click();
    await expect(page.getByRole('button', { name: /^\d{2}\/10\/2026,/ })).toHaveCount(31);
    await page.getByRole('button', { name: '15/10/2026, 0 consultas', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Consultas de 15/10/2026', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Agendar neste dia', exact: true }).click();
    await expect(page.locator('#appointment_date')).toHaveValue('2026-10-15');
    await expect(page.locator('#appointment_time')).toHaveValue('');
    await expect(page.locator('#appointment_duration')).toHaveValue('');
    await noOverflow(page);
});
test('consulta valida mínimos, associa mensagens e foca a primeira correção', async ({ page }) => {
    await open(page, '/agenda/nova');
    await page.locator('#appointment_observation').fill('Manter esta observação.');
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.locator('#appointment_patientId')).toBeFocused();
    for (const key of ['patientId', 'doctorId', 'procedure', 'date', 'time', 'duration'])
        await expect(page.locator(`#appointment_${key}`)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#appointment_observation')).toHaveValue('Manter esta observação.');
    await page.locator('#appointment_patientId').selectOption('p1');
    await page.locator('#appointment_doctorId').selectOption('d1');
    await page.locator('#appointment_procedure').selectOption('Profilaxia');
    await page.locator('#appointment_date').fill('2026-10-02');
    await page.locator('#appointment_time').fill('09:00');
    await page.locator('#appointment_duration').fill('0');
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.locator('#appointment_duration')).toBeFocused();
    await expect(page.getByText('Informe uma duração inteira maior que zero.', { exact: true })).toBeVisible();
});
test('cadastro, detalhe, vínculo com orçamento e edição de status persistem', async ({ page }) => {
    await draft(page);
    await page.locator('#appointment_budgetId').selectOption('b1');
    await page.locator('#appointment_attendance').fill('Particular');
    await page.locator('#appointment_observation').fill('Paciente prefere atendimento pela manhã.');
    await save(page);
    await page.getByRole('link', { name: 'Ver consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Consulta de Marina Albuquerque', exact: true })).toBeVisible();
    await expect(page.getByText('Agendada', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver orçamento ORC-001', exact: true })).toHaveAttribute('href', '#/orcamentos/b1');
    await expect(page.getByRole('link', { name: 'Marina Albuquerque', exact: true }).filter({ visible: true })).toHaveAttribute('href', '#/pacientes/p1');
    await expect(page.getByRole('link', { name: 'Dra. Helena Martins', exact: true }).filter({ visible: true })).toHaveAttribute('href', '#/doutores/d1');
    await page.getByRole('link', { name: 'Editar consulta', exact: true }).click();
    await expect(page.locator('#appointment_patientId')).toBeDisabled();
    await expect(page.locator('#appointment_duration')).toBeDisabled();
    await page.locator('#appointment_status').selectOption('Confirmada');
    await page.locator('#appointment_time').fill('10:00');
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Consulta atualizada', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Ver consulta', exact: true }).click();
    await page.reload();
    await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
    const data = await snapshot(page);
    expect(data.appointments).toHaveLength(1);
    expect(data.appointments[0]).toMatchObject({ patientId: 'p1', doctorId: 'd1', duration: 45, status: 'Confirmada', time: '10:00', budgetId: 'b1' });
    expect(data.appointments[0].history).toHaveLength(2);
    expect(data.cashMovements).toHaveLength(0);
});
test('sobreposição por doutor bloqueia e permite intervalos encostados ou outro doutor', async ({ page }) => {
    await draft(page);
    await save(page);
    await draft(page, { time: '09:30', duration: '15' });
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.getByText('Este doutor já tem uma consulta nesse intervalo. Revise o horário ou o doutor.', { exact: true })).toBeVisible();
    await expect(page.locator('#appointment_time')).toHaveValue('09:30');
    await expect(page.locator('#appointment_doctorId')).toHaveAttribute('aria-invalid', 'true');
    expect((await snapshot(page)).appointments).toHaveLength(1);
    await page.locator('#appointment_time').fill('09:45');
    await save(page);
    await draft(page, { doctor: 'd2', time: '09:15' });
    await save(page);
    expect((await snapshot(page)).appointments).toHaveLength(3);
});
test('conflito considera a duração quando a consulta cruza a meia-noite', async ({ page }) => {
    await draft(page, { date: '2026-10-02', time: '23:30', duration: '90' });
    await save(page);
    await draft(page, { date: '2026-10-03', time: '00:30', duration: '30' });
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.getByText('Este doutor já tem uma consulta nesse intervalo. Revise o horário ou o doutor.', { exact: true })).toBeVisible();
    expect((await snapshot(page)).appointments).toHaveLength(1);
    await page.locator('#appointment_time').fill('01:00');
    await save(page);
    expect((await snapshot(page)).appointments).toHaveLength(2);
});
test('cancelamento mantém motivo e histórico, não movimenta caixa e libera o horário', async ({ page }) => {
    await draft(page);
    await save(page);
    await page.getByRole('link', { name: 'Ver consulta', exact: true }).click();
    await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cancelar esta consulta?', exact: true })).toBeFocused();
    await page.locator('#appointment_cancelReason').fill('Paciente pediu nova data.');
    await page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click();
    await expect(page.getByText('Consulta cancelada. O registro e o histórico foram preservados.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
    await expect(page.getByText('Paciente pediu nova data.', { exact: true })).toBeVisible();
    const before = await snapshot(page);
    expect(before.appointments[0].history).toHaveLength(2);
    expect(before.cashMovements).toHaveLength(0);
    await draft(page, { patient: 'p2' });
    await save(page);
    const after = await snapshot(page);
    expect(after.appointments).toHaveLength(2);
    expect(after.appointments[0]).toMatchObject({ status: 'Cancelada', cancelReason: 'Paciente pediu nova data.' });
    expect(after.cashMovements).toHaveLength(0);
    await open(page, `/agenda/${before.appointments[0].id}/editar?date=2026-10-02`);
    await page.locator('#appointment_time').fill('10:00');
    await page.locator('#appointment_status').selectOption('Agendada');
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Consulta atualizada', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Ver consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Consulta de Marina Albuquerque', exact: true })).toBeVisible();
    await expect(page.getByText('Agendada', { exact: true })).toBeVisible();
    await expect(page.getByText('Motivo do cancelamento', { exact: true })).toHaveCount(0);
    const rescheduled = (await snapshot(page)).appointments.find(value => value.id === before.appointments[0].id);
    expect(rescheduled).toMatchObject({ status: 'Agendada', time: '10:00', cancelReason: '' });
    expect(rescheduled.history).toHaveLength(3);
    expect(rescheduled.history.slice(0, 2)).toEqual(before.appointments[0].history);
    expect(rescheduled.history[2].description).toContain('Cancelada → Agendada');
    await expect(page.getByText('Consulta cancelada. Motivo: Paciente pediu nova data.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Agendada', { exact: true })).toBeVisible();
    await expect(page.getByText('Motivo do cancelamento', { exact: true })).toHaveCount(0);
});
test('cancelamento permite motivo vazio e opção de manter devolve o foco', async ({ page }) => {
    await draft(page);
    await save(page);
    await page.getByRole('link', { name: 'Ver consulta', exact: true }).click();
    await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
    await page.getByRole('button', { name: 'Manter consulta', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cancelar consulta', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click();
    await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
    expect((await snapshot(page)).appointments[0].cancelReason).toBe('');
});
test('filtro de doutor e cadastro por horário preservam contexto', async ({ page }) => {
    await draft(page);
    await save(page);
    await draft(page, { doctor: 'd2', patient: 'p2', time: '10:00' });
    await save(page);
    await open(page, '/agenda?date=2026-10-02&doutor=d1');
    await expect(page.locator('#agenda_doctor')).toHaveValue('d1');
    await expect(page.getByRole('link', { name: /Marina Albuquerque/ }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Rafael Nogueira/ }).filter({ visible: true })).toHaveCount(0);
    if ((page.viewportSize()?.width ?? 0) < 768)
        await page.getByRole('button', { name: 'Ver grade de horários da semana' }).click();
    await page.getByRole('link', { name: 'Agendar em 03/10/2026 às 09:00', exact: true }).click();
    await expect(page.locator('#appointment_date')).toHaveValue('2026-10-03');
    await expect(page.locator('#appointment_time')).toHaveValue('09:00');
    await expect(page.locator('#appointment_doctorId')).toHaveValue('d1');
    await page.getByRole('link', { name: 'Voltar à agenda', exact: false }).click();
    await expect(page.locator('#agenda_doctor')).toHaveValue('d1');
    await page.getByRole('button', { name: 'Visão mensal' }).click();
    await page.getByRole('button', { name: '02/10/2026, 1 consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Consultas de 02/10/2026' })).toBeVisible();
    await noOverflow(page);
});
test('falha de gravação conserva formulário e cancelar navegação permite continuar', async ({ page }) => {
    await draft(page);
    await page.locator('#appointment_observation').fill('Observação a preservar.');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('link', { name: 'Voltar à agenda', exact: false }).click();
    await expect(page.locator('#appointment_observation')).toHaveValue('Observação a preservar.');
    await scenario(page, 'write-error');
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.getByText('Não foi possível salvar', { exact: true })).toBeVisible();
    await expect(page.getByText('Não foi possível salvar', { exact: true }).locator('..').locator('..')).toBeFocused();
    await expect(page.locator('#appointment_duration')).toHaveValue('45');
    await expect(page.locator('#appointment_observation')).toHaveValue('Observação a preservar.');
    await scenario(page, 'normal');
    await save(page);
    expect((await snapshot(page)).appointments[0].observation).toBe('Observação a preservar.');
});
test('carregamento e falha de leitura têm feedback e permitem recuperar a agenda', async ({ page }) => {
    await open(page);
    await scenario(page, 'slow');
    await expect(page.getByText('Carregando registros…')).toBeVisible();
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
    await scenario(page, 'read-error');
    await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByText('Não foi possível carregar', { exact: true })).toBeVisible();
    await scenario(page, 'normal');
    await expect(page.getByRole('heading', { name: 'Nenhuma consulta nesta semana' })).toBeVisible();
});
test('gravação lenta bloqueia campos e envios repetidos', async ({ page }) => {
    await draft(page);
    await scenario(page, 'slow');
    await expect(page.getByText('Carregando registros…')).toHaveCount(0);
    await page.getByRole('button', { name: 'Salvar consulta', exact: true }).click();
    await expect(page.locator('#appointment_time')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Salvando consulta…', exact: true })).toBeDisabled();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('link', { name: 'Voltar à agenda', exact: false }).click();
    await expect(page.getByRole('heading', { name: 'Consulta agendada', exact: true })).toBeVisible();
    expect((await snapshot(page)).appointments).toHaveLength(1);
});
test('agenda, mês, formulário e detalhe têm acessibilidade, teclado e largura contida', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await open(page);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('agenda-week-empty.png'), fullPage: true });
    await page.getByRole('button', { name: 'Visão mensal' }).click();
    await page.getByRole('button', { name: '10/10/2026, 0 consultas', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Consultas de 10/10/2026' })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('agenda-month.png'), fullPage: true });
    await draft(page);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('agenda-form.png'), fullPage: true });
    await save(page);
    await open(page, '/agenda?date=2026-10-02');
    const appointmentCard = page.getByRole('link', { name: /Marina Albuquerque/ }).filter({ visible: true });
    await expect(appointmentCard).toBeVisible();
    await appointmentCard.scrollIntoViewIfNeeded();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('agenda-week-populated.png'), fullPage: true });
    await appointmentCard.click();
    await expect(page.getByRole('heading', { name: 'Consulta de Marina Albuquerque', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dados da consulta', exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('agenda-detail.png'), fullPage: true });
    await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cancelar esta consulta?', exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('agenda-cancel.png'), fullPage: true });
    expect(errors).toEqual([]);
});
