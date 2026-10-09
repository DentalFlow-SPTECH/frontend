import { useState, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { dateLabel, normalize } from '../../../demo/format.js';
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
    const tab = ['clinicas', 'auditoria'].includes(params.get('aba')) ? params.get('aba') : 'usuarios';
    const tabs = [['usuarios', 'Usuários'], ['clinicas', 'Clínicas'], ['auditoria', 'Auditoria de ações']].map(([key, label]) => ({ key, label, current: key === tab, to: key === 'usuarios' ? '/administracao' : `/administracao?aba=${key}` }));
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
    const clinics = data.clinics.map(clinic => ({ ...clinic, appointments: data.appointments.filter(value => value.clinicId === clinic.id).length }));
    const pending = { appointments: data.appointments.filter(value => !value.clinicId).length, cash: data.cashMovements.filter(value => !value.clinicId).length };
    return { data, query, status, search, resource, filtered, filter, clearFilters, clinics, pending, tab, tabs };
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
export function useClinicFormViewModel({ id }) {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { saveClinic } = useClinicRepository('admin');
    const resource = useResource(`clinic-form:${id ?? 'new'}`);
    const source = data.clinics.find(value => value.id === id);
    const [initial] = useState(() => source?.name ?? '');
    const [name, setName] = useState(initial);
    const [nameError, setNameError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    useUnsaved(!saved && name !== initial, saving);
    function change(value) { setName(value); setNameError(''); }
    async function submit() {
        if (submissionLock.current || saving || saved)
            return;
        setSaveError('');
        if (!name.trim()) {
            setNameError('Informe o nome da clínica.');
            return 'clinic_name';
        }
        submissionLock.current = true;
        setSaving(true);
        try {
            setSaved(await saveClinic({ name }, id));
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    return { resource, source, name, nameError, saveError, saving, saved, change, submit };
}
// Registros anteriores às clínicas aparecem como pendência; nenhum é vinculado sem seleção e confirmação.
export function useClinicLinkViewModel() {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { linkClinic } = useClinicRepository('admin');
    const [params, setParams] = useSearchParams();
    const resource = useResource('clinic-links');
    const kind = params.get('tipo') === 'caixa' ? 'caixa' : 'consultas';
    const appointments = data.appointments.filter(value => !value.clinicId).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)).map(value => ({ id: value.id, path: `/agenda/${value.id}`, title: data.patients.find(patient => patient.id === value.patientId)?.name ?? 'Paciente não disponível', date: `${dateLabel(value.date)} · ${value.time}`, detail: `${data.doctors.find(doctor => doctor.id === value.doctorId)?.name ?? 'Doutor não disponível'} · ${value.procedure}`, note: value.status }));
    const movements = data.cashMovements.filter(value => !value.clinicId).sort((a, b) => b.date.localeCompare(a.date)).map(value => ({ id: value.id, path: `/caixa/${value.id}`, title: value.description, date: dateLabel(value.date), detail: [value.category, value.paymentMethod].filter(Boolean).join(' · ') || 'Sem categoria informada', note: value.type, amountCents: value.amountCents }));
    const records = kind === 'caixa' ? movements : appointments;
    const [clinicId, setClinicId] = useState(() => data.clinics.length === 1 ? data.clinics[0].id : '');
    const [selected, setSelected] = useState([]);
    const [clinicError, setClinicError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);
    useUnsaved(false, saving);
    const chosen = selected.filter(id => records.some(value => value.id === id));
    function toggle(ids, checked) { setSelected(previous => checked ? [...new Set([...previous, ...ids])] : previous.filter(id => !ids.includes(id))); setSaveError(''); setSuccess(''); }
    function changeKind(next) { setSelected([]); setSaveError(''); setSuccess(''); setParams(next === 'caixa' ? { tipo: 'caixa' } : {}); }
    function changeClinic(value) { setClinicId(value); setClinicError(''); }
    async function submit() {
        if (submissionLock.current || saving)
            return;
        setSaveError('');
        setSuccess('');
        if (!clinicId) {
            setClinicError('Selecione a clínica.');
            return 'link_clinic';
        }
        if (!chosen.length) {
            setSaveError('Selecione ao menos um registro para vincular.');
            return;
        }
        submissionLock.current = true;
        setSaving(true);
        try {
            const count = await linkClinic({ clinicId, appointmentIds: kind === 'consultas' ? chosen : [], cashIds: kind === 'caixa' ? chosen : [] });
            setSuccess(`${count} ${count === 1 ? 'registro vinculado' : 'registros vinculados'} a ${data.clinics.find(value => value.id === clinicId)?.name}.`);
            setSelected([]);
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível vincular. A seleção foi mantida. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    return { clinics: data.clinics, resource, kind, records, counts: { consultas: appointments.length, caixa: movements.length }, clinicId, clinicError, chosen, saveError, success, saving, toggle, changeKind, changeClinic, submit };
}
