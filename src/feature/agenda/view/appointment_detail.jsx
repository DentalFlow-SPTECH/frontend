import { CalendarSync, Clock, MessageCircle, Phone, RotateCcw, Sparkles, Stethoscope, StickyNote, UserRound, UserX, X } from 'lucide-react';
import { Alert, Avatar, Button, ButtonLink, ConfirmDialog, DefinitionList, ExternalButton, StepTrack } from '../../../component/ui/index.js';
import { ageOf, brl, dateLong, maskPhone, telLink, whatsappLink } from '../../../component/format.js';
import { appointmentStatus, statusOrder } from '../../../component/appointment_status.js';
import { actionLabel, canChange, nextStatus, reminderText } from '../model/agenda_model.js';
import styles from './agenda.module.css';

const steps = statusOrder.map(value => ({ value, label: appointmentStatus[value].label }));
const confirmCopy = {
    CANCELADO: { title: 'Cancelar esta consulta?', text: 'A consulta cancelada não pode ser reaberta. Para atender o paciente, será preciso agendar de novo.', button: 'Cancelar consulta' },
    FALTOU: { title: 'Marcar que o paciente faltou?', text: 'Depois de marcada, a falta não pode ser desfeita. Ela entra na taxa de faltas do painel.', button: 'Marcar falta' },
};

// Detalhe da consulta com as ações do dia a dia. Usado no painel lateral da agenda e na tela Hoje.
export function AppointmentDetail({ item, today, actions }) {
    const phone = item.patient?.phone;
    const age = ageOf(item.patient?.birthDate);
    const whatsapp = whatsappLink(phone, reminderText(item));
    const tel = telLink(phone);
    const next = nextStatus(item.status);
    const open = canChange(item.status);
    const confirm = actions.confirm ? confirmCopy[actions.confirm] : null;
    return <div className={styles.detail}>
        <div className={styles.detailTop}>
            <Avatar name={item.patientName} size="xl"/>
            <div>
                <h2>{item.patientName}</h2>
                <p>{[age !== null && `${age} anos`, phone && maskPhone(phone)].filter(Boolean).join(' · ') || 'Sem telefone cadastrado'}</p>
            </div>
        </div>
        <div className={styles.quick}>
            {whatsapp ? <ExternalButton href={whatsapp} variant="whatsapp" size="sm" icon={MessageCircle}>WhatsApp</ExternalButton> : <Button variant="secondary" size="sm" icon={MessageCircle} disabled>WhatsApp</Button>}
            {tel ? <a className={styles.quickLink} href={tel}><Phone aria-hidden="true"/>Ligar</a> : <Button variant="secondary" size="sm" icon={Phone} disabled>Ligar</Button>}
            <ButtonLink to={`/pacientes/${item.patientId}`} variant="secondary" size="sm" icon={UserRound}>Ficha</ButtonLink>
        </div>
        <DefinitionList items={[
            { icon: Clock, label: 'Horário', value: `${item.date === today ? 'Hoje' : dateLong(item.date)}, ${item.time} às ${item.endTime} · ${item.duration} min` },
            { icon: Sparkles, label: 'Procedimento', value: `${item.procedureName}${item.procedure?.price ? ` · ${brl(item.procedure.price)}` : ''}` },
            { icon: Stethoscope, label: 'Dentista', value: item.dentistName },
            { icon: StickyNote, label: 'Observação', value: item.notes },
        ]}/>
        {item.status === 'CANCELADO' || item.status === 'FALTOU'
            ? <Alert tone={item.status === 'CANCELADO' ? 'danger' : 'warning'} title={item.status === 'CANCELADO' ? 'Consulta cancelada' : 'Paciente faltou'}>Para atender de novo, agende uma nova consulta.</Alert>
            : <StepTrack steps={steps} current={item.status} caption={<>Situação: <b>{appointmentStatus[item.status].label}</b>{next ? <> · Próximo: <b>{actionLabel(item.status).toLowerCase()}</b></> : ''}</>}/>}
        {item.status === 'CONCLUIDO' && <Alert tone="success" title="Atendimento concluído"/>}
        <div className={styles.detailActions}>
            {open && next && <Button size="lg" block icon={next === 'CONFIRMADO' ? Clock : Stethoscope} busy={actions.busy === next} onClick={() => actions.advance(item)}>{actionLabel(item.status)}</Button>}
            {!open && <ButtonLink size="lg" block variant="soft" icon={RotateCcw} to={`/agenda/nova?paciente=${item.patientId}&dentista=${item.dentistId}`}>Agendar de novo</ButtonLink>}
            {open && <div className={styles.moreActions}>
                <ButtonLink variant="secondary" icon={CalendarSync} to={`/agenda/${item.id}/editar`}>Remarcar</ButtonLink>
                <Button variant="danger" icon={UserX} onClick={() => actions.askConfirm('FALTOU')}>Faltou</Button>
                <Button variant="danger" icon={X} onClick={() => actions.askConfirm('CANCELADO')}>Cancelar</Button>
            </div>}
        </div>
        <ConfirmDialog open={Boolean(confirm)} onOpenChange={value => { if (!value) actions.closeConfirm(); }} title={confirm?.title} description={confirm?.text}
            confirmLabel={confirm?.button} busy={Boolean(actions.busy)} onConfirm={() => actions.change(item, actions.confirm)}/>
    </div>;
}
