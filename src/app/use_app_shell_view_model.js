import { useClinicData } from './app_provider.jsx';
export function useAppShellViewModel() { const { storageNotice, generation } = useClinicData(); return { storageNotice, generation }; }
