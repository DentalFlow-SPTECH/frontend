import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { useClinicData } from '../../../app/app_provider.jsx';
import { emailError } from '../model/access_model.js';
function useAccessDemo() {
    const { scenario } = useClinicData();
    const [status, setStatus] = useState('idle');
    const locked = useRef(false);
    const timer = useRef(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    function submit() {
        if (locked.current)
            return;
        locked.current = true;
        setStatus('pending');
        timer.current = setTimeout(() => {
            locked.current = false;
            setStatus(scenario === 'write-error' ? 'error' : 'success');
        }, scenario === 'slow' ? 2200 : 650);
    }
    return { status, submit, pending: status === 'pending' };
}
export function useLoginViewModel() {
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState(() => typeof location.state?.email === 'string' ? location.state.email : '');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const { status, pending, submit } = useAccessDemo();
    useUnsaved(false, pending);
    useEffect(() => {
        if (status !== 'success')
            return;
        setPassword('');
        const timer = setTimeout(() => navigate('/painel', { replace: true, state: null }), 500);
        return () => clearTimeout(timer);
    }, [status, navigate]);
    function send() {
        if (pending || status === 'success')
            return;
        const next = { login_email: emailError(email), login_password: !password ? 'Informe sua senha.' : undefined };
        setErrors(next);
        const first = Object.keys(next).find(key => next[key]);
        if (first) {
            return first;
        }
        submit();
    }
    function changeEmail(value) { setEmail(value); setErrors(current => ({ ...current, login_email: undefined })); }
    function changePassword(value) { setPassword(value); setErrors(current => ({ ...current, login_password: undefined })); }
    return { email, password, errors, status, pending, send, changeEmail, changePassword };
}
export function useRegistrationViewModel() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [errors, setErrors] = useState({});
    const { status, pending, submit } = useAccessDemo();
    const completed = status === 'success';
    useUnsaved(!completed && Boolean(name || email || password || confirmation), pending);
    useEffect(() => {
        if (completed) {
            setPassword('');
            setConfirmation('');
        }
    }, [completed]);
    function change(key, value) {
        const setter = { registration_name: setName, registration_email: setEmail, registration_password: setPassword, registration_confirmation: setConfirmation }[key];
        setter(value);
        setErrors(current => ({ ...current, [key]: undefined, ...(key === 'registration_password' ? { registration_confirmation: undefined } : {}) }));
    }
    function send() {
        if (pending || completed)
            return;
        const next = {
            registration_name: !name.trim() ? 'Informe seu nome completo.' : undefined,
            registration_email: emailError(email),
            registration_password: !password ? 'Informe uma senha.' : undefined,
            registration_confirmation: !confirmation ? 'Confirme sua senha.' : password !== confirmation ? 'As senhas devem ser iguais.' : undefined,
        };
        setErrors(next);
        const first = Object.keys(next).find(key => next[key]);
        if (first) {
            return first;
        }
        submit();
    }
    return { name, email, password, confirmation, errors, status, pending, completed, change, send };
}
export function useAccessScenarioViewModel() { const { scenario, setScenario } = useClinicData(); return { scenario, setScenario }; }
