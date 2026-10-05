import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSeed } from '../../src/demo/seed';

// Credentials exist only during each isolated test. No traces or error screenshots.
test.use({ trace: 'off', screenshot: 'off' });
test.afterEach(async ({ page }) => { await page.close(); });
const storageKey = 'dental_flow_demo_v1';
const email = 'clara@example.com';
async function open(page: Page, route = '/login') {
  await page.goto(`./#${route}`);
  await expect(page.locator('main h1')).toHaveText(route === '/login' ? 'Login' : 'Criar conta');
}
async function scenario(page: Page, value: string) {
  await page.keyboard.press('Control+Alt+r');
  await page.getByLabel('Cenário de revisão').selectOption(value);
  await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
}
async function fill(page: Page, registration = false) {
  const password = crypto.randomUUID();
  const prefix = registration ? 'registration' : 'login';
  if (registration) await page.locator('#registration_name').fill('Clara Monteiro');
  await page.locator(`#${prefix}_email`).fill(email);
  await page.locator(`#${prefix}_password`).fill(password);
  if (registration) await page.locator('#registration_confirmation').fill(password);
  return password;
}
async function noCredentialStorage(page: Page, password: string) {
  expect(await page.evaluate(value => ![...Object.values(localStorage), ...Object.values(sessionStorage), JSON.stringify(history.state), location.href].some(stored => stored.includes(value)), password)).toBe(true);
}

test('rotas externas, navegação e recarregamento preservam entrada e dashboard antigo', async ({ page }) => {
  for (const route of ['/login', '/cadastro']) {
    await open(page, route);
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir navegação' })).toHaveCount(0);
    await expect(page.getByRole('img', { name: 'Dental Flow', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('main h1')).toHaveText(route === '/login' ? 'Login' : 'Criar conta');
    await expect(page.locator('main h1')).toBeFocused();
    await expect(page).toHaveTitle(`${route === '/login' ? 'Login' : 'Criar conta'} — Dental Flow`);
    expect((await page.locator('main').boundingBox())!.width).toBeLessThanOrEqual(448);
  }
  await page.getByRole('link', { name: 'Já tenho uma conta', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await expect(page).toHaveURL(/#\/cadastro$/);
  await page.goto('./');
  await expect(page).toHaveURL(/#\/painel$/);
  await page.goto('./#/dashboard?date=2026-10-03');
  await expect(page).toHaveURL(/#\/painel\?date=2026-10-03$/);
  await expect(page.getByLabel('Dia de referência')).toHaveValue('2026-10-03');
});

test('login valida presença e formato, associa erros e foca a primeira correção', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#login_email')).toBeFocused();
  await expect(page.locator('#login_email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#login_email')).toHaveAttribute('aria-describedby', 'login_email_error');
  await expect(page.locator('#login_password_error')).toHaveText('Informe sua senha.');
  await page.locator('#login_email').fill('email-invalido');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#login_email_error')).toContainText('Informe um e-mail válido');
  await page.locator('#login_email').fill(email);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#login_password')).toBeFocused();
  await expect(page.locator('#login_email_error')).toHaveCount(0);
});

test('cadastro exige somente os quatro campos e confere igualdade sem política de senha', async ({ page }) => {
  await open(page, '/cadastro');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#registration_name')).toBeFocused();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(4);
  await page.locator('#registration_name').fill('Clara Monteiro');
  await page.locator('#registration_email').fill('email-invalido');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#registration_email')).toBeFocused();
  await page.locator('#registration_email').fill(email);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#registration_password')).toBeFocused();
  const password = crypto.randomUUID().slice(0, 1);
  await page.locator('#registration_password').fill(password);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#registration_confirmation')).toBeFocused();
  await page.locator('#registration_confirmation').fill(password + password);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#registration_confirmation_error')).toHaveText('As senhas devem ser iguais.');
  await expect(page.locator('#registration_confirmation')).toHaveAttribute('aria-describedby', 'registration_confirmation_error');
  await page.locator('#registration_confirmation').fill(password);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Cadastro concluído');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test('mostrar e ocultar senhas conserva valor, nome e estado acessíveis sem confirmação', async ({ page }) => {
  const dialogs: string[] = []; page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  for (const registration of [false, true]) {
    await open(page, registration ? '/cadastro' : '/login');
    await fill(page, registration);
    const ids = registration ? ['registration_password', 'registration_confirmation'] : ['login_password'];
    for (const id of ids) {
      const subject = id.endsWith('confirmation') ? 'confirmação de senha' : 'senha';
      await page.getByRole('button', { name: `Mostrar ${subject}`, exact: true }).click();
      await expect(page.locator(`#${id}`)).toHaveAttribute('type', 'text');
      await expect(page.getByRole('button', { name: `Ocultar ${subject}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: `Ocultar ${subject}`, exact: true }).click();
      await expect(page.locator(`#${id}`)).toHaveAttribute('type', 'password');
      await expect(page.getByRole('button', { name: `Mostrar ${subject}`, exact: true })).toHaveAttribute('aria-pressed', 'false');
    }
    await noCredentialStorage(page, 'unused-credential-sentinel');
    // Full document navigation is intentionally guarded for a filled registration.
    if (registration) break;
  }
  expect(dialogs).toEqual([]);
});

for (const registration of [false, true]) {
  test(`${registration ? 'cadastro' : 'login'}: falha preserva campos, foco e tentativa posterior`, async ({ page }) => {
    await page.clock.install();
    await open(page, registration ? '/cadastro' : '/login');
    const password = await fill(page, registration);
    await scenario(page, 'write-error');
    const action = registration ? 'Criar conta' : 'Entrar';
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.locator(registration ? '#registration_name' : '#login_email')).toBeDisabled();
    await expect(page.locator(registration ? '#registration_password' : '#login_password')).toBeDisabled();
    await page.clock.fastForward(700);
    await expect(page.getByRole('alert')).toContainText('Seu preenchimento foi mantido. Tente novamente.');
    await expect(page.locator('div[tabindex="-1"]')).toBeFocused();
    const prefix = registration ? 'registration' : 'login';
    await expect(page.locator(`#${prefix}_email`)).toHaveValue(email);
    expect(await page.locator(`#${prefix}_password`).evaluate((input, value) => (input as HTMLInputElement).value === value, password)).toBe(true);
    if (registration) {
      await expect(page.locator('#registration_name')).toHaveValue('Clara Monteiro');
      expect(await page.locator('#registration_confirmation').evaluate((input, value) => (input as HTMLInputElement).value === value, password)).toBe(true);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await noCredentialStorage(page, password);
    await scenario(page, 'normal');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.clock.fastForward(700);
    if (registration) await expect(page.locator('main h1')).toHaveText('Cadastro concluído');
    else {
      await expect(page.getByRole('status')).toContainText('Entrada demonstrativa concluída');
      await page.clock.fastForward(550);
      await expect(page).toHaveURL(/#\/painel$/);
    }
    await noCredentialStorage(page, password);
  });

  test(`${registration ? 'cadastro' : 'login'}: envio lento impede duplicação e saída até concluir`, async ({ page }) => {
    await page.clock.install();
    await open(page, registration ? '/cadastro' : '/login');
    await fill(page, registration); await scenario(page, 'slow');
    const action = registration ? 'Criar conta' : 'Entrar';
    // Dispatch twice in one turn, before React has disabled the submit button.
    await page.locator('form').evaluate(form => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await expect(page.getByRole('button', { name: registration ? 'Criando conta…' : 'Entrando…', exact: true })).toBeDisabled();
    await expect(page.locator(registration ? '#registration_email' : '#login_email')).toBeDisabled();
    await expect(page.locator(registration ? '#registration_password' : '#login_password')).toBeDisabled();
    await page.keyboard.press('Control+Alt+r');
    await expect(page.getByLabel('Cenário de revisão')).toBeDisabled();
    await page.getByRole('button', { name: 'Fechar revisão', exact: true }).click();
    const dialogs: string[] = [];
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
    await page.getByRole('link', { name: registration ? 'Já tenho uma conta' : 'Criar conta', exact: true }).click();
    await expect(page).toHaveURL(registration ? /#\/cadastro$/ : /#\/login$/);
    await expect.poll(() => dialogs).toEqual(['Uma operação está sendo salva. Aguarde a conclusão antes de sair desta página.']);
    await page.clock.fastForward(1000);
    await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.clock.fastForward(1200);
    if (registration) await expect(page.locator('main h1')).toHaveText('Cadastro concluído');
    else {
      await expect(page.getByRole('status')).toContainText('Entrada demonstrativa concluída');
      await page.clock.fastForward(550); await expect(page).toHaveURL(/#\/painel$/);
    }
  });
}

test('conclusão do cadastro leva somente e-mail ao login e não cria usuário ou auditoria', async ({ page }) => {
  await open(page, '/cadastro');
  const password = await fill(page, true);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Cadastro concluído');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.locator('main h1')).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await noCredentialStorage(page, password);
  const dialogs: string[] = []; page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  await page.getByRole('link', { name: 'Ir para o login', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.locator('#login_email')).toHaveValue(email);
  await expect(page.locator('#login_password')).toBeEmpty();
  await page.reload();
  await expect(page.locator('#login_email')).toHaveValue(email);
  await expect(page.locator('#login_password')).toBeEmpty();
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#registration_email')).toBeEmpty();
  expect(dialogs).toEqual([]);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
});

test('cadastro protege perda de preenchimento e permite continuar sem confirmações rotineiras', async ({ page }) => {
  await open(page, '/cadastro');
  await page.getByRole('link', { name: 'Já tenho uma conta', exact: true }).click();
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await page.locator('#registration_name').fill('Clara Monteiro');
  let count = 0;
  const stay = async (dialog: import('@playwright/test').Dialog) => { count++; expect(dialog.type()).toBe('confirm'); await dialog.dismiss(); };
  page.on('dialog', stay);
  await page.getByRole('link', { name: 'Já tenho uma conta', exact: true }).click();
  await expect(page).toHaveURL(/#\/cadastro$/);
  await expect(page.locator('#registration_name')).toHaveValue('Clara Monteiro');
  await expect.poll(() => count).toBe(1); page.off('dialog', stay);
  page.once('dialog', async dialog => { count++; await dialog.accept(); });
  await page.getByRole('link', { name: 'Já tenho uma conta', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/); expect(count).toBe(2);
  await fill(page);
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#registration_name')).toBeEmpty();
  expect(count).toBe(2);
});

test('teclado, foco, gerenciadores e inserção de senha são compatíveis', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Tab'); await expect(page.locator('#login_email')).toBeFocused();
  expect(await page.locator('#login_email').evaluate(element => getComputedStyle(element).outlineWidth)).toBe('3px');
  await page.keyboard.insertText(email);
  await page.keyboard.press('Tab'); await expect(page.locator('#login_password')).toBeFocused();
  const password = crypto.randomUUID(); await page.keyboard.insertText(password);
  await expect(page.locator('#login_email')).toHaveAttribute('autocomplete', 'username');
  await expect(page.locator('#login_password')).toHaveAttribute('autocomplete', 'current-password');
  expect(await page.locator('#login_password').evaluate(input => input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true })))).toBe(true);
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Mostrar senha', exact: true })).toBeFocused();
  await page.keyboard.press('Space'); await expect(page.locator('#login_password')).toHaveAttribute('type', 'text');
  await page.keyboard.press('Space'); await expect(page.locator('#login_password')).toHaveAttribute('type', 'password');
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page).toHaveURL(/#\/painel$/);
  await noCredentialStorage(page, password);
  await open(page, '/cadastro');
  await expect(page.locator('#registration_name')).toHaveAttribute('autocomplete', 'name');
  await expect(page.locator('#registration_email')).toHaveAttribute('autocomplete', 'email');
  for (const id of ['registration_password', 'registration_confirmation']) await expect(page.locator(`#${id}`)).toHaveAttribute('autocomplete', 'new-password');
  for (const id of ['registration_name', 'registration_email', 'registration_password']) {
    await page.keyboard.press('Tab'); await expect(page.locator(`#${id}`)).toBeFocused();
  }
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Mostrar senha', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#registration_confirmation')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Mostrar confirmação de senha', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Criar conta', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Já tenho uma conta', exact: true })).toBeFocused();
});

test('recarregar cadastro preenchido pede confirmação e reabre sem credenciais', async ({ page }) => {
  await open(page, '/cadastro');
  const password = await fill(page, true);
  const dialog = page.waitForEvent('dialog');
  const reload = page.reload();
  const warning = await dialog;
  expect(warning.type()).toBe('beforeunload');
  await warning.accept(); await reload;
  await expect(page.locator('main h1')).toHaveText('Criar conta');
  for (const id of ['registration_name', 'registration_email', 'registration_password', 'registration_confirmation']) await expect(page.locator(`#${id}`)).toBeEmpty();
  await noCredentialStorage(page, password);
});

for (const legacy of [false, true]) {
  test(`acesso conserva snapshot ${legacy ? 'antigo' : 'completo'}, identificadores e registros salvos`, async ({ page }) => {
    const data = createSeed();
    data.patients.push({ ...data.patients[0], id: 'visitor-patient', code: 'PAC-005', name: 'Lia Exemplo' });
    data.budgets.push({ ...data.budgets[0], id: 'visitor-budget', code: 'ORC-004', patientId: 'visitor-patient', local: true });
    data.products[0].quantity = 7;
    data.users.push({ id: 'visitor-user', name: 'Operador Exemplo', email: '', phone: '', login: '', profile: '', permissions: ['estoque:visualizar'], blocked: false, history: [] });
    const saved: Record<string, unknown> = { ...data };
    if (legacy) {
      for (const key of ['appointments', 'cashMovements', 'users', 'audit']) delete saved[key];
      saved.patients = data.patients.map(({ id, code, name, cpf, phone }) => ({ id, code, name, cpf, phone }));
    }
    const raw = JSON.stringify(saved);
    await page.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, { key: storageKey, value: raw });
    await open(page, '/cadastro'); await fill(page, true);
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
    await expect(page.locator('main h1')).toHaveText('Cadastro concluído');
    await page.getByRole('link', { name: 'Ir para o login', exact: true }).click();
    await page.locator('#login_password').fill(crypto.randomUUID());
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/#\/painel$/);
    await page.reload();
    for (const route of ['/pacientes/visitor-patient', '/orcamentos/visitor-budget', '/estoque/s1', '/administracao']) {
      await page.goto(`./#${route}`); await expect(page.locator('main h1')).toBeVisible();
      await expect(page.getByText('Carregando registros…')).toHaveCount(0);
      expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(raw);
    }
  });
}

test('axe, reflow 320 px, alvos de toque, movimento reduzido e capturas reais', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const requests: string[] = []; page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) requests.push(request.method()); });
  const original = page.viewportSize()!;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/login', '/cadastro']) {
    await page.setViewportSize(original); await open(page, route);
    await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}.png`), fullPage: true });
    for (const viewport of [original, { width: 320, height: 812 }, { width: 720, height: 480 }]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      for (const button of await page.locator('main button, main a').all()) {
        const box = (await button.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
    await page.getByRole('button', { name: route === '/login' ? 'Entrar' : 'Criar conta', exact: true }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press('Control+Alt+r');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await fill(page, route === '/cadastro'); await scenario(page, 'slow');
    await page.getByRole('button', { name: route === '/login' ? 'Entrar' : 'Criar conta', exact: true }).click();
    expect(await page.locator('button[aria-busy="true"] [aria-hidden="true"]').evaluate(spinner => getComputedStyle(spinner).animationName)).toBe('none');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page.locator('main h1')).toHaveText(route === '/login' ? 'Painel' : 'Cadastro concluído');
  }
  expect(errors).toEqual([]); expect(requests).toEqual([]);
});
