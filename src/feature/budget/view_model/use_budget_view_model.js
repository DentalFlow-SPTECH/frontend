import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useResource } from '../../../component/use_resource.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { usePagination } from '../../../component/use_pagination.js';
import { budgetTotal, readMoney, moneyInput } from '../../../demo/format.js';
import { useClinicData, useClinicRepository } from '../../../app/app_provider.jsx';
import { makeDraft, itemValue, dateIsValid } from '../model/budget_model.js';
import { allTeeth } from '../model/teeth.js';
export function useBudgetListViewModel() {
    const { data } = useClinicData();
    const resource = useResource('budgets');
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get('q') ?? '';
    const patient = data.patients.find(value => value.id === searchParams.get('paciente')) ?? data.patients[0];
    const budgets = data.budgets.filter(value => value.patientId === patient?.id).sort((a, b) => b.createdOn.localeCompare(a.createdOn));
    const context = new URLSearchParams(searchParams);
    if (patient) context.set('paciente', patient.id);
    const listSearch = context.size ? `?${context}` : '';
    const newRoute = `/orcamentos/novo?${context}`;
    function searchPatient(value) {
        const next = new URLSearchParams(searchParams);
        next.delete('pagina');
        if (value)
            next.set('q', value);
        else
            next.delete('q');
        setSearchParams(next, { replace: true });
    }
    function selectPatient(id) { setSearchParams({ paciente: id, ...(search ? { q: search } : {}) }); }
    return { data, resource, search, patient, budgets, listSearch, newRoute, searchPatient, selectPatient };
}
export function useBudgetEditorViewModel({ id }) {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { saveBudget } = useClinicRepository('budget');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const source = data.budgets.find(value => value.id === id);
    const resource = useResource(`budget_${id ?? 'new'}`);
    const readonly = !!source && !source.local;
    const requestedPatient = data.patients.find(value => value.id === searchParams.get('paciente'))?.id ?? data.patients[0]?.id ?? '';
    const [draft, setDraft] = useState(() => makeDraft(source, requestedPatient));
    const itemPagination = usePagination(draft.items.length);
    const visibleItems = draft.items.slice(itemPagination.start, itemPagination.end);
    const listContext = new URLSearchParams(searchParams);
    listContext.delete('salvo');
    listContext.set('paciente', draft.patientId);
    if (source && source.patientId !== draft.patientId) listContext.delete('pagina');
    const returnTo = `/orcamentos?${listContext}`;
    const [baseline, setBaseline] = useState(() => JSON.stringify(makeDraft(source, requestedPatient)));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [savedMessage, setSavedMessage] = useState('');
    const [target, setTarget] = useState('');
    const dirty = !readonly && JSON.stringify(draft) !== baseline;
    useUnsaved(dirty, saving);
    useEffect(() => {
        if (target && !dirty)
            navigate(target, { replace: true });
    }, [target, dirty, navigate]);
    const patient = data.patients.find(value => value.id === draft.patientId);
    const validItems = draft.items.map(itemValue);
    const totalValid = validItems.every(value => value !== null) && Number.isSafeInteger(budgetTotal(validItems.filter(value => value !== null)));
    const total = totalValid ? budgetTotal(validItems.filter(value => value !== null)) : null;
    function changeField(key, value) {
        setDraft(current => ({ ...current, [key]: value }));
        setSavedMessage('');
        setErrors(current => { const next = { ...current }; delete next[`budget_${key}`]; return next; });
    }
    function changeItem(itemId, patch, errorKey) {
        setDraft(current => ({ ...current, items: current.items.map(item => item.id === itemId ? { ...item, ...patch } : item) }));
        setSavedMessage('');
        if (errorKey)
            setErrors(current => { const next = { ...current }; delete next[errorKey]; return next; });
    }
    function addItem(tooth = '') {
        const itemId = crypto.randomUUID();
        itemPagination.goTo(Math.floor(draft.items.length / itemPagination.pageSize));
        setDraft(current => ({ ...current, items: [...current.items, { id: itemId, procedure: '', quantity: '1', unitPrice: '', observation: '', tooth, surface: '' }] }));
        setSavedMessage('');
        setErrors(current => { const next = { ...current }; delete next.budget_items; return next; });
        return `item_${itemId}_procedure`;
    }
    function removeItem(itemId) {
        setDraft(current => ({ ...current, items: current.items.filter(item => item.id !== itemId) }));
        setErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`item_${itemId}_`))));
        setSavedMessage('');
        return 'budget_items';
    }
    async function submit() {
        if (submissionLock.current || readonly || saving)
            return;
        const next = {};
        if (!data.patients.some(value => value.id === draft.patientId))
            next.budget_patientId = 'Selecione o paciente.';
        if (!data.doctors.some(value => value.id === draft.doctorId))
            next.budget_doctorId = 'Selecione o doutor.';
        if (!dateIsValid(draft.createdOn))
            next.budget_createdOn = 'Informe uma data de emissão válida.';
        if (draft.validUntil && !dateIsValid(draft.validUntil))
            next.budget_validUntil = 'Informe uma data válida ou deixe em branco.';
        if (!draft.items.length)
            next.budget_items = 'Inclua ao menos um procedimento.';
        draft.items.forEach(item => {
            if (!data.procedures.some(value => value.name === item.procedure))
                next[`item_${item.id}_procedure`] = 'Selecione um procedimento.';
            if (item.tooth && !allTeeth.includes(item.tooth))
                next[`item_${item.id}_tooth`] = 'Selecione um dente válido ou deixe o campo vazio.';
            if (!/^\d+$/.test(item.quantity) || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1)
                next[`item_${item.id}_quantity`] = 'Use uma quantidade inteira maior que zero.';
            if (readMoney(item.unitPrice) === null)
                next[`item_${item.id}_unitPrice`] = 'Use um valor a partir de zero, com até duas casas decimais. Exemplo: 180,00.';
            else if (!itemValue(item) && !next[`item_${item.id}_quantity`])
                next[`item_${item.id}_unitPrice`] = 'O valor informado é muito alto. Revise o valor unitário.';
        });
        if (!totalValid && !Object.keys(next).length)
            next.budget_items = 'O total informado é muito alto. Revise os valores.';
        setErrors(next);
        setSaveError('');
        setSavedMessage('');
        if (Object.keys(next).length) {
            const invalidItem = draft.items.findIndex(item => Object.keys(next).some(key => key.startsWith(`item_${item.id}_`)));
            if (Object.keys(next)[0].startsWith('item_') && invalidItem >= 0)
                itemPagination.goTo(Math.floor(invalidItem / itemPagination.pageSize));
            return Object.keys(next)[0];
        }
        submissionLock.current = true;
        setSaving(true);
        try {
            const items = draft.items.map(item => ({ id: item.id, procedure: item.procedure, observation: item.observation.trim(), quantity: Number(item.quantity), unitPriceCents: readMoney(item.unitPrice), tooth: item.tooth, surface: item.surface.trim() }));
            const input = { patientId: draft.patientId, doctorId: draft.doctorId, createdOn: draft.createdOn, validUntil: draft.validUntil, observation: draft.observation.trim(), paymentNote: draft.paymentNote.trim(), items };
            const saved = await saveBudget(input, id);
            const updated = makeDraft(saved, saved.patientId);
            setDraft(updated);
            setBaseline(JSON.stringify(updated));
            setSavedMessage('Orçamento salvo.');
            if (!id) {
                const savedContext = new URLSearchParams(listContext);
                savedContext.set('salvo', '1');
                setTarget(`/orcamentos/${saved.id}?${savedContext}`);
            }
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    const savedOnArrival = searchParams.get('salvo') === '1' && !dirty;
    function changeProcedure(itemId, value) { const procedure = data.procedures.find(entry => entry.name === value); changeItem(itemId, { procedure: value, unitPrice: procedure ? moneyInput(procedure.referencePriceCents) : '' }, `item_${itemId}_procedure`); setErrors(current => { const next = { ...current }; delete next[`item_${itemId}_unitPrice`]; return next; }); }
    const itemAmounts = Object.fromEntries(draft.items.map(item => { const value = itemValue(item); return [item.id, { unitPriceCents: readMoney(item.unitPrice) ?? 0, subtotal: value ? value.quantity * value.unitPriceCents : null }]; }));
    return { data, source, resource, readonly, draft, errors, saving, saveError, savedMessage, dirty, patient, total, changeField, changeItem, addItem, removeItem, submit, savedOnArrival, changeProcedure, itemAmounts, itemPagination, visibleItems, returnTo };
}
