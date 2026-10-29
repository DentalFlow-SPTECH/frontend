import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useRepository } from '../../../app/app_provider.jsx';
import { useQuery } from '../../../component/use_query.js';
import { usePagination } from '../../../component/use_pagination.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { useToast } from '../../../component/ui/index.js';
import { normalizeText } from '../../../component/format.js';
import {
    emptyEquipmentForm, emptyMovementForm, emptyProductForm, formFromEquipment, formFromProduct, movementTypes,
    stockLevel, validateEquipment, validateMovement, validateProduct,
} from '../model/inventory_model.js';

const inventoryPageSize = 20;
const movementPageSize = 10;

export function useInventoryViewModel() {
    const repository = useRepository('inventory');
    const [params, setParams] = useSearchParams();
    const tab = params.get('aba') === 'equipamentos' ? 'equipamentos' : 'materiais';
    const onlyActive = params.get('todos') !== '1';
    const [term, setTerm] = useState('');
    const query = useQuery(`inventory:${tab}:${onlyActive}`, () => (tab === 'materiais' ? repository.products(onlyActive) : repository.equipment(onlyActive)));
    const text = normalizeText(term);
    const items = [...(query.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).filter(item => !text || normalizeText(item.name).includes(text));
    const pager = usePagination(items, inventoryPageSize);
    const update = next => setParams(current => {
        const updated = new URLSearchParams(current);
        for (const [key, value] of Object.entries(next)) {
            if (value)
                updated.set(key, value);
            else
                updated.delete(key);
        }
        return updated;
    });
    return {
        tab, onlyActive, term, items: pager.items, pager, total: query.data?.length ?? 0,
        lowCount: tab === 'materiais' ? (query.data ?? []).filter(item => item.active && stockLevel(item) !== 'ok').length : 0,
        loading: query.firstLoad, error: query.error, reload: query.reload,
        // Mudar aba, filtro ou busca volta para a primeira página.
        setTerm: value => { setTerm(value); pager.setPage(1); },
        setTab: value => { setTerm(''); update({ aba: value === 'equipamentos' ? 'equipamentos' : '', pagina: '' }); },
        setOnlyActive: value => update({ todos: value ? '' : '1', pagina: '' }),
    };
}

export function useProductDetailViewModel() {
    const repository = useRepository('inventory');
    const toast = useToast();
    const { id } = useParams();
    const query = useQuery(`product:${id}`, () => Promise.all([repository.product(Number(id)), repository.movements(Number(id))]).then(([product, movements]) => ({ product, movements })));
    const [movement, setMovement] = useState(null);
    const [errors, setErrors] = useState({});
    const [failure, setFailure] = useState('');
    const [busy, setBusy] = useState(false);
    const pager = usePagination(query.data?.movements ?? [], movementPageSize);
    return {
        product: query.data?.product, movements: pager.items, pager, loading: query.firstLoad, error: query.error, reload: query.reload,
        movement, errors, failure, busy, movementTypes,
        open: type => { setMovement(emptyMovementForm(type)); setErrors({}); setFailure(''); },
        close: () => setMovement(null),
        change: (field, value) => { setMovement(current => ({ ...current, [field]: value })); setErrors(found => ({ ...found, [field]: undefined })); setFailure(''); },
        async submit() {
            const found = validateMovement(movement, query.data?.product);
            setErrors(found);
            if (Object.keys(found).length)
                return;
            setBusy(true);
            try {
                await repository.move(Number(id), movement);
                toast({ title: `${movementTypes[movement.type].label} registrada` });
                setMovement(null);
                query.reload();
            }
            catch (error) {
                setFailure(error.message);
            }
            finally {
                setBusy(false);
            }
        },
    };
}

function useInventoryForm({ key, load, empty, fromEntity, validate, save, done }) {
    const toast = useToast();
    const navigate = useNavigate();
    const query = useQuery(key, load);
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});
    const [failure, setFailure] = useState('');
    const [busy, setBusy] = useState(false);
    const [dirty, setDirty] = useState(false);
    useUnsaved(dirty && !busy);
    const current = form ?? (query.data === undefined ? null : query.data ? fromEntity(query.data) : empty());
    return {
        form: current, errors, failure, busy, loading: query.firstLoad, error: query.error, reload: query.reload,
        change(field, value) {
            setForm({ ...current, [field]: value });
            setErrors(found => ({ ...found, [field]: undefined }));
            setFailure('');
            setDirty(true);
        },
        async submit() {
            const found = validate(current);
            setErrors(found);
            if (Object.keys(found).length)
                return;
            setBusy(true);
            try {
                const saved = await save(current);
                setDirty(false);
                const { message, to } = done(saved);
                toast({ title: message });
                navigate(to, { replace: true });
            }
            catch (error) {
                setFailure(error.message);
            }
            finally {
                setBusy(false);
            }
        },
    };
}

export function useProductFormViewModel() {
    const repository = useRepository('inventory');
    const { id } = useParams();
    const editing = Boolean(id);
    return {
        editing,
        ...useInventoryForm({
            key: `product-form:${id ?? 'new'}`, load: () => (editing ? repository.product(Number(id)) : Promise.resolve(null)), empty: emptyProductForm, fromEntity: formFromProduct,
            validate: form => validateProduct(form, editing), save: form => repository.saveProduct(editing ? Number(id) : null, form),
            done: saved => ({ message: editing ? 'Material atualizado' : `${saved.name} cadastrado`, to: `/estoque/materiais/${saved.id}` }),
        }),
    };
}

export function useEquipmentFormViewModel() {
    const repository = useRepository('inventory');
    const { id } = useParams();
    const editing = Boolean(id);
    return {
        editing,
        ...useInventoryForm({
            key: `equipment-form:${id ?? 'new'}`, load: () => (editing ? repository.equipmentItem(Number(id)) : Promise.resolve(null)), empty: emptyEquipmentForm, fromEntity: formFromEquipment,
            validate: validateEquipment, save: form => repository.saveEquipment(editing ? Number(id) : null, form),
            done: saved => ({ message: editing ? 'Equipamento atualizado' : `${saved.name} cadastrado`, to: '/estoque?aba=equipamentos' }),
        }),
    };
}
