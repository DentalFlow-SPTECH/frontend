import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useRepository } from '../../../app/app_provider.jsx';
import { validateLogin } from '../model/auth_model.js';

export function useLoginViewModel() {
    const repository = useRepository('auth');
    const { notice } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [form, setForm] = useState({ login: '', password: '' });
    const [errors, setErrors] = useState({});
    const [failure, setFailure] = useState('');
    const [busy, setBusy] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    function change(field, value) {
        setForm(current => ({ ...current, [field]: value }));
        setErrors(current => ({ ...current, [field]: undefined }));
        setFailure('');
    }

    async function submit() {
        const found = validateLogin(form);
        setErrors(found);
        if (Object.keys(found).length)
            return false;
        setBusy(true);
        setFailure('');
        try {
            await repository.signIn(form.login, form.password);
            const back = params.get('volta');
            navigate(back && back.startsWith('/') && !back.startsWith('//') ? back : '/hoje', { replace: true });
            return true;
        }
        catch (error) {
            setFailure(error.status === 401 ? 'Usuário ou senha incorretos. Confira e tente de novo.' : error.message);
            setForm(current => ({ ...current, password: '' }));
            return false;
        }
        finally {
            setBusy(false);
        }
    }

    return { form, errors, failure, notice, busy, showPassword, togglePassword: () => setShowPassword(value => !value), change, submit };
}
