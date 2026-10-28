import { createHashRouter, Navigate } from 'react-router-dom';
import { AppShell, NotFoundPage, RequireAuth, RequireDentist, RouteErrorPage } from './app_shell.jsx';
import { LoginPage } from '../feature/auth/view/login_view.jsx';
import { TodayPage } from '../feature/agenda/view/today_view.jsx';
import { AgendaPage } from '../feature/agenda/view/agenda_view.jsx';
import { AppointmentFormPage } from '../feature/agenda/view/appointment_form_view.jsx';
import { PatientDetailPage, PatientFormPage, PatientListPage } from '../feature/patient/view/patient_view.jsx';
import { ClinicFormPage, ClinicPage, DentistFormPage, DentistListPage, ProcedureFormPage, ProcedureListPage, UserFormPage } from '../feature/clinic/view/clinic_view.jsx';
import { DashboardPage } from '../feature/dashboard/view/dashboard_view.jsx';
import { EquipmentFormPage, InventoryPage, ProductDetailPage, ProductFormPage } from '../feature/inventory/view/inventory_view.jsx';
import { DailyMapDetailPage, DailyMapFormPage, DailyMapListPage } from '../feature/daily_map/view/daily_map_view.jsx';

const dentist = element => <RequireDentist>{element}</RequireDentist>;

// Rotas em hash, para funcionar em hospedagem estática. Telas de DENTISTA também recebem 403 da API.
export const router = createHashRouter([
    { path: 'entrar', element: <LoginPage/>, errorElement: <RouteErrorPage/> },
    {
        element: <RequireAuth><AppShell/></RequireAuth>, errorElement: <RouteErrorPage/>, children: [
            { index: true, element: <Navigate to="/hoje" replace/> },
            { path: 'hoje', element: <TodayPage/> },
            { path: 'agenda', element: <AgendaPage/> },
            { path: 'agenda/nova', element: <AppointmentFormPage/> },
            { path: 'agenda/:id/editar', element: <AppointmentFormPage/> },
            { path: 'pacientes', element: <PatientListPage/> },
            { path: 'pacientes/novo', element: <PatientFormPage/> },
            { path: 'pacientes/:id', element: <PatientDetailPage/> },
            { path: 'pacientes/:id/editar', element: <PatientFormPage/> },
            { path: 'clinica', element: <ClinicPage/> },
            { path: 'clinica/editar', element: dentist(<ClinicFormPage/>) },
            { path: 'clinica/dentistas', element: <DentistListPage/> },
            { path: 'clinica/dentistas/novo', element: dentist(<DentistFormPage/>) },
            { path: 'clinica/dentistas/:id/editar', element: dentist(<DentistFormPage/>) },
            { path: 'clinica/procedimentos', element: <ProcedureListPage/> },
            { path: 'clinica/procedimentos/novo', element: dentist(<ProcedureFormPage/>) },
            { path: 'clinica/procedimentos/:id/editar', element: dentist(<ProcedureFormPage/>) },
            { path: 'clinica/usuarios/novo', element: dentist(<UserFormPage/>) },
            { path: 'painel', element: dentist(<DashboardPage/>) },
            { path: 'mapa', element: dentist(<DailyMapListPage/>) },
            { path: 'mapa/novo', element: dentist(<DailyMapFormPage/>) },
            { path: 'mapa/:id', element: dentist(<DailyMapDetailPage/>) },
            { path: 'mapa/:id/editar', element: dentist(<DailyMapFormPage/>) },
            { path: 'estoque', element: dentist(<InventoryPage/>) },
            { path: 'estoque/materiais/novo', element: dentist(<ProductFormPage/>) },
            { path: 'estoque/materiais/:id', element: dentist(<ProductDetailPage/>) },
            { path: 'estoque/materiais/:id/editar', element: dentist(<ProductFormPage/>) },
            { path: 'estoque/equipamentos/novo', element: dentist(<EquipmentFormPage/>) },
            { path: 'estoque/equipamentos/:id/editar', element: dentist(<EquipmentFormPage/>) },
            { path: '*', element: <NotFoundPage/> },
        ],
    },
]);
