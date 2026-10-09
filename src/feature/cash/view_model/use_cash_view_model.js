import { useState, useRef } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useResource } from '../../../component/use_resource.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { normalize, readMoney, today } from '../../../demo/format.js';
import { clinicLabel, isDate, matchesClinic, withoutClinic } from '../../../demo/clinic.js';
import { useClinicData, useClinicRepository } from '../../../app/app_provider.jsx';
export function useCashViewModel() {
    const { data } = useClinicData();
    const resource = useResource('cash');
    const [params, setParams] = useSearchParams();
    const from = params.get('de') ?? '';
    const until = params.get('ate') ?? '';
    const type = params.get('tipo') ?? '';
    const category = params.get('categoria') ?? '';
    const paymentMethod = params.get('forma') ?? '';
    const clinicId = params.get('clinica') === withoutClinic || data.clinics.some(value => value.id === params.get('clinica')) ? params.get('clinica') : '';
    const search = params.size ? `?${params.toString()}` : '';
    const invalidPeriod = !!from && !!until && until < from;
    const filtered = data.cashMovements.filter(movement => (!from || movement.date >= from) && (!until || movement.date <= until) &&
        (!type || movement.type === type) && matchesClinic(movement, clinicId) && normalize(movement.category).includes(normalize(category)) &&
        normalize(movement.paymentMethod).includes(normalize(paymentMethod))).sort((a, b) => b.date.localeCompare(a.date));
    const entries = filtered.filter(value => value.type === 'Entrada').reduce((total, value) => total + value.amountCents, 0);
    const exits = filtered.filter(value => value.type === 'Saída').reduce((total, value) => total + value.amountCents, 0);
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
    const clinics = data.clinics;
    function clinicOf(movement) { return clinicLabel(clinics, movement.clinicId); }
    return { resource, params, from, until, type, category, paymentMethod, clinicId, clinics, clinicOf, search, invalidPeriod, filtered, entries, exits, filter, clearFilters };
}
export function useCashDetailViewModel() {
    const { id } = useParams();
    const { search } = useLocation();
    const { data } = useClinicData();
    const resource = useResource(`cash:${id}`);
    const movement = data.cashMovements.find(value => value.id === id);
    const clinic = movement && (movement.clinicId || data.clinics.length) ? clinicLabel(data.clinics, movement.clinicId) : '';
    return { search, resource, movement, clinic };
}
export function useCashFormViewModel({ type }) {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { saveCashMovement } = useClinicRepository('cash');
    const { search } = useLocation();
    const resource = useResource(`cash-form:${type}`);
    const [initial] = useState(() => ({ amount: '', date: today(), description: '', category: '', paymentMethod: '', responsible: '', observation: '', clinicId: '' }));
    const [fields, setFields] = useState(initial);
    const [errors, setErrors] = useState({});
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    const dirty = !saved && Object.keys(initial).some(key => fields[key] !== initial[key]);
    useUnsaved(dirty, saving);
    function change(key, value) {
        setFields(previous => ({ ...previous, [key]: value }));
        if (key === 'amount' || key === 'date' || key === 'description')
            setErrors(previous => ({ ...previous, [key]: '' }));
    }
    async function submit() {
        if (submissionLock.current || saving || saved)
            return;
        setSaveError('');
        const amountCents = readMoney(fields.amount);
        const nextErrors = {};
        if (amountCents === null || amountCents <= 0)
            nextErrors.amount = 'Informe um valor maior que zero com até duas casas decimais.';
        if (!isDate(fields.date))
            nextErrors.date = 'Informe uma data válida para a movimentação.';
        if (!fields.description.trim())
            nextErrors.description = 'Informe a descrição da movimentação.';
        setErrors(nextErrors);
        const first = ['amount', 'date', 'description'].find(key => nextErrors[key]);
        if (first) {
            return `cash_${first}`;
        }
        submissionLock.current = true;
        setSaving(true);
        try {
            setSaved(await saveCashMovement({ type, amountCents: amountCents, date: fields.date, description: fields.description.trim(), category: fields.category.trim(), paymentMethod: fields.paymentMethod.trim(), responsible: fields.responsible.trim(), observation: fields.observation.trim(), clinicId: fields.clinicId }));
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    return { search, resource, clinics: data.clinics, fields, errors, saveError, saving, saved, change, submit };
}
