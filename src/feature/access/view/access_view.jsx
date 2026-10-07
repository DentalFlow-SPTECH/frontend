import { useEffect, useRef, useState } from 'react';
import { ActionLink, Button, Feedback, Field, PageHeader } from '../../../component/ui.jsx';
import logo from '../../../asset/brand/dental_flow_logo.png';
import styles from './access.module.css';
import { useLoginViewModel, useRegistrationViewModel, useAccessScenarioViewModel } from '../view_model/use_access_view_model.js';
function AccessLayout({ title, description, pending, children }) {
    const { scenario, setScenario } = useAccessScenarioViewModel();
    const [reviewOpen, setReviewOpen] = useState(false);
    const dialog = useRef(null);
    const previousFocus = useRef(null);
    useEffect(() => {
        function review(event) {
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
            previousFocus.current = document.activeElement;
            element.showModal();
        }
        if (!reviewOpen && element?.open)
            element.close();
    }, [reviewOpen]);
    return <div className={styles.layout}>
    <main className={styles.panel}>
      <header className={styles.brandHeader}>
        <img className={styles.logo} src={logo} alt="Dental Flow" width="402" height="362"/>
        <div className={styles.brandContext}><span aria-hidden="true"/><p>Acesso à clínica</p></div>
      </header>
      <div className={styles.content}>
        <PageHeader title={title} description={description}/>
        {children}
      </div>
    </main>
    <dialog ref={dialog} className={styles.reviewDialog} aria-labelledby="access_review_title" onCancel={() => setReviewOpen(false)} onClose={() => { setReviewOpen(false); previousFocus.current?.focus(); }}>
      {reviewOpen && <div className={styles.form}>
        <h2 id="access_review_title">Revisão da interface</h2>
        <Field id="access_scenario" label="Cenário de revisão"><select disabled={pending} value={scenario === 'read-error' ? 'normal' : scenario} onChange={event => setScenario(event.target.value)}>
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
function PasswordField({ id, label, autoComplete, value, error, onChange }) {
    const [visible, setVisible] = useState(false);
    const subject = id === 'registration_confirmation' ? 'confirmação de senha' : 'senha';
    return <div className={styles.passwordField}>
    <Field id={id} label={label} error={error}><input type={visible ? 'text' : 'password'} required autoComplete={autoComplete} value={value} onChange={event => onChange(event.target.value)}/></Field>
    <Button className={styles.passwordToggle} variant="quiet" aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${subject}`} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(value => !value)}>{visible ? 'Ocultar' : 'Mostrar'}</Button>
  </div>;
}
function useFailureFocus(failed) {
    const notice = useRef(null);
    useEffect(() => {
        if (failed)
            notice.current?.focus();
    }, [failed]);
    return notice;
}
function ForwardArrow() {
    return <svg className={styles.forwardArrow} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>;
}
export function LoginPage() {
    const { email, changeEmail, password, changePassword, errors, status, pending, send } = useLoginViewModel();
    async function handleSend(event) { event.preventDefault(); const target = await send(); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    const notice = useFailureFocus(status === 'error');
    return <AccessLayout title="Login" description="Informe seu e-mail e senha para entrar." pending={pending}>
    <form className={styles.form} noValidate onSubmit={handleSend}>
      <fieldset className={styles.fields} disabled={pending || status === 'success'}>
        <legend className={styles.srOnly}>Dados de acesso</legend>
        <Field id="login_email" label="E-mail" error={errors.login_email}><input type="email" required autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={event => changeEmail(event.target.value)}/></Field>
        <PasswordField id="login_password" label="Senha" autoComplete="current-password" value={password} error={errors.login_password} onChange={changePassword}/>
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
    const { name, email, password, confirmation, errors, status, pending, completed, change, send } = useRegistrationViewModel();
    async function handleSend(event) { event.preventDefault(); const target = await send(); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    const notice = useFailureFocus(status === 'error');
    return <AccessLayout title={completed ? 'Cadastro concluído' : 'Criar conta'} description={completed ? 'Volte ao login para continuar.' : 'Preencha seus dados. Todos os campos são obrigatórios.'} pending={pending}>
    {completed ? <div className={styles.form}>
      <Feedback tone="success">Cadastro demonstrativo concluído.</Feedback>
      <ActionLink className={styles.primaryAction} to="/login" state={{ email: email.trim() }} replace>Ir para o login<ForwardArrow /></ActionLink>
    </div> : <form className={styles.form} noValidate onSubmit={handleSend}>
      <fieldset className={styles.fields} disabled={pending}>
        <legend className={styles.srOnly}>Dados para criar conta</legend>
        <Field id="registration_name" label="Nome completo" error={errors.registration_name}><input required autoComplete="name" value={name} onChange={event => change('registration_name', event.target.value)}/></Field>
        <Field id="registration_email" label="E-mail" error={errors.registration_email}><input type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={event => change('registration_email', event.target.value)}/></Field>
        <PasswordField id="registration_password" label="Senha" autoComplete="new-password" value={password} error={errors.registration_password} onChange={value => change('registration_password', value)}/>
        <PasswordField id="registration_confirmation" label="Confirmar senha" autoComplete="new-password" value={confirmation} error={errors.registration_confirmation} onChange={value => change('registration_confirmation', value)}/>
      </fieldset>
      {status === 'error' && <div ref={notice} tabIndex={-1}><Feedback tone="error">Não foi possível concluir o cadastro. Seu preenchimento foi mantido. Tente novamente.</Feedback></div>}
      {pending && <p className={styles.srOnly} role="status">Enviando os dados do cadastro.</p>}
      <Button className={styles.primaryAction} type="submit" busy={pending}>{pending ? 'Criando conta…' : 'Criar conta'}{!pending && <ForwardArrow />}</Button>
      <ActionLink className={styles.switchLink} variant="quiet" to="/login">Já tenho uma conta</ActionLink>
    </form>}
  </AccessLayout>;
}
