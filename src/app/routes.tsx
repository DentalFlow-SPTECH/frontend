import { createHashRouter, Navigate, useLocation } from 'react-router-dom';
import { AppShell, NotFoundPage, RouteErrorPage } from './app_shell';
import { PatientDetailPage, PatientFormPage, PatientListPage } from '../feature/patient/patient_page';
import { BudgetEditorPage, BudgetListPage } from '../feature/budget/pages';
import { InventoryListPage, ProductDetailPage, ProductFormPage, StockEntryPage, StockExitPage } from '../feature/inventory/inventory_pages';
import { ReviewPage } from '../feature/review/review_page';
import { AgendaPage, AppointmentDetailPage, AppointmentFormPage } from '../feature/agenda/agenda_pages';
import { CashDetailPage, CashFormPage, CashPage } from '../feature/cash/cash_pages';
import { DoctorDetailPage, DoctorFormPage, DoctorListPage } from '../feature/doctor/doctor_pages';
import { AdminPage, UserDetailPage, UserFormPage } from '../feature/admin/admin_pages';
import { DashboardPage } from '../feature/dashboard/dashboard_page';
import { LoginPage, RegistrationPage } from '../feature/access/access_pages';
function LegacyDashboardRoute() { const { search } = useLocation(); return <Navigate to={`/painel${search}`} replace />; }
export const router = createHashRouter([
  { path: 'login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  { path: 'cadastro', element: <RegistrationPage />, errorElement: <RouteErrorPage /> },
  { element: <AppShell />, errorElement: <RouteErrorPage />, children: [
  { index: true, element: <Navigate to="/painel" replace /> },
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
  { path: 'administracao/:id', element: <UserDetailPage /> },
  { path: 'administracao/:id/editar', element: <UserFormPage /> },
  { path: 'revisao', element: <ReviewPage /> },
  { path: '*', element: <NotFoundPage /> },
] }]);
