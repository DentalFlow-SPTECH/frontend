import { useState } from 'react';
import { useRepository } from '../../../app/app_provider.jsx';
import { useToast } from '../../../component/ui/index.js';
import { firstName } from '../../../component/format.js';
import { nextStatus } from '../model/agenda_model.js';

const doneMessage = {
    CONFIRMADO: name => `Consulta de ${name} confirmada`,
    EM_ATENDIMENTO: name => `Atendimento de ${name} iniciado`,
    CONCLUIDO: name => `Atendimento de ${name} concluído`,
    CANCELADO: name => `Consulta de ${name} cancelada`,
    FALTOU: name => `Falta de ${name} registrada`,
    AGENDADO: () => 'Situação restaurada',
};

// Mudança de situação (PATCH /appointment/{id}/status). Cancelado e Faltou não reabrem (regra da API),
// por isso pedem confirmação e não oferecem "Desfazer".
export function useAppointmentActions(onChanged) {
    const repository = useRepository('agenda');
    const toast = useToast();
    const [busy, setBusy] = useState('');
    const [confirm, setConfirm] = useState(null);

    async function change(item, status, { offerUndo = true } = {}) {
        setBusy(status);
        try {
            const updated = await repository.setStatus(item.id, status);
            onChanged?.(updated);
            const reversible = offerUndo && !['CANCELADO', 'FALTOU'].includes(status);
            toast({
                title: (doneMessage[status] ?? doneMessage.AGENDADO)(firstName(item.patientName)),
                action: reversible ? { label: 'Desfazer', onClick: () => change(updated, item.status, { offerUndo: false }) } : undefined,
            });
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Não foi possível mudar a situação', description: error.message });
        }
        finally {
            setBusy('');
            setConfirm(null);
        }
    }

    return {
        busy,
        confirm,
        askConfirm: setConfirm,
        closeConfirm: () => setConfirm(null),
        change,
        advance: item => change(item, nextStatus(item.status)),
    };
}
