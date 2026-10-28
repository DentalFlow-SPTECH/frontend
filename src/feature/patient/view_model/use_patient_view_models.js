import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useRepository } from '../../../app/app_provider.jsx';
import { useQuery } from '../../../component/use_query.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { useToast } from '../../../component/ui/index.js';
import { firstName, maskCep, maskCpf, maskPhone } from '../../../component/format.js';
import { emptyPatientForm, fieldFromApiMessage, formFromPatient, groupByLetter, searchPatients, validatePatient } from '../model/patient_model.js';

const pageSize = 40;

export function usePatientListViewModel() {
    const repository = useRepository('patient');
    const [params, setParams] = useSearchParams();
    const term = params.get('busca') ?? '';
    const [limit, setLimit] = useState(pageSize);
    const query = useQuery('patients', () => repository.list());
    const results = searchPatients(query.data ?? [], term);
    return {
        loading: query.firstLoad, error: query.error, reload: query.reload,
        total: query.data?.length ?? 0, term, count: results.length,
        groups: groupByLetter(results.slice(0, limit)),
        hasMore: results.length > limit,
        showMore: () => setLimit(value => value + pageSize),
        setTerm(value) {
            setLimit(pageSize);
            setParams(value ? { busca: value } : {}, { replace: true });
        },
    };
}

export function usePatientDetailViewModel() {
    const repository = useRepository('patient');
    const { id } = useParams();
    const query = useQuery(`patient:${id}`, () => repository.get(Number(id)));
    return { id, patient: query.data, loading: query.firstLoad, error: query.error, reload: query.reload };
}

const masks = { cpf: maskCpf, phone: maskPhone, zipCode: maskCep };

export function usePatientFormViewModel() {
    const repository = useRepository('patient');
    const toast = useToast();
    const navigate = useNavigate();
    const { id } = useParams();
    const [params] = useSearchParams();
    const editing = Boolean(id);
    const query = useQuery(`patient-form:${id ?? 'new'}`, () => (editing ? repository.get(Number(id)) : Promise.resolve(null)));
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});
    const [failure, setFailure] = useState('');
    const [busy, setBusy] = useState(false);
    const [dirty, setDirty] = useState(false);
    useUnsaved(dirty && !busy);
    const current = form ?? (editing ? (query.data ? formFromPatient(query.data) : null) : emptyPatientForm());

    function change(field, value) {
        setForm({ ...current, [field]: masks[field] ? masks[field](value) : value });
        setErrors(found => ({ ...found, [field]: undefined }));
        setDirty(true);
        setFailure('');
    }

    async function submit() {
        const found = validatePatient(current);
        setErrors(found);
        if (Object.keys(found).length)
            return;
        setBusy(true);
        setFailure('');
        try {
            const saved = editing ? await repository.update(Number(id), current) : await repository.create(current);
            setDirty(false);
            toast({ title: editing ? 'Cadastro atualizado' : `${firstName(saved.name)} foi cadastrado(a)` });
            navigate(!editing && params.get('agendar') ? `/agenda/nova?paciente=${saved.id}` : `/pacientes/${saved.id}`, { replace: true });
        }
        catch (error) {
            const field = error.status === 422 ? fieldFromApiMessage(error.message) : null;
            if (field)
                setErrors(found => ({ ...found, [field]: error.message }));
            else
                setFailure(error.message);
        }
        finally {
            setBusy(false);
        }
    }

    return {
        editing, loading: editing && query.firstLoad, error: query.error, reload: query.reload,
        form: current, errors, failure, busy, change, submit,
        backLink: editing ? `/pacientes/${id}` : params.get('agendar') ? '/agenda/nova' : '/pacientes',
    };
}
