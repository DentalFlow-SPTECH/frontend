// Relatórios leem os procedimentos realizados registrados na finalização. Nada aqui gera cobrança, recebimento ou repasse.
import { dateLabel, money } from '../../../demo/format.js';
import { canFinalize, isDate, matchesClinic, performedItems } from '../../../demo/clinic.js';
const uid = () => crypto.randomUUID();
export const reportStatuses = ['Não iniciado', 'Rascunho', 'Enviado', 'Em correção', 'Validado'];
export const claimResults = ['Aguardando', 'Sem glosa', 'Glosa parcial', 'Glosa total'];
export const claimStatuses = ['A conferir', ...claimResults];
const sameKey = (value, key) => value.date === key.date && value.doctorId === key.doctorId && (value.clinicId || '') === (key.clinicId || '');
const sent = report => report?.status === 'Enviado' || report?.status === 'Validado';
export function findReport(reports, key) { return reports.find(report => sameKey(report, key)); }
export function finalizedFor(appointments, key) { return appointments.filter(value => value.completion && sameKey(value, key)).sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id)); }
// Depois do envio o relatório mostra as consultas incluídas naquele envio; antes disso acompanha as finalizações do dia.
export function reportAppointments(appointments, report, key) {
    return sent(report) ? report.appointmentIds.map(id => appointments.find(value => value.id === id)).filter(Boolean) : finalizedFor(appointments, key);
}
export function daySummary(appointments, key) {
    const day = appointments.filter(value => sameKey(value, key));
    return { scheduled: day.length, finalized: day.filter(value => value.completion).length, missed: day.filter(value => value.status === 'Faltou').length, cancelled: day.filter(value => value.status === 'Cancelada').length, unfinished: day.filter(canFinalize).length };
}
// Um relatório por data, doutor e clínica, para cada combinação com consulta finalizada ou relatório já iniciado.
export function reportSlots(data, { from, until, clinicId = '', doctorId = '' }) {
    const keys = new Map();
    const add = value => keys.set(`${value.date}|${value.doctorId}|${value.clinicId || ''}`, { date: value.date, doctorId: value.doctorId, clinicId: value.clinicId || '' });
    data.appointments.filter(value => value.completion).forEach(add);
    data.dailyReports.forEach(add);
    return [...keys.values()].filter(key => key.date >= from && key.date <= until && matchesClinic(key, clinicId) && (!doctorId || key.doctorId === doctorId)).map(key => {
        const report = findReport(data.dailyReports, key);
        const appointments = reportAppointments(data.appointments, report, key);
        return { key, id: `${key.date}|${key.doctorId}|${key.clinicId}`, report, status: report?.status ?? 'Não iniciado', appointments, items: performedItems(appointments).length };
    }).sort((a, b) => b.key.date.localeCompare(a.key.date) || a.key.doctorId.localeCompare(b.key.doctorId) || a.key.clinicId.localeCompare(b.key.clinicId));
}
export function saveDailyReportModel(current, key, note, send = false) {
    const doctor = current.doctors.find(value => value.id === key.doctorId);
    if (!isDate(key.date) || !doctor || (key.clinicId && !current.clinics.some(value => value.id === key.clinicId)))
        throw new Error('Revise a data, o doutor e a clínica do relatório.');
    const existing = findReport(current.dailyReports, key);
    if (existing?.status === 'Validado')
        throw new Error('Este relatório foi validado e não pode ser alterado.');
    // Reenviar um relatório já enviado devolve o mesmo registro, sem novo histórico.
    if (existing?.status === 'Enviado') {
        if (send)
            return { value: existing };
        throw new Error('Este relatório já foi enviado. Ele só muda se for devolvido para correção.');
    }
    const appointments = finalizedFor(current.appointments, key);
    if (send && !appointments.length)
        throw new Error('Não há consultas finalizadas para enviar neste relatório.');
    const text = note.trim();
    if (!send && existing && existing.note === text)
        return { value: existing };
    const now = new Date().toISOString();
    const items = performedItems(appointments).length;
    const description = send ? `Relatório enviado com ${appointments.length} ${appointments.length === 1 ? 'consulta' : 'consultas'} e ${items} ${items === 1 ? 'procedimento' : 'procedimentos'}.` : existing ? 'Rascunho atualizado.' : 'Rascunho criado.';
    const report = { ...existing, id: existing?.id ?? uid(), date: key.date, doctorId: key.doctorId, clinicId: key.clinicId || '', status: send ? 'Enviado' : existing?.status ?? 'Rascunho', note: text, appointmentIds: send ? appointments.map(value => value.id) : [], reason: send ? '' : existing?.reason ?? '', sentAt: send ? now : existing?.sentAt ?? '', validatedAt: '', history: [...(existing?.history ?? []), { id: uid(), date: now, actor: 'Você', description }] };
    const change = { data: { ...current, dailyReports: existing ? current.dailyReports.map(value => value.id === report.id ? report : value) : [...current.dailyReports, report] }, action: send ? 'Relatório diário enviado' : 'Relatório diário salvo', record: `${doctor.name} · ${dateLabel(key.date)}`, recordPath: `/relatorios/diario?data=${key.date}&doutor=${key.doctorId}${key.clinicId ? `&clinica=${key.clinicId}` : ''}` };
    return { ...change, value: report };
}
// A conferência valida ou devolve um relatório enviado. O estado do relatório é independente do estado da consulta.
export function reviewDailyReportModel(current, id, decision, reason = '') {
    const existing = current.dailyReports.find(value => value.id === id);
    if (!existing)
        throw new Error('Este relatório não está disponível.');
    if (existing.status === 'Validado' && decision === 'validar')
        return { value: existing };
    if (existing.status !== 'Enviado')
        throw new Error('Somente relatórios enviados podem ser validados ou devolvidos.');
    if (decision !== 'validar' && !reason.trim())
        throw new Error('Informe o motivo da correção para devolver o relatório.');
    const now = new Date().toISOString();
    const validated = decision === 'validar';
    // A devolução libera a correção das finalizações; o próximo envio fixa novamente as consultas incluídas.
    const report = { ...existing, status: validated ? 'Validado' : 'Em correção', validatedAt: validated ? now : '', reason: validated ? '' : reason.trim(), appointmentIds: validated ? existing.appointmentIds : [], history: [...existing.history, { id: uid(), date: now, actor: 'Você', description: validated ? 'Relatório validado.' : `Relatório devolvido para correção. Motivo: ${reason.trim()}` }] };
    const change = { data: { ...current, dailyReports: current.dailyReports.map(value => value.id === id ? report : value) }, action: validated ? 'Relatório diário validado' : 'Relatório diário devolvido para correção', record: `${current.doctors.find(value => value.id === report.doctorId)?.name ?? 'Doutor'} · ${dateLabel(report.date)}`, recordPath: `/relatorios/conferencia?data=${report.date}` };
    return { ...change, value: report };
}
export function attendanceOf(item) { return item.appointment.completion?.attendance ?? ''; }
// Situação de conferência do item. Convênio sem registro fica "A conferir"; o estado clínico da consulta não entra aqui.
export function claimStatus(item) {
    const attendance = attendanceOf(item);
    if (attendance !== 'Convênio')
        return attendance === 'Particular' ? 'Particular' : 'Forma não informada';
    return item.claim ? item.claim.result : 'A conferir';
}
export function saveClaimModel(current, appointmentId, itemId, input) {
    const appointment = current.appointments.find(value => value.id === appointmentId);
    const item = appointment?.completion?.items.find(value => value.id === itemId);
    if (!item)
        throw new Error('Este procedimento realizado não está disponível.');
    if (appointment.completion.attendance !== 'Convênio')
        throw new Error('A conferência de convênio vale apenas para procedimentos realizados por convênio.');
    if (!claimResults.includes(input.result))
        throw new Error('Escolha o resultado do retorno.');
    // Valor apresentado desconhecido permanece nulo: nunca é tratado como zero.
    const presentedCents = input.presentedCents ?? null;
    if (presentedCents !== null && (!Number.isSafeInteger(presentedCents) || presentedCents <= 0))
        throw new Error('Informe um valor apresentado maior que zero ou deixe o campo vazio.');
    const waiting = input.result === 'Aguardando';
    if (!waiting && presentedCents === null)
        throw new Error('Informe o valor apresentado antes de registrar o retorno do convênio.');
    if (!waiting && !isDate(input.returnOn ?? ''))
        throw new Error('Informe a data do retorno do convênio.');
    let glosaCents = null;
    if (input.result === 'Sem glosa')
        glosaCents = 0;
    if (input.result === 'Glosa total')
        glosaCents = presentedCents;
    if (input.result === 'Glosa parcial') {
        glosaCents = input.glosaCents ?? null;
        if (!Number.isSafeInteger(glosaCents) || glosaCents <= 0 || glosaCents >= presentedCents)
            throw new Error('Na glosa parcial, o valor glosado deve ser maior que zero e menor que o valor apresentado.');
    }
    const claim = { guide: (input.guide ?? '').trim(), presentedCents, returnOn: waiting ? '' : input.returnOn, result: input.result, glosaCents, reason: glosaCents > 0 ? (input.reason ?? '').trim() : '' };
    const previous = item.claim;
    if (previous && Object.keys(claim).every(key => previous[key] === claim[key]))
        return { value: item };
    const now = new Date().toISOString();
    const outcome = waiting ? 'aguardando retorno' : `retorno em ${dateLabel(claim.returnOn)}: ${claim.result.toLowerCase()}${glosaCents > 0 ? ` de ${money(glosaCents)}` : ''}`;
    // O histórico guarda cada estado informado; o valor apresentado original não é sobrescrito pela glosa.
    const description = `Conferência registrada: guia ${claim.guide || 'não informada'}; valor apresentado ${presentedCents === null ? 'não informado' : money(presentedCents)}; ${outcome}.`;
    const updated = { ...item, claim, history: [...(item.history ?? []), { id: uid(), date: now, actor: 'Você', description }] };
    const next = { ...appointment, completion: { ...appointment.completion, items: appointment.completion.items.map(value => value.id === itemId ? updated : value) } };
    const change = { data: { ...current, appointments: current.appointments.map(value => value.id === appointmentId ? next : value) }, action: 'Conferência de convênio registrada', record: `${current.patients.find(value => value.id === appointment.patientId)?.name ?? 'Paciente'} · ${item.procedure}`, recordPath: `/relatorios/mensal?mes=${appointment.date.slice(0, 7)}&item=${itemId}` };
    return { ...change, value: updated };
}
// O mês pode considerar a data da execução ou a data do retorno do convênio; são competências diferentes.
export function monthlyItems(data, { month, basis = 'execucao', clinicId = '', doctorId = '', attendance = '', insurance = '', status = '' }) {
    return performedItems(data.appointments).filter(item => {
        const reference = basis === 'retorno' ? item.claim?.returnOn ?? '' : item.appointment.date;
        const form = attendanceOf(item);
        return reference.slice(0, 7) === month && matchesClinic(item.appointment, clinicId) && (!doctorId || item.appointment.doctorId === doctorId)
            && (!attendance || (attendance === 'nenhuma' ? !form : form === attendance))
            && (!insurance || item.appointment.completion.insurance === insurance) && (!status || claimStatus(item) === status);
    }).sort((a, b) => `${a.appointment.date}${a.appointment.time}`.localeCompare(`${b.appointment.date}${b.appointment.time}`) || a.id.localeCompare(b.id));
}
export function monthlyTotals(items) {
    const plan = items.filter(item => attendanceOf(item) === 'Convênio');
    const known = plan.filter(item => Number.isSafeInteger(item.claim?.presentedCents));
    const waiting = known.filter(item => item.claim.result === 'Aguardando');
    const returned = known.filter(item => item.claim.result !== 'Aguardando');
    const glosa = returned.filter(item => item.claim.glosaCents > 0);
    const sum = (values, key) => values.reduce((total, item) => total + item.claim[key], 0);
    return {
        items: items.length, units: items.reduce((total, item) => total + item.quantity, 0),
        particular: items.filter(item => attendanceOf(item) === 'Particular').length, plan: plan.length, uninformed: items.filter(item => !attendanceOf(item)).length,
        presentedCents: sum(known, 'presentedCents'), presentedCount: known.length, unknownCount: plan.length - known.length,
        waitingCents: sum(waiting, 'presentedCents'), waitingCount: waiting.length,
        glosaCents: sum(glosa, 'glosaCents'), glosaCount: glosa.length, glosaTotal: glosa.filter(item => item.claim.result === 'Glosa total').length, glosaPartial: glosa.filter(item => item.claim.result === 'Glosa parcial').length,
        keptCents: sum(returned, 'presentedCents') - sum(glosa, 'glosaCents'), keptCount: returned.length,
    };
}
// Exportação para conferência: valores desconhecidos saem vazios, nunca como zero.
export function monthlyCsv(rows) {
    const columns = [['Data da execução', 'date'], ['Horário', 'time'], ['Paciente', 'patient'], ['Procedimento', 'procedure'], ['Quantidade', 'quantity'], ['Dente', 'tooth'], ['Região', 'region'], ['Doutor', 'doctor'], ['Clínica', 'clinic'], ['Forma de atendimento', 'attendance'], ['Convênio', 'insurance'], ['Guia ou cobrança', 'guide'], ['Valor apresentado', 'presented'], ['Data do retorno', 'returnOn'], ['Resultado do retorno', 'result'], ['Valor glosado', 'glosa'], ['Motivo da glosa', 'reason'], ['Situação', 'status']];
    const cell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [columns.map(([label]) => cell(label)).join(';'), ...rows.map(row => columns.map(([, key]) => cell(row[key])).join(';'))].join('\r\n');
}
export function centsInput(cents) { return Number.isSafeInteger(cents) ? (cents / 100).toFixed(2).replace('.', ',') : ''; }
