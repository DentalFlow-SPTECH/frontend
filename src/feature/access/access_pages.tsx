import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ActionLink, Button, Feedback, Field, PageHeader } from '../../component/ui';
import { useUnsaved } from '../../component/use_unsaved';
import { useDemo } from '../../demo/store';
import logo from '../../asset/brand/dental_flow_logo.png';
import styles from './access.module.css';

// Only schedules interface feedback. It receives no credentials and writes no data.
function useAccessDemo() {
  const { scenario } = useDemo();
  const [status, setStatus] = useState<'idle' | 'pending' | 'error' | 'success'>('idle');
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function submit() {
    if (locked.current) return;
    locked.current = true;
    setStatus('pending');
    timer.current = setTimeout(() => {
      locked.current = false;
      setStatus(scenario === 'write-error' ? 'error' : 'success');
    }, scenario === 'slow' ? 2200 : 650);
  }
  return { status, submit, pending: status === 'pending' };
}

function AccessLayout({ title, description, pending, children }: { title: string; description: string; pending: boolean; children: ReactNode }) {
  const { scenario, setScenario } = useDemo();
  const [reviewOpen, setReviewOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    function review(event: KeyboardEvent) {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        setReviewOpen(value => !value);
      }
    }
    document.addEventListener('keydown', review);
    return () => document.removeEventListener('keydown', review);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (reviewOpen && element && !element.open) {
      previousFocus.current = document.activeElement as HTMLElement;
      element.showModal();
    }
    if (!reviewOpen && element?.open) element.close();
  }, [reviewOpen]);
  return <div className={styles.layout}>
    <main className={styles.panel}>
      <header className={styles.brandHeader}>
        <img className={styles.logo} src={logo} alt="Dental Flow" width="402" height="362" />
        <div className={styles.brandContext}><span aria-hidden="true" /><p>Acesso à clínica</p></div>
      </header>
      <div className={styles.content}>
        <PageHeader title={title} description={description} />
        {children}
      </div>
    </main>
    <dialog ref={dialog} className={styles.reviewDialog} aria-labelledby="access_review_title" onCancel={() => setReviewOpen(false)} onClose={() => { setReviewOpen(false); previousFocus.current?.focus(); }}>
      {reviewOpen && <div className={styles.form}>
        <h2 id="access_review_title">Revisão da interface</h2>
        <Field id="access_scenario" label="Cenário de revisão"><select disabled={pending} value={scenario === 'read-error' ? 'normal' : scenario} onChange={event => setScenario(event.target.value as typeof scenario)}>
          <option value="normal">Funcionamento normal</option>
          <option value="slow">Envio lento</option>
          <option value="write-error">Falha ao enviar</option>
        </select></Field>
        <p>O cenário atua somente na demonstração e volta ao normal ao recarregar.</p>
        <Button variant="quiet" onClick={() => setReviewOpen(false)}>Fechar revisão</Button>
      </div>}
    </dialog>
  </div>;
}

function PasswordField({ id, label, autoComplete, value, error, onChange }: { id: string; label: string; autoComplete: 'current-password' | 'new-password'; value: string; error?: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  const subject = id === 'registration_confirmation' ? 'confirmação de senha' : 'senha';
  return <div className={styles.passwordField}>
    <Field id={id} label={label} error={error}><input type={visible ? 'text' : 'password'} required autoComplete={autoComplete} value={value} onChange={event => onChange(event.target.value)} /></Field>
    <Button className={styles.passwordToggle} variant="quiet" aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${subject}`} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(value => !value)}>{visible ? 'Ocultar' : 'Mostrar'}</Button>
  </div>;
}

function emailError(value: string) {
  if (!value.trim()) return 'Informe seu e-mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Informe um e-mail válido, como nome@exemplo.com.';
  return undefined;
}

function useFailureFocus(failed: boolean) {
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => { if (failed) notice.current?.focus(); }, [failed]);
  return notice;
}

function ForwardArrow() {
  return <svg className={styles.forwardArrow} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
}

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => typeof location.state?.email === 'string' ? location.state.email : '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const { status, pending, submit } = useAccessDemo();
  const notice = useFailureFocus(status === 'error');
  // Switching to account creation is routine. Only an active send blocks departure.
  useUnsaved(false, pending);
  useEffect(() => {
    if (status !== 'success') return;
    setPassword('');
    const timer = setTimeout(() => navigate('/painel', { replace: true, state: null }), 500);
    return () => clearTimeout(timer);
  }, [status, navigate]);
  function send(event: FormEvent) {
    event.preventDefault();
    if (pending || status === 'success') return;
    const next = { login_email: emailError(email), login_password: !password ? 'Informe sua senha.' : undefined };
    setErrors(next);
    const first = Object.keys(next).find(key => next[key as keyof typeof next]);
    if (first) { requestAnimationFrame(() => document.getElementById(first)?.focus()); return; }
    submit();
  }
  return <AccessLayout title="Login" description="Informe seu e-mail e senha para entrar." pending={pending}>
    <form className={styles.form} noValidate onSubmit={send}>
      <fieldset className={styles.fields} disabled={pending || status === 'success'}>
        <legend className={styles.srOnly}>Dados de acesso</legend>
        <Field id="login_email" label="E-mail" error={errors.login_email}><input type="email" required autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={event => { setEmail(event.target.value); setErrors(current => ({ ...current, login_email: undefined })); }} /></Field>
        <PasswordField id="login_password" label="Senha" autoComplete="current-password" value={password} error={errors.login_password} onChange={value => { setPassword(value); setErrors(current => ({ ...current, login_password: undefined })); }} />
      </fieldset>
      {status === 'error' && <div ref={notice} tabIndex={-1}><Feedback tone="error">Não foi possível entrar. Seu preenchimento foi mantido. Tente novamente.</Feedback></div>}
      {pending && <p className={styles.srOnly} role="status">Verificando os dados de acesso.</p>}
      {status === 'success' && <Feedback tone="success">Entrada demonstrativa concluída. Abrindo o Painel…</Feedback>}
      <Button className={styles.primaryAction} type="submit" busy={pending} disabled={status === 'success'}>{pending ? 'Entrando…' : 'Entrar'}{!pending && <ForwardArrow />}</Button>
      <ActionLink className={styles.switchLink} variant="quiet" to="/cadastro">Criar conta</ActionLink>
    </form>
  </AccessLayout>;
}

export function RegistrationPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const { status, pending, submit } = useAccessDemo();
  const completed = status === 'success';
  const notice = useFailureFocus(status === 'error');
  useUnsaved(!completed && Boolean(name || email || password || confirmation), pending);
  useEffect(() => { if (completed) { setPassword(''); setConfirmation(''); } }, [completed]);
  function change(key: string, setter: (value: string) => void, value: string) {
    setter(value);
    setErrors(current => ({ ...current, [key]: undefined, ...(key === 'registration_password' ? { registration_confirmation: undefined } : {}) }));
  }
  function send(event: FormEvent) {
    event.preventDefault();
    if (pending || completed) return;
    const next = {
      registration_name: !name.trim() ? 'Informe seu nome completo.' : undefined,
      registration_email: emailError(email),
      registration_password: !password ? 'Informe uma senha.' : undefined,
      registration_confirmation: !confirmation ? 'Confirme sua senha.' : password !== confirmation ? 'As senhas devem ser iguais.' : undefined,
    };
    setErrors(next);
    const first = Object.keys(next).find(key => next[key as keyof typeof next]);
    if (first) { requestAnimationFrame(() => document.getElementById(first)?.focus()); return; }
    submit();
  }
  return <AccessLayout title={completed ? 'Cadastro concluído' : 'Criar conta'} description={completed ? 'Volte ao login para continuar.' : 'Preencha seus dados. Todos os campos são obrigatórios.'} pending={pending}>
    {completed ? <div className={styles.form}>
      <Feedback tone="success">Cadastro demonstrativo concluído.</Feedback>
      <ActionLink className={styles.primaryAction} to="/login" state={{ email: email.trim() }} replace>Ir para o login<ForwardArrow /></ActionLink>
    </div> : <form className={styles.form} noValidate onSubmit={send}>
      <fieldset className={styles.fields} disabled={pending}>
        <legend className={styles.srOnly}>Dados para criar conta</legend>
        <Field id="registration_name" label="Nome completo" error={errors.registration_name}><input required autoComplete="name" value={name} onChange={event => change('registration_name', setName, event.target.value)} /></Field>
        <Field id="registration_email" label="E-mail" error={errors.registration_email}><input type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={event => change('registration_email', setEmail, event.target.value)} /></Field>
        <PasswordField id="registration_password" label="Senha" autoComplete="new-password" value={password} error={errors.registration_password} onChange={value => change('registration_password', setPassword, value)} />
        <PasswordField id="registration_confirmation" label="Confirmar senha" autoComplete="new-password" value={confirmation} error={errors.registration_confirmation} onChange={value => change('registration_confirmation', setConfirmation, value)} />
      </fieldset>
      {status === 'error' && <div ref={notice} tabIndex={-1}><Feedback tone="error">Não foi possível concluir o cadastro. Seu preenchimento foi mantido. Tente novamente.</Feedback></div>}
      {pending && <p className={styles.srOnly} role="status">Enviando os dados do cadastro.</p>}
      <Button className={styles.primaryAction} type="submit" busy={pending}>{pending ? 'Criando conta…' : 'Criar conta'}{!pending && <ForwardArrow />}</Button>
      <ActionLink className={styles.switchLink} variant="quiet" to="/login">Já tenho uma conta</ActionLink>
    </form>}
  </AccessLayout>;
}
