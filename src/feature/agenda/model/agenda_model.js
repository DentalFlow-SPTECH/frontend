import { dateLabel } from '../../../demo/format.js';
import { appointmentInterval, appointmentStatuses, attendanceOptions, isTooth, lockedReport } from '../../../demo/clinic.js';
const uid = () => crypto.randomUUID();
export function saveAppointmentModel(current, input, id) {
    const existing = id ? current.appointments.find(value => value.id === id) : undefined;
    if (id && !existing)
        throw new Error('Esta consulta não está disponível. Seu preenchimento foi mantido.');
    if (existing?.completion)
        throw new Error('Esta consulta foi finalizada. Use a correção da finalização para alterar o que foi realizado.');
    // Novos vínculos usam o ID do catálogo. Registros anteriores continuam válidos pelo nome que já guardavam.
    const procedure = input.procedureId ? current.procedures.find(value => value.id === input.procedureId) : current.procedures.find(value => value.name === input.procedure);
    const keepsProcedure = Boolean(existing) && !input.procedureId && input.procedure === existing.procedure;
    if (!current.patients.some(value => value.id === input.patientId) || !current.doctors.some(value => value.id === input.doctorId) || (!procedure && !keepsProcedure))
        throw new Error('Revise o paciente, o doutor e o procedimento selecionados.');
    // A clínica é exigida nos novos agendamentos quando há clínicas cadastradas; consultas antigas podem seguir sem vínculo.
    if (input.clinicId ? !current.clinics.some(value => value.id === input.clinicId) : current.clinics.length > 0 && (!existing || Boolean(existing.clinicId)))
        throw new Error('Selecione a clínica do atendimento.');
    if (existing && (input.patientId !== existing.patientId || input.duration !== existing.duration))
        throw new Error('O paciente e a duração desta consulta devem ser preservados na edição.');
    const interval = appointmentInterval(input);
    if (!interval)
        throw new Error('Informe data, horário e duração válidos.');
    if (!appointmentStatuses.includes(input.status))
        throw new Error('Selecione a situação da consulta.');
    if (input.status === 'Concluída' && existing?.status !== 'Concluída')
        throw new Error('Use Finalizar consulta para concluir e registrar os procedimentos realizados.');
    if (input.budgetId && !current.budgets.some(value => value.id === input.budgetId && value.patientId === input.patientId))
        throw new Error('Selecione um orçamento deste paciente ou deixe o vínculo vazio.');
    // O mesmo doutor não atende em dois lugares: a comparação vale entre clínicas.
    const conflict = input.status !== 'Cancelada' && current.appointments.find(value => {
        if (value.id === id || value.doctorId !== input.doctorId || value.status === 'Cancelada')
            return false;
        const other = appointmentInterval(value);
        return other && interval.start < other.end && other.start < interval.end;
    });
    if (conflict)
        throw new Error('Este doutor já tem uma consulta nesse intervalo. Revise o horário ou o doutor.');
    const description = existing ? existing.status !== input.status ? `Consulta atualizada. Situação: ${existing.status} → ${input.status}.` : 'Consulta atualizada.' : 'Consulta agendada.';
    const appointment = { ...input, clinicId: input.clinicId ?? '', procedureId: procedure?.id ?? '', procedure: procedure?.name ?? existing.procedure, insurance: input.attendance === 'Convênio' ? (input.insurance ?? '').trim() : '', id: existing?.id ?? uid(), cancelReason: input.status === 'Cancelada' ? existing?.cancelReason ?? '' : '', history: [...(existing?.history ?? []), { id: uid(), date: new Date().toISOString(), actor: 'Você', description }] };
    const change = { data: { ...current, appointments: existing ? current.appointments.map(value => value.id === appointment.id ? appointment : value) : [...current.appointments, appointment] }, action: existing ? 'Consulta atualizada' : 'Consulta agendada', record: `${current.patients.find(value => value.id === appointment.patientId).name} · ${appointment.date} ${appointment.time}`, recordPath: `/agenda/${appointment.id}` };
    return { ...change, value: appointment };
}
export function cancelAppointmentModel(current, id, reason) {
    const existing = current.appointments.find(value => value.id === id);
    if (!existing)
        throw new Error('Esta consulta não está disponível.');
    if (existing.status === 'Cancelada')
        return { value: existing };
    if (existing.completion)
        throw new Error('Esta consulta foi finalizada e tem procedimentos realizados registrados. Ela não pode ser cancelada.');
    const appointment = { ...existing, status: 'Cancelada', cancelReason: reason.trim(), history: [...existing.history, { id: uid(), date: new Date().toISOString(), actor: 'Você', description: reason.trim() ? `Consulta cancelada. Motivo: ${reason.trim()}` : 'Consulta cancelada.' }] };
    const change = { data: { ...current, appointments: current.appointments.map(value => value.id === id ? appointment : value) }, action: 'Consulta cancelada', record: `${current.patients.find(value => value.id === appointment.patientId)?.name ?? 'Consulta'} · ${appointment.date} ${appointment.time}`, recordPath: `/agenda/${appointment.id}` };
    return { ...change, value: appointment };
}
// Finalizar registra o que foi efetivamente realizado. Não gera recebimento nem lançamento no Caixa.
export function finalizeAppointmentModel(current, id, input, correction = false) {
    const existing = current.appointments.find(value => value.id === id);
    if (!existing)
        throw new Error('Esta consulta não está disponível. Seu preenchimento foi mantido.');
    // Um segundo envio da mesma finalização devolve o registro existente, sem repetir procedimentos.
    if (existing.completion && !correction)
        return { value: existing };
    if (!existing.completion && correction)
        throw new Error('Esta consulta ainda não foi finalizada.');
    if (existing.status === 'Cancelada' || existing.status === 'Faltou')
        throw new Error('Consultas canceladas ou com falta não recebem procedimentos realizados.');
    if (correction && lockedReport(current.dailyReports, id))
        throw new Error('O relatório diário desta consulta já foi enviado. Peça a devolução para correção antes de alterar os procedimentos.');
    if (!input.items.length)
        throw new Error('Inclua ao menos um procedimento realizado.');
    if (input.attendance && !attendanceOptions.includes(input.attendance))
        throw new Error('Escolha Particular ou Convênio, ou deixe a forma de atendimento sem escolha.');
    const previous = existing.completion?.items ?? [];
    const now = new Date().toISOString();
    const items = input.items.map(item => {
        const kept = previous.find(value => value.id === item.id);
        const procedure = current.procedures.find(value => value.id === item.procedureId);
        if (!procedure && !(kept && kept.procedureId === item.procedureId))
            throw new Error('Revise os procedimentos realizados: escolha itens do catálogo.');
        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0)
            throw new Error('Informe uma quantidade inteira maior que zero em cada procedimento.');
        if (item.tooth && !isTooth(item.tooth))
            throw new Error('Revise a identificação dos dentes. Seu preenchimento foi mantido.');
        if (kept?.claim && kept.procedureId !== item.procedureId)
            throw new Error('Um item com conferência de convênio registrada não pode trocar de procedimento.');
        // Nome e valor de referência são copiados na execução: mudanças futuras do catálogo não alteram o histórico.
        const copy = kept && kept.procedureId === item.procedureId ? { procedure: kept.procedure, referencePriceCents: kept.referencePriceCents } : { procedure: procedure.name, referencePriceCents: procedure.referencePriceCents };
        return { ...kept, id: kept?.id ?? uid(), procedureId: item.procedureId, ...copy, quantity: item.quantity, tooth: item.tooth ?? '', region: (item.region ?? '').trim(), origin: item.origin || 'No atendimento', history: kept?.history ?? [{ id: uid(), date: now, actor: 'Você', description: 'Procedimento realizado registrado na finalização da consulta.' }] };
    });
    if (previous.some(value => value.claim && !items.some(item => item.id === value.id)))
        throw new Error('Um item com conferência de convênio registrada não pode ser removido.');
    const summary = items.map(item => `${item.procedure} (${item.quantity})`).join(', ');
    const completion = { finalizedAt: existing.completion?.finalizedAt ?? now, attendance: input.attendance ?? '', insurance: input.attendance === 'Convênio' ? (input.insurance ?? '').trim() : '', observation: (input.observation ?? '').trim(), pendingGuide: input.attendance === 'Convênio' && Boolean(input.pendingGuide), items };
    const description = correction ? `Finalização corrigida. Procedimentos realizados: ${summary}.` : `Consulta finalizada. Situação: ${existing.status} → Concluída. Procedimentos realizados: ${summary}.`;
    const appointment = { ...existing, status: 'Concluída', completion, history: [...existing.history, { id: uid(), date: now, actor: 'Você', description }] };
    const change = { data: { ...current, appointments: current.appointments.map(value => value.id === id ? appointment : value) }, action: correction ? 'Finalização corrigida' : 'Consulta finalizada', record: `${current.patients.find(value => value.id === appointment.patientId)?.name ?? 'Consulta'} · ${appointment.date} ${appointment.time}`, recordPath: `/agenda/${appointment.id}` };
    return { ...change, value: appointment };
}
export const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const emptyAppointment = { patientId: '', doctorId: '', clinicId: '', procedureId: '', procedure: '', date: '', time: '', duration: 0, observation: '', attendance: '', insurance: '', budgetId: '', status: 'Agendada' };
export const emptyCompletion = { attendance: '', insurance: '', observation: '', pendingGuide: false };
export function parseDate(value) { return new Date(`${value}T12:00:00`); }
export function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDate(value).getTime()) && dateKey(parseDate(value)) === value; }
export function shiftDate(value, days) { const date = parseDate(value); date.setDate(date.getDate() + days); return dateKey(date); }
export function weekDates(value) { const day = parseDate(value).getDay(); const start = shiftDate(value, -(day === 0 ? 6 : day - 1)); return Array.from({ length: 7 }, (_, index) => shiftDate(start, index)); }
export function shiftMonth(value, months) { const date = parseDate(value); const day = date.getDate(); date.setDate(1); date.setMonth(date.getMonth() + months); const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); date.setDate(Math.min(day, last)); return dateKey(date); }
export function monthDates(value) { const date = parseDate(value); const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); return Array.from({ length: count }, (_, index) => `${value.slice(0, 7)}-${String(index + 1).padStart(2, '0')}`); }
export function endTime(appointment) {
    const interval = appointmentInterval(appointment);
    if (!interval)
        return 'término não informado';
    const end = new Date(interval.end).toISOString();
    return end.slice(0, 10) === appointment.date ? end.slice(11, 16) : `${dateLabel(end.slice(0, 10))} às ${end.slice(11, 16)}`;
}
export function minuteLabel(minutes) { return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
// Texto livre gravado antes das opções marcáveis: é exibido como estava, sem conversão automática.
export function legacyAttendance(value) { return value && !attendanceOptions.includes(value) ? value : ''; }
export function attendanceLabel(attendance, insurance) { return attendance === 'Convênio' && insurance ? `Convênio · ${insurance}` : attendance || 'Não informada'; }
