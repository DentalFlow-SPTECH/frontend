import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CalendarDays, ChartColumn, ClipboardList, Package, Sun, Users } from 'lucide-react';
import { useAuth, useRepository } from './app_provider.jsx';
import { isDentist, roleLabel } from '../feature/auth/model/auth_model.js';

// Menu por persona (guia, seção 16): a recepção não vê Painel, Mapa do dia nem Estoque.
const navigation = [
    { to: '/hoje', label: 'Hoje', icon: Sun, tab: true },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays, tab: true },
    { to: '/pacientes', label: 'Pacientes', icon: Users, tab: true },
    { to: '/painel', label: 'Painel', icon: ChartColumn, dentist: true, hint: 'Resultado do mês' },
    { to: '/mapa', label: 'Mapa do dia', icon: ClipboardList, dentist: true, hint: 'Atendimentos, valores e fechamento' },
    { to: '/estoque', label: 'Estoque', icon: Package, dentist: true, hint: 'Materiais e equipamentos' },
    { to: '/clinica', label: 'Clínica', icon: Building2, hint: 'Dados, dentistas e procedimentos' },
];

export function useAppShellViewModel() {
    const { user } = useAuth();
    const repository = useRepository('auth');
    const navigate = useNavigate();
    const [moreOpen, setMoreOpen] = useState(false);
    const items = navigation.filter(item => !item.dentist || isDentist(user));
    return {
        user,
        role: roleLabel(user?.accessLevel),
        items,
        tabs: items.filter(item => item.tab),
        more: items.filter(item => !item.tab),
        moreOpen,
        setMoreOpen,
        signOut() {
            setMoreOpen(false);
            repository.signOut();
            navigate('/entrar', { replace: true });
        },
    };
}
