import { createHashRouter, Navigate } from 'react-router-dom';
import { AppShell, NotFoundPage, RouteErrorPage } from './app_shell';
import { PatientListPage } from '../feature/patient/patient_page';
import { BudgetEditorPage, BudgetListPage } from '../feature/budget/pages';
import { InventoryListPage, ProductDetailPage, ProductFormPage, StockEntryPage, StockExitPage } from '../feature/inventory/inventory_pages';
import { ReviewPage } from '../feature/review/review_page';
export const router = createHashRouter([{ element: <AppShell />, errorElement: <RouteErrorPage />, children: [
  { index: true, element: <Navigate to="/orcamentos" replace /> },
  { path: 'orcamentos', element: <BudgetListPage /> },
  { path: 'orcamentos/novo', element: <BudgetEditorPage /> },
  { path: 'orcamentos/:id', element: <BudgetEditorPage /> },
  { path: 'estoque', element: <InventoryListPage /> },
  { path: 'estoque/novo', element: <ProductFormPage /> },
  { path: 'estoque/:id', element: <ProductDetailPage /> },
  { path: 'estoque/:id/entrada', element: <StockEntryPage /> },
  { path: 'estoque/:id/saida', element: <StockExitPage /> },
  { path: 'pacientes', element: <PatientListPage /> },
  { path: 'revisao', element: <ReviewPage /> },
  { path: '*', element: <NotFoundPage /> },
] }]);
