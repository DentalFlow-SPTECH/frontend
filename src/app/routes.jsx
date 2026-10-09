import { createHashRouter, Navigate, useLocation } from 'react-router-dom';
import { AppShell, NotFoundPage, RouteErrorPage } from './app_shell.jsx';
import { PatientDetailPage, PatientFormPage, PatientListPage } from '../feature/patient/view/patient_view.jsx';
import { BudgetEditorPage, BudgetListPage } from '../feature/budget/view/budget_view.jsx';
import { InventoryListPage, ProductDetailPage, ProductFormPage, StockEntryPage, StockExitPage } from '../feature/inventory/view/inventory_view.jsx';
import { ReviewPage } from '../feature/review/view/review_view.jsx';
import { AgendaPage, AppointmentDetailPage, AppointmentFormPage, FinalizationPage } from '../feature/agenda/view/agenda_view.jsx';
import { CashDetailPage, CashFormPage, CashPage } from '../feature/cash/view/cash_view.jsx';
import { DoctorDetailPage, DoctorFormPage, DoctorListPage } from '../feature/doctor/view/doctor_view.jsx';
import { AdminPage, ClinicFormPage, ClinicLinkPage, UserDetailPage, UserFormPage } from '../feature/admin/view/admin_view.jsx';
import { DashboardPage } from '../feature/dashboard/view/dashboard_view.jsx';
import { LoginPage, RegistrationPage } from '../feature/access/view/access_view.jsx';
import { DailyReportPage, MonthlyReportPage, ReportReviewPage } from '../feature/report/view/report_view.jsx';
function LegacyDashboardRoute() { const { search } = useLocation(); return <Navigate to={`/painel${search}`} replace/>; }
function ReportIndexRoute() { const { search } = useLocation(); return <Navigate to={`/relatorios/diario${search}`} replace/>; }
export const router = createHashRouter([
    { path: 'login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
    { path: 'cadastro', element: <RegistrationPage />, errorElement: <RouteErrorPage /> },
    { element: <AppShell />, errorElement: <RouteErrorPage />, children: [
            { index: true, element: <Navigate to="/painel" replace/> },
            { path: 'painel', element: <DashboardPage /> },
            { path: 'dashboard', element: <LegacyDashboardRoute /> },
            { path: 'orcamentos', element: <BudgetListPage /> },
            { path: 'orcamentos/novo', element: <BudgetEditorPage /> },
            { path: 'orcamentos/:id', element: <BudgetEditorPage /> },
            { path: 'estoque', element: <InventoryListPage /> },
            { path: 'estoque/novo', element: <ProductFormPage /> },
            { path: 'estoque/:id', element: <ProductDetailPage /> },
            { path: 'estoque/:id/entrada', element: <StockEntryPage /> },
            { path: 'estoque/:id/saida', element: <StockExitPage /> },
            { path: 'pacientes', element: <PatientListPage /> },
            { path: 'pacientes/novo', element: <PatientFormPage /> },
            { path: 'pacientes/:id', element: <PatientDetailPage /> },
            { path: 'pacientes/:id/editar', element: <PatientFormPage /> },
            { path: 'agenda', element: <AgendaPage /> },
            { path: 'agenda/nova', element: <AppointmentFormPage /> },
            { path: 'agenda/:id', element: <AppointmentDetailPage /> },
            { path: 'agenda/:id/editar', element: <AppointmentFormPage /> },
            { path: 'agenda/:id/finalizar', element: <FinalizationPage /> },
            { path: 'doutores', element: <DoctorListPage /> },
            { path: 'doutores/novo', element: <DoctorFormPage /> },
            { path: 'doutores/:id', element: <DoctorDetailPage /> },
            { path: 'doutores/:id/editar', element: <DoctorFormPage /> },
            { path: 'caixa', element: <CashPage /> },
            { path: 'caixa/entrada', element: <CashFormPage /> },
            { path: 'caixa/saida', element: <CashFormPage /> },
            { path: 'caixa/:id', element: <CashDetailPage /> },
            { path: 'administracao', element: <AdminPage /> },
            { path: 'administracao/novo', element: <UserFormPage /> },
            { path: 'administracao/vinculos', element: <ClinicLinkPage /> },
            { path: 'administracao/clinicas/nova', element: <ClinicFormPage /> },
            { path: 'administracao/clinicas/:id/editar', element: <ClinicFormPage /> },
            { path: 'administracao/:id', element: <UserDetailPage /> },
            { path: 'administracao/:id/editar', element: <UserFormPage /> },
            { path: 'relatorios', element: <ReportIndexRoute /> },
            { path: 'relatorios/diario', element: <DailyReportPage /> },
            { path: 'relatorios/conferencia', element: <ReportReviewPage /> },
            { path: 'relatorios/mensal', element: <MonthlyReportPage /> },
            { path: 'revisao', element: <ReviewPage /> },
            { path: '*', element: <NotFoundPage /> },
        ] }
]);
