import { useSearchParams } from 'react-router-dom';
import { useClinicRepository } from '../../../app/app_provider.jsx';
import { useResource } from '../../../component/use_resource.js';
export function usePatientListViewModel() {
    const repository = useClinicRepository('patient');
    const [params, setParams] = useSearchParams();
    const contextPatient = repository.find(params.get('paciente'));
    const query = params.get('q') ?? contextPatient?.name ?? '';
    const search = params.size ? `?${params}` : '';
    const resource = useResource('patients');
    return {
        contextPatient, query, search, resource, patients: repository.search(query),
        changeQuery: value => setParams(value ? { q: value } : {}, { replace: true }),
        clearQuery: () => setParams({}),
    };
}
