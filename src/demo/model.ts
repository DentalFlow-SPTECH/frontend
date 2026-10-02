// Models for the local demonstration, not API contracts.
export interface Patient { id: string; code: string; name: string; birthDate: string; phone: string; email: string; observation: string }
export interface Doctor { id: string; name: string; specialty: string }
export interface Procedure { id: string; name: string; referencePriceCents: number }
export interface HistoryEntry { id: string; date: string; actor: string; description: string }
export interface BudgetItem { id: string; procedure: string; quantity: number; unitPriceCents: number; observation: string }
export interface Budget { id: string; code: string; patientId: string; doctorId: string; createdOn: string; validUntil: string; approvedOn: string; statusLabel: string; local: boolean; observation: string; paymentNote: string; items: BudgetItem[]; history: HistoryEntry[] }
export interface Product { id: string; code: string; name: string; category: string; description: string; unit: string; quantity: number; minimum: number; costCents: number; supplier: string; lot: string; expiresOn: string }
export interface StockMovement { id: string; productId: string; type: 'Entrada' | 'Saída' | 'Ajuste'; quantity: number; date: string; actor: string; reason: string; supplier: string; purchaseCents: number; lot: string; expiresOn: string; observation: string }
export interface DemoData { version: 1; patients: Patient[]; doctors: Doctor[]; procedures: Procedure[]; budgets: Budget[]; products: Product[]; movements: StockMovement[] }
export type BudgetInput = Omit<Budget, 'id' | 'code' | 'local' | 'statusLabel' | 'history' | 'approvedOn'>;
export type ProductInput = Omit<Product, 'id' | 'code'>;
export type EntryInput = Omit<StockMovement, 'id' | 'type' | 'actor' | 'reason'>;
export type ExitInput = Pick<StockMovement, 'productId' | 'quantity' | 'date' | 'reason' | 'observation'>;
