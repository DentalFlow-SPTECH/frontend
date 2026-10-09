import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResource } from '../../../component/use_resource.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { dateLabel, money, readMoney, today } from '../../../demo/format.js';
import { clinicLabel, isDate, performedItems, withoutClinic } from '../../../demo/clinic.js';
import { useClinicData, useClinicRepository } from '../../../app/app_provider.jsx';
import { centsInput, claimStatus, claimStatuses, daySummary, finalizedFor, findReport, monthlyCsv, monthlyItems, monthlyTotals, reportAppointments, reportSlots, reportStatuses } from '../model/report_model.js';
const statusTones = { 'Não iniciado': 'outline', Rascunho: 'warning', Enviado: 'info', 'Em correção': 'error', Validado: 'success', 'A conferir': 'outline', Aguardando: 'info', 'Sem glosa': 'success', 'Glosa parcial': 'warning', 'Glosa total': 'error', Particular: 'neutral', 'Forma não informada': 'warning' };
export function statusTone(status) { return statusTones[status] ?? 'neutral'; }
function query(values) {
    const entries = Object.entries(values).filter(([, value]) => value);
    return entries.length ? `?${new URLSearchParams(entries)}` : '';
}
// As três telas de relatório compartilham doutor e clínica; cada uma acrescenta o seu período.
function reportTabs(current, { doctorId, clinicParam }) {
    const shared = { doutor: doctorId, clinica: clinicParam };
    return [['diario', 'Relatório diário'], ['conferencia', 'Conferência diária'], ['mensal', 'Relatório mensal e glosas']].map(([key, label]) => ({ key, label, current: key === current, to: `/relatorios/${key}${query(shared)}` }));
}
function describe(data, item) {
    const { appointment } = item;
    const completion = appointment.completion;
    return {
        id: item.id, appointmentId: appointment.id, date: appointment.date, time: appointment.time, procedure: item.procedure, quantity: item.quantity, tooth: item.tooth, region: item.region,
        place: [item.tooth && `Dente ${item.tooth}`, item.region].filter(Boolean).join(' · '),
        patient: data.patients.find(value => value.id === appointment.patientId)?.name ?? 'Paciente não disponível',
        doctor: data.doctors.find(value => value.id === appointment.doctorId)?.name ?? 'Doutor não disponível',
        clinic: appointment.clinicId || data.clinics.length ? clinicLabel(data.clinics, appointment.clinicId) : '', linked: Boolean(appointment.clinicId),
        attendance: completion.attendance, insurance: completion.insurance, note: [completion.pendingGuide && 'Guia pendente', completion.observation].filter(Boolean).join(' · '),
        claim: item.claim, status: claimStatus(item), history: item.history ?? [],
    };
}
export function useDailyReportViewModel() {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { saveDailyReport } = useClinicRepository('report');
    const [params, setParams] = useSearchParams();
    const resource = useResource('daily-report');
    const date = isDate(params.get('data') ?? '') ? params.get('data') : today();
    const doctorId = data.doctors.some(value => value.id === params.get('doutor')) ? params.get('doutor') : '';
    // Um relatório por clínica em que o doutor atendeu no dia; consultas sem clínica formam o seu próprio relatório.
    const clinicIds = [...new Set([...data.appointments.filter(value => value.date === date && value.doctorId === doctorId).map(value => value.clinicId || ''), ...data.dailyReports.filter(value => value.date === date && value.doctorId === doctorId).map(value => value.clinicId || '')])].sort((a, b) => Number(!a) - Number(!b) || clinicLabel(data.clinics, a).localeCompare(clinicLabel(data.clinics, b), 'pt-BR'));
    const requested = params.get('clinica') === withoutClinic ? '' : params.get('clinica');
    const clinicId = clinicIds.includes(requested) ? requested : clinicIds[0] ?? '';
    const key = { date, doctorId, clinicId };
    const report = doctorId ? findReport(data.dailyReports, key) : undefined;
    const status = report?.status ?? 'Não iniciado';
    const editable = status !== 'Enviado' && status !== 'Validado';
    const rows = performedItems(reportAppointments(data.appointments, report, key)).map(item => describe(data, item));
    const summary = daySummary(data.appointments, key);
    const late = editable ? 0 : finalizedFor(data.appointments, key).filter(value => !report.appointmentIds.includes(value.id)).length;
    const noteKey = `${date}|${doctorId}|${clinicId}`;
    const [draft, setDraft] = useState({ key: noteKey, note: null });
    const note = draft.key === noteKey && draft.note !== null ? draft.note : report?.note ?? '';
    const [saving, setSaving] = useState('');
    const [saveError, setSaveError] = useState('');
    const [success, setSuccess] = useState('');
    const dirty = editable && Boolean(doctorId) && note !== (report?.note ?? '');
    useUnsaved(dirty, Boolean(saving));
    function show(next) {
        const merged = { data: date, doutor: doctorId, clinica: clinicId || (clinicIds.includes('') && clinicIds.length > 1 ? withoutClinic : ''), ...next };
        setSaveError('');
        setSuccess('');
        setParams(Object.fromEntries(Object.entries(merged).filter(([, value]) => value)));
    }
    async function save(send) {
        if (submissionLock.current || saving || !doctorId)
            return;
        setSaveError('');
        setSuccess('');
        submissionLock.current = true;
        setSaving(send ? 'send' : 'draft');
        try {
            await saveDailyReport(key, note, send);
            setDraft({ key: noteKey, note: null });
            setSuccess(send ? 'Relatório enviado para conferência.' : 'Rascunho salvo.');
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. As observações foram mantidas. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving('');
        }
    }
    const clinicParam = clinicId || '';
    return {
        data, resource, date, doctorId, clinicId, doctor: data.doctors.find(value => value.id === doctorId), report, status, tone: statusTone(status), editable, rows, summary, late, note, saving, saveError, success, dirty,
        clinicTabs: clinicIds.map(id => ({ id, label: clinicLabel(data.clinics, id), current: id === clinicId, count: performedItems(finalizedFor(data.appointments, { date, doctorId, clinicId: id })).length })),
        showClinics: clinicIds.length > 1 || Boolean(clinicId), tabs: reportTabs('diario', { doctorId, clinicParam }), agendaPath: `/agenda${query({ date, view: 'week', doutor: doctorId, clinica: clinicParam })}`,
        changeDate: value => { if (isDate(value)) show({ data: value, clinica: '' }); }, changeDoctor: value => show({ doutor: value, clinica: '' }), changeClinic: id => show({ clinica: id || withoutClinic }),
        changeNote: value => { setDraft({ key: noteKey, note: value }); setSaveError(''); setSuccess(''); }, save,
    };
}
// Conferência pela dona: valida ou devolve relatórios enviados. Não bloqueia cobrança nem pagamento.
export function useReportReviewViewModel() {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { reviewDailyReport } = useClinicRepository('report');
    const [params, setParams] = useSearchParams();
    const resource = useResource('report-review');
    const date = isDate(params.get('data') ?? '') ? params.get('data') : '';
    const doctorId = data.doctors.some(value => value.id === params.get('doutor')) ? params.get('doutor') : '';
    const clinicId = params.get('clinica') === withoutClinic || data.clinics.some(value => value.id === params.get('clinica')) ? params.get('clinica') : '';
    const status = reportStatuses.includes(params.get('situacao')) ? params.get('situacao') : '';
    const all = reportSlots(data, { from: date || '0000-01-01', until: date || '9999-12-31', clinicId, doctorId });
    const slots = all.filter(slot => !status || slot.status === status);
    const filters = { data: date, clinica: clinicId, doutor: doctorId, situacao: status };
    const selected = slots.find(slot => slot.id === params.get('relatorio')) ?? slots[0];
    const reasonKey = selected?.id ?? '';
    const [draft, setDraft] = useState({ key: reasonKey, reason: '' });
    const reason = draft.key === reasonKey ? draft.reason : '';
    const [reasonError, setReasonError] = useState('');
    const [saving, setSaving] = useState('');
    const [saveError, setSaveError] = useState('');
    const [success, setSuccess] = useState('');
    useUnsaved(Boolean(reason), Boolean(saving));
    function filter(name, value) {
        setSaveError('');
        setSuccess('');
        setParams(Object.fromEntries(Object.entries({ ...filters, [name]: value }).filter(([, entry]) => entry)), { replace: true });
    }
    async function review(decision) {
        if (submissionLock.current || saving || !selected?.report)
            return;
        setSaveError('');
        setSuccess('');
        if (decision === 'devolver' && !reason.trim()) {
            setReasonError('Informe o motivo da correção para devolver o relatório.');
            return 'review_reason';
        }
        submissionLock.current = true;
        setSaving(decision);
        try {
            await reviewDailyReport(selected.report.id, decision, reason);
            setDraft({ key: reasonKey, reason: '' });
            setSuccess(decision === 'validar' ? 'Relatório validado.' : 'Relatório devolvido para correção.');
        }
        catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Não foi possível concluir a conferência. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving('');
        }
    }
    const name = slot => ({ doctor: data.doctors.find(value => value.id === slot.key.doctorId)?.name ?? 'Doutor não disponível', clinic: slot.key.clinicId || data.clinics.length ? clinicLabel(data.clinics, slot.key.clinicId) : '' });
    return {
        data, resource, date, doctorId, clinicId, status, statuses: reportStatuses, clinics: data.clinics, filtered: Boolean(date || doctorId || clinicId || status),
        rows: slots.map(slot => ({ id: slot.id, ...name(slot), date: slot.key.date, consultations: slot.appointments.length, items: slot.items, status: slot.status, tone: statusTone(slot.status), current: slot.id === selected?.id, to: `/relatorios/conferencia${query({ ...filters, pagina: params.get('pagina'), relatorio: slot.id })}` })),
        toReview: all.filter(slot => slot.status === 'Enviado').length,
        selected: selected && { ...name(selected), date: selected.key.date, status: selected.status, tone: statusTone(selected.status), report: selected.report, summary: daySummary(data.appointments, selected.key), rows: performedItems(selected.appointments).map(item => describe(data, item)), reviewable: selected.status === 'Enviado' },
        reason, reasonError, saving, saveError, success, tabs: reportTabs('conferencia', { doctorId, clinicParam: clinicId }),
        filter, clearFilters: () => setParams({}), changeReason: value => { setDraft({ key: reasonKey, reason: value }); setReasonError(''); }, review,
    };
}
const attendances = [['Particular', 'Particular'], ['Convênio', 'Convênio'], ['nenhuma', 'Não informada']];
export function useMonthlyReportViewModel() {
    const { data } = useClinicData();
    const [params, setParams] = useSearchParams();
    const resource = useResource('monthly-report');
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get('mes') ?? '') ? params.get('mes') : today().slice(0, 7);
    const basis = params.get('base') === 'retorno' ? 'retorno' : 'execucao';
    const doctorId = data.doctors.some(value => value.id === params.get('doutor')) ? params.get('doutor') : '';
    const clinicId = params.get('clinica') === withoutClinic || data.clinics.some(value => value.id === params.get('clinica')) ? params.get('clinica') : '';
    const attendance = attendances.some(([key]) => key === params.get('atendimento')) ? params.get('atendimento') : '';
    const status = claimStatuses.includes(params.get('situacao')) ? params.get('situacao') : '';
    // A lista de convênios vem do que foi informado nas finalizações do mês; não há cadastro próprio de operadoras.
    const insurances = [...new Set(monthlyItems(data, { month, basis, clinicId, doctorId }).map(item => item.appointment.completion.insurance).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const insurance = insurances.includes(params.get('convenio')) ? params.get('convenio') : '';
    const filters = { mes: month, base: basis === 'retorno' ? 'retorno' : '', clinica: clinicId, doutor: doctorId, atendimento: attendance, convenio: insurance, situacao: status };
    const items = monthlyItems(data, { month, basis, clinicId, doctorId, attendance, insurance, status });
    const rows = items.map(item => describe(data, item));
    const selectedItem = performedItems(data.appointments).find(item => item.id === params.get('item'));
    const listPath = `/relatorios/mensal${query({ ...filters, pagina: params.get('pagina') })}`;
    function filter(name, value) { setParams(Object.fromEntries(Object.entries({ ...filters, [name]: value }).filter(([, entry]) => entry)), { replace: true }); }
    const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
    return {
        data, resource, month, monthLabel, basis, doctorId, clinicId, attendance, attendances, insurance, insurances, status, statuses: claimStatuses, clinics: data.clinics, showClinic: data.clinics.length > 0,
        rows: rows.map(row => ({ ...row, tone: statusTone(row.status), to: `/relatorios/mensal${query({ ...filters, pagina: params.get('pagina'), item: row.id })}`, current: row.id === selectedItem?.id })),
        totals: monthlyTotals(items), selected: selectedItem && describe(data, selectedItem), listPath, tabs: reportTabs('mensal', { doctorId, clinicParam: clinicId }),
        filtered: Boolean(doctorId || clinicId || attendance || insurance || status || basis === 'retorno'),
        csv: () => monthlyCsv(rows.map(row => ({ ...row, date: dateLabel(row.date), attendance: row.attendance || 'Não informada', guide: row.claim?.guide ?? '', presented: centsInput(row.claim?.presentedCents), returnOn: row.claim?.returnOn ? dateLabel(row.claim.returnOn) : '', result: row.claim?.result ?? '', glosa: centsInput(row.claim?.glosaCents), reason: row.claim?.reason ?? '' }))),
        fileName: `relatorio-mensal-${month}.csv`, filter, clearFilters: () => setParams({ mes: month }),
    };
}
// Conferência de um item de convênio: guia, valor apresentado, retorno e glosa. O valor mantido não é recebimento.
export function useClaimFormViewModel({ item }) {
    const submissionLock = useRef(false);
    const { saveClaim } = useClinicRepository('report');
    const claim = item.claim;
    const [initial] = useState(() => ({ guide: claim?.guide ?? '', presented: centsInput(claim?.presentedCents), returnOn: claim?.returnOn ?? '', result: claim?.result ?? 'Aguardando', glosa: claim?.result === 'Glosa parcial' ? centsInput(claim.glosaCents) : '', reason: claim?.reason ?? '' }));
    const [fields, setFields] = useState(initial);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [success, setSuccess] = useState('');
    const [savedFields, setSavedFields] = useState(initial);
    const dirty = Object.keys(fields).some(key => fields[key] !== savedFields[key]);
    useUnsaved(dirty, saving);
    const presentedCents = fields.presented.trim() ? readMoney(fields.presented) : null;
    const glosaCents = fields.result === 'Sem glosa' ? 0 : fields.result === 'Glosa total' ? presentedCents : fields.result === 'Glosa parcial' && fields.glosa.trim() ? readMoney(fields.glosa) : null;
    const kept = fields.result !== 'Aguardando' && Number.isSafeInteger(presentedCents) && Number.isSafeInteger(glosaCents) && glosaCents <= presentedCents ? money(presentedCents - glosaCents) : '';
    function change(key, value) {
        setFields(previous => ({ ...previous, [key]: value }));
        setErrors(previous => ({ ...previous, [key]: undefined }));
        setSaveError('');
        setSuccess('');
    }
    async function submit() {
        if (submissionLock.current || saving)
            return;
        setSaveError('');
        setSuccess('');
        const waiting = fields.result === 'Aguardando';
        const nextErrors = {};
        if (fields.presented.trim() && (presentedCents === null || presentedCents <= 0))
            nextErrors.presented = 'Informe um valor maior que zero, com até duas casas decimais, ou deixe vazio.';
        else if (!waiting && presentedCents === null)
            nextErrors.presented = 'Informe o valor apresentado antes de registrar o retorno.';
        if (!waiting && !isDate(fields.returnOn))
            nextErrors.returnOn = 'Informe a data do retorno do convênio.';
        if (fields.result === 'Glosa parcial' && !nextErrors.presented && (glosaCents === null || glosaCents <= 0 || glosaCents >= presentedCents))
            nextErrors.glosa = 'O valor glosado deve ser maior que zero e menor que o valor apresentado.';
        setErrors(nextErrors);
        const first = ['presented', 'returnOn', 'glosa'].find(key => nextErrors[key]);
        if (first)
            return `claim_${first}`;
        submissionLock.current = true;
        setSaving(true);
        try {
            await saveClaim(item.appointmentId, item.id, { guide: fields.guide, presentedCents, returnOn: fields.returnOn, result: fields.result, glosaCents, reason: fields.reason });
            setSavedFields(fields);
            setSuccess('Conferência salva. O valor apresentado e o histórico foram preservados.');
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    const returnMonth = isDate(fields.returnOn) && fields.result !== 'Aguardando' ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${fields.returnOn}T12:00:00Z`)) : '';
    return { fields, errors, saving, saveError, success, dirty, kept, returnMonth, change, submit };
}
