import { useEffect, useState } from 'react';
import { useDemo } from '../demo/store';
export function useResource(key = '') {
  const { load, scenario } = useDemo();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setBusy(true); setError('');
    load().then(() => { if (!cancelled) setBusy(false); }).catch((reason: Error) => { if (!cancelled) { setBusy(false); setError(reason.message); } });
    return () => { cancelled = true; };
  // The load operation intentionally follows scenario/key changes, not provider render identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scenario, revision]);
  return { busy, error, retry: () => setRevision(value => value + 1) };
}
