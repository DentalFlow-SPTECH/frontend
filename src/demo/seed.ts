import type { DemoData } from './model';
export function createSeed(): DemoData {
  return {
    version: 1,
    patients: [
      { id: 'p1', code: 'PAC-001', name: 'Marina Albuquerque', birthDate: '1991-06-14', phone: '(11) 90000-0101', email: 'marina@example.com', observation: '' },
      { id: 'p2', code: 'PAC-002', name: 'Rafael Nogueira', birthDate: '1985-03-22', phone: '(11) 90000-0102', email: 'rafael@example.com', observation: '' },
      { id: 'p3', code: 'PAC-003', name: 'Beatriz Campos', birthDate: '1998-11-05', phone: '(11) 90000-0103', email: 'beatriz@example.com', observation: '' },
      { id: 'p4', code: 'PAC-004', name: 'André Siqueira', birthDate: '1974-08-09', phone: '(11) 90000-0104', email: 'andre@example.com', observation: '' },
    ],
    doctors: [ { id: 'd1', name: 'Dra. Helena Martins', specialty: 'Clínica geral' }, { id: 'd2', name: 'Dr. Lucas Azevedo', specialty: 'Clínica geral' } ],
    procedures: [ { id: 'pr1', name: 'Avaliação odontológica', referencePriceCents: 12000 }, { id: 'pr2', name: 'Profilaxia', referencePriceCents: 18000 }, { id: 'pr3', name: 'Restauração em resina', referencePriceCents: 22000 }, { id: 'pr4', name: 'Raspagem periodontal', referencePriceCents: 35000 } ],
    budgets: [
      { id: 'b1', code: 'ORC-001', patientId: 'p1', doctorId: 'd1', createdOn: '2026-09-28', validUntil: '', approvedOn: '', statusLabel: 'Aguardando aprovação', local: false, observation: '', paymentNote: '', items: [ { id: 'bi1', procedure: 'Profilaxia', quantity: 1, unitPriceCents: 18000, observation: '' }, { id: 'bi2', procedure: 'Restauração em resina', quantity: 1, unitPriceCents: 22000, observation: '' } ], history: [ { id: 'bh1', date: '2026-09-28', actor: 'Equipe da clínica', description: 'Orçamento criado.' } ] },
      { id: 'b2', code: 'ORC-002', patientId: 'p1', doctorId: 'd2', createdOn: '2026-09-15', validUntil: '', approvedOn: '2026-09-17', statusLabel: 'Aprovado', local: false, observation: '', paymentNote: '', items: [ { id: 'bi3', procedure: 'Raspagem periodontal', quantity: 2, unitPriceCents: 35000, observation: '' } ], history: [ { id: 'bh2', date: '2026-09-15', actor: 'Equipe da clínica', description: 'Orçamento criado.' } ] },
      { id: 'b3', code: 'ORC-003', patientId: 'p2', doctorId: 'd1', createdOn: '2026-09-30', validUntil: '', approvedOn: '', statusLabel: 'Rascunho', local: false, observation: '', paymentNote: '', items: [ { id: 'bi4', procedure: 'Avaliação odontológica', quantity: 1, unitPriceCents: 12000, observation: '' } ], history: [ { id: 'bh3', date: '2026-09-30', actor: 'Equipe da clínica', description: 'Orçamento criado.' } ] },
    ],
    products: [
      { id: 's1', code: 'MAT-001', name: 'Luvas de procedimento — tamanho M', category: 'Proteção', description: '', unit: 'caixa', quantity: 8, minimum: 10, costCents: 3290, supplier: 'Odonto Materiais', lot: 'L01', expiresOn: '2027-06-30' },
      { id: 's2', code: 'MAT-002', name: 'Resina composta — cor A2', category: 'Restauração', description: '', unit: 'unidade', quantity: 7, minimum: 4, costCents: 6890, supplier: 'Odonto Materiais', lot: 'R02', expiresOn: '2027-04-30' },
      { id: 's3', code: 'MAT-003', name: 'Anestésico local', category: 'Anestesia', description: '', unit: 'caixa', quantity: 12, minimum: 5, costCents: 12450, supplier: 'Distribuidora Clínica', lot: 'A03', expiresOn: '2027-08-31' },
      { id: 's4', code: 'MAT-004', name: 'Máscara descartável', category: 'Proteção', description: '', unit: 'caixa', quantity: 3, minimum: 6, costCents: 1850, supplier: 'Odonto Materiais', lot: 'M04', expiresOn: '2028-02-29' },
      { id: 's5', code: 'MAT-005', name: 'Ácido fosfórico 37%', category: 'Restauração', description: '', unit: 'unidade', quantity: 0, minimum: 2, costCents: 1590, supplier: '', lot: '', expiresOn: '' },
    ],
    movements: [
      { id: 'm1', productId: 's1', type: 'Entrada', quantity: 20, date: '2026-09-01', actor: 'Equipe da clínica', reason: 'Recebimento de material', supplier: 'Odonto Materiais', purchaseCents: 65800, lot: 'L01', expiresOn: '2027-06-30', observation: '' },
      { id: 'm2', productId: 's1', type: 'Saída', quantity: 12, date: '2026-09-29', actor: 'Equipe da clínica', reason: 'Consumo interno', supplier: '', purchaseCents: 0, lot: 'L01', expiresOn: '', observation: '' },
      { id: 'm3', productId: 's2', type: 'Entrada', quantity: 10, date: '2026-09-10', actor: 'Equipe da clínica', reason: 'Recebimento de material', supplier: 'Odonto Materiais', purchaseCents: 68900, lot: 'R02', expiresOn: '2027-04-30', observation: '' },
      { id: 'm4', productId: 's2', type: 'Saída', quantity: 3, date: '2026-09-28', actor: 'Equipe da clínica', reason: 'Consumo interno', supplier: '', purchaseCents: 0, lot: 'R02', expiresOn: '', observation: '' },
      { id: 'm5', productId: 's3', type: 'Entrada', quantity: 12, date: '2026-09-12', actor: 'Equipe da clínica', reason: 'Recebimento de material', supplier: 'Distribuidora Clínica', purchaseCents: 149400, lot: 'A03', expiresOn: '2027-08-31', observation: '' },
      { id: 'm6', productId: 's4', type: 'Entrada', quantity: 10, date: '2026-09-05', actor: 'Equipe da clínica', reason: 'Recebimento de material', supplier: 'Odonto Materiais', purchaseCents: 18500, lot: 'M04', expiresOn: '2028-02-29', observation: '' },
      { id: 'm7', productId: 's4', type: 'Saída', quantity: 6, date: '2026-09-26', actor: 'Equipe da clínica', reason: 'Consumo interno', supplier: '', purchaseCents: 0, lot: 'M04', expiresOn: '', observation: '' },
      { id: 'm8', productId: 's4', type: 'Ajuste', quantity: -1, date: '2026-09-27', actor: 'Equipe da clínica', reason: 'Ajuste de inventário', supplier: '', purchaseCents: 0, lot: 'M04', expiresOn: '', observation: '' },
    ],
  };
}

