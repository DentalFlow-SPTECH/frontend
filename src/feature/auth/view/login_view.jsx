import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, LifeBuoy, LockKeyhole, UserRound } from 'lucide-react';
import { Alert, Button, Field, Input } from '../../../component/ui/index.js';
import { BrandMark } from '../../../component/brand.jsx';
import { useLoginViewModel } from '../view_model/use_login_view_model.js';
import styles from './login.module.css';

export function LoginPage() {
    const vm = useLoginViewModel();
    useEffect(() => { document.title = 'Entrar — Dental Flow'; }, []);
    if (vm.signedIn && !vm.busy)
        return <Navigate to={vm.target} replace/>;
    return <main className={styles.page}>
        <section className={styles.hero} aria-hidden="true">
            <BrandMark size={88}/>
            <p className={styles.heroTitle}>Olá! Que bom<br/>ter você aqui.</p>
            <p className={styles.heroText}>A agenda, os pacientes e o dia da clínica em um só lugar.</p>
        </section>
        <section className={styles.panel}>
            <div className={styles.brandRow}><BrandMark size={36}/><span>Dental<b>Flow</b></span></div>
            <h1 className={styles.title}>Entrar</h1>
            <p className={styles.lead}>Use o usuário e a senha que a clínica criou para você.</p>
            {vm.notice && <Alert tone="info">{vm.notice}</Alert>}
            {vm.failure && <Alert tone="danger">{vm.failure}</Alert>}
            <form className={styles.form} noValidate onSubmit={event => { event.preventDefault(); vm.submit(); }}>
                <Field label="Usuário" error={vm.errors.login}>
                    <Input icon={UserRound} value={vm.form.login} onChange={event => vm.change('login', event.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus/>
                </Field>
                <Field label="Senha" error={vm.errors.password}>
                    <Input icon={LockKeyhole} type={vm.showPassword ? 'text' : 'password'} value={vm.form.password} onChange={event => vm.change('password', event.target.value)} autoComplete="current-password"
                        trailing={<button type="button" onClick={vm.togglePassword} aria-label={vm.showPassword ? 'Esconder senha' : 'Mostrar senha'} aria-pressed={vm.showPassword}>
                            {vm.showPassword ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}
                        </button>}/>
                </Field>
                <Button type="submit" size="lg" block busy={vm.busy}>Entrar</Button>
            </form>
            <p className={styles.help}><LifeBuoy aria-hidden="true"/><span>Esqueceu a senha? Peça para o responsável da clínica criar uma nova para você.</span></p>
        </section>
    </main>;
}
