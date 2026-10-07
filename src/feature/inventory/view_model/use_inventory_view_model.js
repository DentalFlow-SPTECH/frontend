import { useState, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useResource } from '../../../component/use_resource.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { normalize, readMoney, today } from '../../../demo/format.js';
import { useClinicData, useClinicRepository } from '../../../app/app_provider.jsx';
import { isDate, readQuantity, initialProduct, exitReasons } from '../model/inventory_model.js';
export function useInventoryListViewModel() {
    const { data } = useClinicData();
    const resource = useResource('inventory');
    const [params, setParams] = useSearchParams();
    const query = params.get('q') ?? '';
    const lowOnly = params.get('abaixo') === '1';
    const search = params.size ? `?${params}` : '';
    const filtered = data.products.filter(product => (!lowOnly || product.quantity < product.minimum) && normalize(`${product.name} ${product.code} ${product.category}`).includes(normalize(query)));
    function updateFilter(key, value) {
        const next = new URLSearchParams(params);
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        setParams(next, { replace: true, flushSync: true });
    }
    function clearFilters() { setParams({}, { replace: true, flushSync: true }); }
    return { data, resource, query, lowOnly, search, filtered, updateFilter, clearFilters };
}
export function useProductDetailViewModel() {
    const { id } = useParams();
    const { data } = useClinicData();
    const { search } = useLocation();
    const resource = useResource(`product:${id}`);
    const product = data.products.find(value => value.id === id);
    if (resource.busy)
        return { search, resource, product };
    if (resource.error)
        return { search, resource, product };
    if (!product)
        return { search, resource, product };
    const movements = data.movements.filter(value => value.productId === product.id).reverse().sort((a, b) => b.date.localeCompare(a.date));
    return { search, resource, product, movements };
}
export function useProductFormViewModel() {
    const submissionLock = useRef(false);
    const { createProduct } = useClinicRepository('inventory');
    const resource = useResource('product-form');
    const { search } = useLocation();
    const navigate = useNavigate();
    const [fields, setFields] = useState(initialProduct);
    const [errors, setErrors] = useState({});
    const [saveError, setSaveError] = useState('');
    const [busy, setBusy] = useState(false);
    const [created, setCreated] = useState(null);
    const [additionalOpen, setAdditionalOpen] = useState(false);
    const dirty = !created && Object.keys(fields).some(key => fields[key] !== initialProduct[key]);
    useUnsaved(dirty, busy);
    function change(key, value) { setFields(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: '' })); }
    async function submit() {
        if (submissionLock.current || busy || created)
            return;
        const nextErrors = {};
        if (!fields.name.trim())
            nextErrors.name = 'Informe o nome do material.';
        if (!fields.unit.trim())
            nextErrors.unit = 'Informe a unidade de medida, como caixa ou unidade.';
        const quantity = readQuantity(fields.quantity);
        const minimum = readQuantity(fields.minimum);
        const costCents = readMoney(fields.cost);
        if (quantity === null)
            nextErrors.quantity = 'Informe uma quantidade inteira igual ou maior que zero.';
        if (minimum === null)
            nextErrors.minimum = 'Informe um mínimo inteiro igual ou maior que zero.';
        if (costCents === null)
            nextErrors.cost = 'Informe um valor igual ou maior que zero, com até duas casas decimais.';
        if (fields.expiresOn && !isDate(fields.expiresOn))
            nextErrors.expiresOn = 'Informe uma data válida ou deixe o campo vazio.';
        setErrors(nextErrors);
        setSaveError('');
        if (Object.keys(nextErrors).length) {
            if (nextErrors.expiresOn)
                setAdditionalOpen(true);
            return 'product_' + Object.keys(nextErrors)[0];
        }
        const input = { name: fields.name.trim(), category: fields.category.trim(), description: fields.description.trim(), unit: fields.unit.trim(), quantity: quantity, minimum: minimum, costCents: costCents, supplier: fields.supplier.trim(), lot: fields.lot.trim(), expiresOn: fields.expiresOn };
        submissionLock.current = true;
        setBusy(true);
        try {
            setCreated(await createProduct(input));
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setBusy(false);
        }
    }
    if (created)
        return { resource, search, navigate, fields, errors, saveError, busy, created, additionalOpen, setAdditionalOpen, change, submit };
    if (resource.busy)
        return { resource, search, navigate, fields, errors, saveError, busy, created, additionalOpen, setAdditionalOpen, change, submit };
    if (resource.error)
        return { resource, search, navigate, fields, errors, saveError, busy, created, additionalOpen, setAdditionalOpen, change, submit };
    return { resource, search, navigate, fields, errors, saveError, busy, created, additionalOpen, setAdditionalOpen, change, submit };
}
export function useStockEntryFormViewModel({ id }) {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { addEntry } = useClinicRepository('inventory');
    const { search } = useLocation();
    const navigate = useNavigate();
    const resource = useResource(`entry:${id}`);
    const product = data.products.find(value => value.id === id);
    const [initial] = useState(() => ({ quantity: '', date: today(), supplier: '', purchase: '', lot: '', expiresOn: '', observation: '' }));
    const [fields, setFields] = useState(initial);
    const [errors, setErrors] = useState({});
    const [saveError, setSaveError] = useState('');
    const [busy, setBusy] = useState(false);
    const [savedQuantity, setSavedQuantity] = useState(null);
    const [additionalOpen, setAdditionalOpen] = useState(false);
    const dirty = savedQuantity === null && Object.keys(fields).some(key => fields[key] !== initial[key]);
    useUnsaved(dirty, busy);
    function change(key, value) { setFields(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: '' })); }
    async function submit() {
        if (submissionLock.current || !product || busy || savedQuantity !== null)
            return;
        const nextErrors = {};
        const quantity = readQuantity(fields.quantity);
        const purchaseCents = fields.purchase.trim() ? readMoney(fields.purchase) : 0;
        if (quantity === null || quantity <= 0 || !Number.isSafeInteger(product.quantity + quantity))
            nextErrors.quantity = 'Informe uma quantidade inteira maior que zero.';
        if (!isDate(fields.date))
            nextErrors.date = 'Informe uma data válida para registrar a movimentação.';
        if (purchaseCents === null)
            nextErrors.purchase = 'Informe um valor igual ou maior que zero, com até duas casas decimais, ou deixe vazio.';
        if (fields.expiresOn && !isDate(fields.expiresOn))
            nextErrors.expiresOn = 'Informe uma data válida ou deixe o campo vazio.';
        setErrors(nextErrors);
        setSaveError('');
        if (Object.keys(nextErrors).length) {
            if (nextErrors.purchase || nextErrors.expiresOn)
                setAdditionalOpen(true);
            return 'entry_' + Object.keys(nextErrors)[0];
        }
        submissionLock.current = true;
        setBusy(true);
        try {
            await addEntry({ productId: product.id, quantity: quantity, date: fields.date, supplier: fields.supplier.trim(), purchaseCents: purchaseCents, lot: fields.lot.trim(), expiresOn: fields.expiresOn, observation: fields.observation.trim() });
            setSavedQuantity(quantity);
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar a entrada. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setBusy(false);
        }
    }
    if (resource.busy)
        return { search, navigate, resource, product, fields, errors, saveError, busy, savedQuantity, additionalOpen, setAdditionalOpen, change, submit };
    if (resource.error)
        return { search, navigate, resource, product, fields, errors, saveError, busy, savedQuantity, additionalOpen, setAdditionalOpen, change, submit };
    if (!product)
        return { search, navigate, resource, product, fields, errors, saveError, busy, savedQuantity, additionalOpen, setAdditionalOpen, change, submit };
    const detailPath = `/estoque/${product.id}${search}`;
    if (savedQuantity !== null)
        return { search, navigate, resource, product, fields, errors, saveError, busy, savedQuantity, additionalOpen, setAdditionalOpen, change, submit, detailPath };
    const entryQuantity = readQuantity(fields.quantity);
    const resultingQuantity = entryQuantity !== null && entryQuantity > 0 && Number.isSafeInteger(product.quantity + entryQuantity) ? product.quantity + entryQuantity : null;
    return { search, navigate, resource, product, fields, errors, saveError, busy, savedQuantity, additionalOpen, setAdditionalOpen, change, submit, detailPath, resultingQuantity };
}
export function useStockExitFormViewModel({ id }) {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { addExit } = useClinicRepository('inventory');
    const { search } = useLocation();
    const navigate = useNavigate();
    const resource = useResource(`exit:${id}`);
    const product = data.products.find(value => value.id === id);
    const [initial] = useState(() => ({ quantity: '', date: today(), reason: '', observation: '' }));
    const [fields, setFields] = useState(initial);
    const [errors, setErrors] = useState({});
    const [saveError, setSaveError] = useState('');
    const [busy, setBusy] = useState(false);
    const [savedQuantity, setSavedQuantity] = useState(null);
    const dirty = savedQuantity === null && Object.keys(fields).some(key => fields[key] !== initial[key]);
    useUnsaved(dirty, busy);
    function change(key, value) { setFields(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: '' })); }
    async function submit() {
        if (submissionLock.current || !product || busy || savedQuantity !== null)
            return;
        const nextErrors = {};
        const quantity = readQuantity(fields.quantity);
        if (quantity === null || quantity <= 0)
            nextErrors.quantity = 'Informe uma quantidade inteira maior que zero.';
        else if (quantity > product.quantity)
            nextErrors.quantity = 'A quantidade supera o saldo disponível. Revise a quantidade.';
        if (!isDate(fields.date))
            nextErrors.date = 'Informe uma data válida para registrar a movimentação.';
        if (!exitReasons.includes(fields.reason))
            nextErrors.reason = 'Selecione o motivo da saída.';
        setErrors(nextErrors);
        setSaveError('');
        if (Object.keys(nextErrors).length) {
            return 'exit_' + Object.keys(nextErrors)[0];
        }
        submissionLock.current = true;
        setBusy(true);
        try {
            await addExit({ productId: product.id, quantity: quantity, date: fields.date, reason: fields.reason, observation: fields.observation.trim() });
            setSavedQuantity(quantity);
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar a saída. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setBusy(false);
        }
    }
    if (resource.busy)
        return { search, navigate, resource, product, fields, errors, saveError, busy, savedQuantity, change, submit };
    if (resource.error)
        return { search, navigate, resource, product, fields, errors, saveError, busy, savedQuantity, change, submit };
    if (!product)
        return { search, navigate, resource, product, fields, errors, saveError, busy, savedQuantity, change, submit };
    const detailPath = `/estoque/${product.id}${search}`;
    if (savedQuantity !== null)
        return { search, navigate, resource, product, fields, errors, saveError, busy, savedQuantity, change, submit, detailPath };
    const exitQuantity = readQuantity(fields.quantity);
    const resultingQuantity = exitQuantity !== null && exitQuantity > 0 && exitQuantity <= product.quantity ? product.quantity - exitQuantity : null;
    return { search, navigate, resource, product, fields, errors, saveError, busy, savedQuantity, change, submit, detailPath, resultingQuantity };
}
