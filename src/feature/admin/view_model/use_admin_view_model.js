import { useState, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { normalize } from '../../../demo/format.js';
import { useResource } from '../../../component/use_resource.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { useClinicData, useClinicRepository } from '../../../app/app_provider.jsx';
import { emptyUser, fieldKeys } from '../model/admin_model.js';
export function useAdminViewModel() {
    const { data } = useClinicData();
    const [params, setParams] = useSearchParams();
    const query = params.get('q') ?? '';
    const status = params.get('status') ?? '';
    const search = params.toString() ? `?${params.toString()}` : '';
    const resource = useResource('administration');
    const filtered = data.users.filter(user => normalize(`${user.name} ${user.email} ${user.login} ${user.profile}`).includes(normalize(query)) && (!status || (status === 'blocked' ? user.blocked : !user.blocked)));
    function filter(key, value) {
        const next = new URLSearchParams(params);
        next.delete('pagina');
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        setParams(next, { replace: true });
    }
    function clearFilters() { setParams({}); }
    return { data, query, status, search, resource, filtered, filter, clearFilters };
}
export function useUserDetailViewModel({ id }) {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { setUserBlocked } = useClinicRepository('admin');
    const { search } = useLocation();
    const resource = useResource(`user:${id}`);
    const user = data.users.find(value => value.id === id);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [success, setSuccess] = useState('');
    useUnsaved(false, saving);
    async function toggleBlocked(confirmed) {
        if (submissionLock.current || !user || saving)
            return;
        const next = !user.blocked;
        if (!confirmed)
            return;
        setSaveError('');
        setSuccess('');
        submissionLock.current = true;
        setSaving(true);
        try {
            await setUserBlocked(user.id, next);
            setSuccess(`Usuário ${next ? 'bloqueado' : 'reativado'}.`);
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o status. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    if (resource.busy)
        return { search, resource, user, saving, saveError, success, toggleBlocked };
    if (resource.error)
        return { search, resource, user, saving, saveError, success, toggleBlocked };
    if (!user)
        return { search, resource, user, saving, saveError, success, toggleBlocked };
    return { search, resource, user, saving, saveError, success, toggleBlocked };
}
export function useUserFormViewModel({ id }) {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { saveUser } = useClinicRepository('admin');
    const { search } = useLocation();
    const resource = useResource(`user-form:${id ?? 'new'}`);
    const source = data.users.find(value => value.id === id);
    const [initial] = useState(() => source ? { ...emptyUser, ...Object.fromEntries(fieldKeys.map(key => [key, source[key] ?? ''])), permissions: [...source.permissions] } : emptyUser);
    const [values, setValues] = useState(initial);
    const [nameError, setNameError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    const dirty = !saved && (fieldKeys.some(key => values[key] !== initial[key]) || [...values.permissions].sort().join('|') !== [...initial.permissions].sort().join('|'));
    useUnsaved(dirty, saving);
    function togglePermission(permission) { setValues(previous => ({ ...previous, permissions: previous.permissions.includes(permission) ? previous.permissions.filter(value => value !== permission) : [...previous.permissions, permission] })); }
    async function submit() {
        if (submissionLock.current || saving || saved)
            return;
        setSaveError('');
        if (!values.name.trim()) {
            setNameError('Informe o nome completo do usuário.');
            return 'user_name';
        }
        submissionLock.current = true;
        setSaving(true);
        try {
            setSaved(await saveUser({ ...values, name: values.name.trim() }, id));
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    if (saved)
        return { search, resource, source, values, nameError, saveError, saving, saved, togglePermission, submit };
    if (resource.busy)
        return { search, resource, source, values, nameError, saveError, saving, saved, togglePermission, submit };
    if (resource.error)
        return { search, resource, source, values, nameError, saveError, saving, saved, togglePermission, submit };
    if (id && !source)
        return { search, resource, source, values, nameError, saveError, saving, saved, togglePermission, submit };
    const returnTo = id ? `/administracao/${id}${search}` : `/administracao${search}`;
    function change(key, value) { setValues(previous => ({ ...previous, [key]: value })); if (key === 'name')
        setNameError(''); }
    return { search, resource, source, values, nameError, saveError, saving, saved, togglePermission, submit, returnTo, change };
}
