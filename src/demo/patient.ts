import type { PatientInput } from './model';

// Empty additions let the first local snapshots keep their original patient data.
export const emptyPatientInput: PatientInput = {
  name: '', cpf: '', birthDate: '', phone: '', mobile: '', email: '', postalCode: '', street: '', number: '',
  complement: '', district: '', city: '', state: '', observation: '', emergencyContact: '', insurance: '', insuranceNumber: '',
};
export const patientFieldLabels: Record<keyof PatientInput, string> = {
  name: 'Nome completo', cpf: 'CPF', birthDate: 'Data de nascimento', phone: 'Telefone', mobile: 'Celular', email: 'E-mail',
  postalCode: 'CEP', street: 'Logradouro', number: 'Número', complement: 'Complemento', district: 'Bairro', city: 'Cidade', state: 'Estado',
  observation: 'Observações', emergencyContact: 'Contato de emergência', insurance: 'Convênio', insuranceNumber: 'Número da carteirinha do convênio',
};
