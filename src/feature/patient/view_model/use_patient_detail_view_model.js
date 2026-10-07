import { useLocation, useParams } from 'react-router-dom';
import { useClinicRepository } from '../../../app/app_provider.jsx';
import { useResource } from '../../../component/use_resource.js';
export function usePatientDetailViewModel() {
    const { id } = useParams();
    const { search } = useLocation();
    const repository = useClinicRepository('patient');
    const resource = useResource(`patient:${id}`);
    return { patient: repository.find(id), budgets: repository.budgetsFor(id), search, resource };
}
