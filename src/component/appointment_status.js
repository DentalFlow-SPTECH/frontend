// Situações do enum AppointmentStatus da API, com rótulos para a interface.
export const appointmentStatus = {
    AGENDADO: { label: 'Agendado', key: 'agendado', action: 'Confirmar', done: 'Consulta confirmada' },
    CONFIRMADO: { label: 'Confirmado', key: 'confirmado', action: 'Iniciar atendimento', done: 'Atendimento iniciado' },
    EM_ATENDIMENTO: { label: 'Em atendimento', key: 'atendimento', action: 'Concluir atendimento', done: 'Atendimento concluído' },
    CONCLUIDO: { label: 'Concluído', key: 'concluido' },
    CANCELADO: { label: 'Cancelado', key: 'cancelado' },
    FALTOU: { label: 'Faltou', key: 'faltou' },
};
export const statusOrder = ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'CONCLUIDO'];
export const statusLabel = status => appointmentStatus[status]?.label ?? status;
