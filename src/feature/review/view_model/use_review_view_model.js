import { useId, useState } from 'react';
import { useClinicData } from '../../../app/app_provider.jsx';
export function useReviewControlsViewModel() {
    const { scenario, setScenario, reset, writePending } = useClinicData();
    const id = useId();
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    async function restore(confirmed) {
        if (!confirmed)
            return;
        setNotice('');
        setError('');
        try {
            await reset();
            setNotice('Dados iniciais restaurados.');
        }
        catch (reason) {
            setError(reason.message);
        }
    }
    return { scenario, setScenario, writePending, id, notice, error, restore };
}
