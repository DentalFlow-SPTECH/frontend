// Models for the local demonstration, not API contracts.
export interface PatientInput {
  name: string; cpf: string; birthDate: string; phone: string; mobile: string; email: string;
  postalCode: string; street: string; number: string; complement: string; district: string; city: string; state: string;
  observation: string; emergencyContact: string; insurance: string; insuranceNumber: string;
}
export interface Patient extends PatientInput { id: string; code: string; history: HistoryEntry[] }
export interface DoctorInput { name: string; specialty: string; cpf: string; cro: string; phone: string; email: string; status: string }
export interface Doctor { id: string; name: string; specialty: string; cpf?: string; cro?: string; phone?: string; email?: string; status?: string; history?: HistoryEntry[] }
export interface Procedure { id: string; name: string; referencePriceCents: number }
export interface HistoryEntry { id: string; date: string; actor: string; description: string }
export interface BudgetItem { id: string; procedure: string; quantity: number; unitPriceCents: number; observation: string; tooth?: string; surface?: string }
export interface Budget { id: string; code: string; patientId: string; doctorId: string; createdOn: string; validUntil: string; approvedOn: string; statusLabel: string; local: boolean; observation: string; paymentNote: string; items: BudgetItem[]; history: HistoryEntry[] }
export interface Product { id: string; code: string; name: string; category: string; description: string; unit: string; quantity: number; minimum: number; costCents: number; supplier: string; lot: string; expiresOn: string }
export interface StockMovement { id: string; productId: string; type: 'Entrada' | 'Saída' | 'Ajuste'; quantity: number; date: string; actor: string; reason: string; supplier: string; purchaseCents: number; lot: string; expiresOn: string; observation: string }
export type AppointmentStatus = '' | 'Agendada' | 'Confirmada' | 'Em atendimento' | 'Concluída' | 'Cancelada' | 'Faltou';
export interface AppointmentInput { patientId: string; doctorId: string; procedure: string; date: string; time: string; duration: number; observation: string; attendance: string; budgetId: string; status: AppointmentStatus }
export interface Appointment extends AppointmentInput { id: string; cancelReason: string; history: HistoryEntry[] }
export interface CashInput { type: 'Entrada' | 'Saída'; amountCents: number; date: string; description: string; category: string; paymentMethod: string; responsible: string; observation: string }
export interface CashMovement extends CashInput { id: string; history: HistoryEntry[] }
export type PermissionModule = 'agenda' | 'pacientes' | 'orcamentos' | 'estoque' | 'doutores' | 'caixa' | 'administracao';
export type PermissionOperation = 'visualizar' | 'criar' | 'alterar' | 'excluir';
export type Permission = `${PermissionModule}:${PermissionOperation}`;
export interface UserInput { name: string; email: string; phone: string; login: string; profile: string; permissions: Permission[] }
export interface ClinicUser extends UserInput { id: string; blocked: boolean; history: HistoryEntry[] }
export interface AuditEntry { id: string; date: string; actor: string; action: string; record: string; recordPath?: string }
export interface DemoData { version: 1; patients: Patient[]; doctors: Doctor[]; procedures: Procedure[]; budgets: Budget[]; products: Product[]; movements: StockMovement[]; appointments: Appointment[]; cashMovements: CashMovement[]; users: ClinicUser[]; audit: AuditEntry[] }
export type BudgetInput = Omit<Budget, 'id' | 'code' | 'local' | 'statusLabel' | 'history' | 'approvedOn'>;
export type ProductInput = Omit<Product, 'id' | 'code'>;
export type EntryInput = Omit<StockMovement, 'id' | 'type' | 'actor' | 'reason'>;
export type ExitInput = Pick<StockMovement, 'productId' | 'quantity' | 'date' | 'reason' | 'observation'>;
