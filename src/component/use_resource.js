import { useEffect, useState } from 'react';
import { useClinicData } from '../app/app_provider.jsx';
export function useResource(key = '') {
    const { load, scenario } = useClinicData();
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let cancelled = false;
        setBusy(true);
        setError('');
        load().then(() => {
            if (!cancelled)
                setBusy(false);
        }).catch((reason) => {
            if (!cancelled) {
                setBusy(false);
                setError(reason.message);
            }
        });
        return () => { cancelled = true; };
    }, [key, scenario, revision, load]);
    return { busy, error, retry: () => setRevision(value => value + 1) };
}
