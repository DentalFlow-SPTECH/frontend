import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, useRepository } from '../../../app/app_provider.jsx';
import { useQuery } from '../../../component/use_query.js';
import { usePagination } from '../../../component/use_pagination.js';
import { useCepLookup } from '../../../component/use_cep_lookup.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { useToast } from '../../../component/ui/index.js';
import { maskCep, maskCnpj, maskPhone, normalizeText } from '../../../component/format.js';
import { isDentist } from '../../auth/model/auth_model.js';
import {
    emptyClinicForm, emptyDentistForm, emptyProcedureForm, emptyUserForm, formFromClinic, formFromDentist, formFromProcedure,
    validateClinic, validateDentist, validateProcedure, validateUser,
} from '../model/clinic_model.js';

export function useClinicHubViewModel() {
    const repository = useRepository('clinic');
    const { user } = useAuth();
    const query = useQuery('clinic-hub', () => Promise.all([repository.clinic(), repository.dentists(), repository.procedures()])
        .then(([clinic, dentists, procedures]) => ({ clinic, dentists, procedures })));
    return { canEdit: isDentist(user), data: query.data, loading: query.firstLoad, error: query.error, reload: query.reload };
}

const catalogPageSize = 20;

export function useCatalogViewModel(kind) {
    const repository = useRepository('clinic');
    const { user } = useAuth();
    const [term, setTerm] = useState('');
    const query = useQuery(`catalog:${kind}`, () => (kind === 'dentists' ? repository.dentists() : repository.procedures()));
    const text = normalizeText(term);
    const items = [...(query.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .filter(item => !text || normalizeText(`${item.name} ${item.cro ?? ''} ${item.specialty ?? ''}`).includes(text));
    const pager = usePagination(items, catalogPageSize);
    return {
        canEdit: isDentist(user), items: pager.items, pager, total: query.data?.length ?? 0, term,
        setTerm: value => { setTerm(value); pager.setPage(1); },
        loading: query.firstLoad, error: query.error, reload: query.reload,
    };
}

// Formulário genérico de cadastro: carrega (na edição), valida, envia e mostra o erro da API no campo certo.
function useEntityForm({ key, load, empty, fromEntity, validate, save, masks = {}, done, apiField = () => null }) {
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
    function change(field, value) {
        setForm({ ...current, [field]: masks[field] ? masks[field](value) : value });
        setErrors(found => ({ ...found, [field]: undefined }));
        setFailure('');
        setDirty(true);
    }
    // Atualiza vários campos de uma vez a partir do estado mais recente (ex.: resposta do CEP que chega depois).
    function patch(values) {
        setForm(found => ({ ...(found ?? current), ...values }));
        setErrors(found => ({ ...found, ...Object.fromEntries(Object.keys(values).map(key => [key, undefined])) }));
    }
    async function submit() {
        const found = validate(current);
        setErrors(found);
        if (Object.keys(found).length)
            return;
        setBusy(true);
        setFailure('');
        try {
            const saved = await save(current);
            setDirty(false);
            const { message, to } = done(saved, current);
            toast({ title: message });
            navigate(to, { replace: true });
        }
        catch (error) {
            const field = error.status === 422 ? apiField(error.message) : null;
            if (field)
                setErrors(list => ({ ...list, [field]: error.message }));
            else
                setFailure(error.message);
        }
        finally {
            setBusy(false);
        }
    }
    return { form: current, errors, failure, busy, change, patch, submit, loading: query.firstLoad, error: query.error, reload: query.reload, dirty };
}

export function useClinicFormViewModel() {
    const repository = useRepository('clinic');
    const cep = useCepLookup(repository.findAddress);
    const vm = useEntityForm({
        key: 'clinic-form', load: () => repository.clinic(), empty: emptyClinicForm, fromEntity: formFromClinic, validate: validateClinic,
        save: form => repository.updateClinic(form), masks: { cnpj: maskCnpj, phone: maskPhone, zipCode: maskCep, state: value => value.toUpperCase().slice(0, 2) },
        done: () => ({ message: 'Dados da clínica atualizados', to: '/clinica' }), apiField: message => (normalizeText(message).includes('cnpj') ? 'cnpj' : null),
    });
    // Com o CEP completo, o ViaCEP preenche rua, bairro, cidade e UF; número e complemento ficam com a pessoa.
    const fillAddress = address => vm.patch(Object.fromEntries(Object.entries({ street: address.street, neighborhood: address.neighborhood, city: address.city, state: address.state }).filter(([, value]) => value)));
    return {
        ...vm, cep,
        change(field, value) {
            vm.change(field, value);
            if (field === 'zipCode')
                cep.lookup(value, fillAddress);
        },
    };
}

export function useDentistFormViewModel() {
    const repository = useRepository('clinic');
    const { id } = useParams();
    const vm = useEntityForm({
        key: `dentist-form:${id ?? 'new'}`, load: () => (id ? repository.dentist(Number(id)) : Promise.resolve(null)), empty: emptyDentistForm, fromEntity: formFromDentist,
        validate: validateDentist, save: form => repository.saveDentist(id ? Number(id) : null, form), masks: { phone: maskPhone },
        done: saved => ({ message: id ? 'Dentista atualizado' : `${saved.name} foi cadastrado(a)`, to: '/clinica/dentistas' }),
        apiField: message => (normalizeText(message).includes('cro') ? 'cro' : null),
    });
    return { ...vm, editing: Boolean(id) };
}

export function useProcedureFormViewModel() {
    const repository = useRepository('clinic');
    const { id } = useParams();
    const vm = useEntityForm({
        key: `procedure-form:${id ?? 'new'}`, load: () => (id ? repository.procedure(Number(id)) : Promise.resolve(null)), empty: emptyProcedureForm, fromEntity: formFromProcedure,
        validate: validateProcedure, save: form => repository.saveProcedure(id ? Number(id) : null, form),
        done: saved => ({ message: id ? 'Procedimento atualizado' : `${saved.name} foi cadastrado`, to: '/clinica/procedimentos' }),
    });
    return { ...vm, editing: Boolean(id) };
}

export function useUserFormViewModel() {
    const repository = useRepository('clinic');
    const dentists = useQuery('user-form-dentists', () => repository.dentists());
    const [showPassword, setShowPassword] = useState(false);
    const vm = useEntityForm({
        key: 'user-form', load: () => Promise.resolve(null), empty: emptyUserForm, fromEntity: emptyUserForm, validate: validateUser,
        save: form => repository.createUser(form),
        done: (_, form) => ({ message: `Acesso de ${form.name.split(' ')[0]} criado. Usuário: ${form.login.trim().toLowerCase()}`, to: '/clinica' }),
        apiField: message => (normalizeText(message).includes('login') ? 'login' : normalizeText(message).includes('dentista') ? 'dentistId' : null),
    });
    return {
        ...vm, showPassword, togglePassword: () => setShowPassword(value => !value),
        dentistOptions: (dentists.data ?? []).map(dentist => ({ value: String(dentist.id), label: dentist.name, detail: dentist.cro, avatar: dentist.name })),
    };
}
